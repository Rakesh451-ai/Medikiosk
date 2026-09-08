from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from django.db import models
from django.utils import timezone
from .models import (
    User, PatientProfile, DoctorProfile, TriageStaffProfile,
    OTPVerification, SecurityAuditLog, PatientMedication,
    MedicationLog, VitalReading, ChatMessage, Conversation
)
from documents.models import MedicalDocument, ExtractedRecord
from .serializers import (
    UserSerializer,
    RegisterPatientSerializer,
    CustomTokenObtainPairSerializer,
    PatientProfileSerializer,
    DoctorProfileSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    UnifiedLoginSerializer,
    PatientMedicationSerializer,
    MedicationLogSerializer,
    VitalReadingSerializer,
    ChatMessageSerializer,
    ConversationSerializer,
)
from api.services.patient_context import PatientContextBuilder
from api.services.safety_service import SafetyService
from api.services.ai_service import AIService

from .auth_utils import (
    clean_digits,
    detect_identifier_type,
    find_user_by_identifier,
    get_or_create_patient_by_identifier,
    generate_and_save_otp,
    verify_otp_code,
    format_aadhaar,
    format_abha,
    check_identifier_blocked,
    check_otp_rate_limit,
    record_security_incident,
    get_client_ip,
)
from .permissions import IsClinicalStaff, IsDoctor, IsPatient, IsPatientOwnerOrClinicalStaff


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint returning JWT tokens enriched with user role and profile details.
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegisterPatientView(APIView):
    """
    Register a patient and return their JWT tokens and profile immediately.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterPatientSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data

            return Response({
                "message": "Patient registered successfully.",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "user": user_data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """
    Retrieve or update currently authenticated user and nested role profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logout endpoint: Accepts refresh token to blacklist (if enabled) and confirms sign-out.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Even if blacklisting is disabled or token invalid, log out gracefully
                pass
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsClinicalStaff])
def clinical_patients_list(request):
    """
    Clinical data endpoint: Only DOCTOR or TRIAGE_STAFF can access.
    """
    patients = PatientProfile.objects.all().order_by('-created_at')[:50]
    serializer = PatientProfileSerializer(patients, many=True)
    return Response({
        "count": patients.count(),
        "patients": serializer.data
    })


class SendOTPView(APIView):
    """
    Dispatches a 6-digit OTP to the user's Aadhaar/ABHA/Mobile/Email.
    Provides instant demo OTP (123456) for rapid zero-friction testing.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_identifier = serializer.validated_data['identifier'].strip()
        client_ip = get_client_ip(request)

        # 1. Anti-Spam & Fraud Check
        is_blocked, block_reason = check_identifier_blocked(raw_identifier, client_ip)
        if is_blocked:
            record_security_incident(
                event_type=SecurityAuditLog.EventType.SPAM_DETECTED,
                identifier=raw_identifier,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.HIGH,
                details=f"Blocked attempt to request OTP: {block_reason}"
            )
            return Response({
                "error": f"Access Denied: {block_reason}"
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Rate-Limiting Protection
        is_flooding, flood_msg = check_otp_rate_limit(raw_identifier, client_ip)
        if is_flooding:
            return Response({
                "error": flood_msg
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        user, profile, detected_type = find_user_by_identifier(raw_identifier)

        otp_code = generate_and_save_otp(raw_identifier, detected_type)

        # Build clean user-facing masked target
        if detected_type == 'aadhaar':
            phone_suffix = profile.phone[-4:] if (profile and len(profile.phone) >= 4) else '6780'
            masked_target = f"UIDAI Registered Mobile (Ending in ******{phone_suffix})"
        elif detected_type == 'abha':
            phone_suffix = profile.phone[-4:] if (profile and len(profile.phone) >= 4) else '6780'
            masked_target = f"ABDM Registered Mobile (Ending in ******{phone_suffix})"
        elif detected_type == 'mobile':
            digits = clean_digits(raw_identifier)
            masked_target = f"Mobile (******{digits[-4:] if len(digits) >= 4 else '0000'})"
        elif detected_type == 'email':
            parts = raw_identifier.split('@')
            masked_target = f"Email ({parts[0][:2]}***@{parts[1]})"
        else:
            masked_target = f"Registered Contact for {raw_identifier}"

        return Response({
            "status": "success",
            "message": f"OTP successfully sent to {masked_target}.",
            "identifier": raw_identifier,
            "identifier_type": detected_type,
            "masked_target": masked_target,
            "user_exists": bool(user),
            "user_name": profile.name if profile else (user.get_full_name() if user else None),
            "demo_otp": otp_code,
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """
    Verifies OTP for Aadhaar, ABHA, Mobile, or Email and returns JWT tokens.
    Automatically initializes a new patient profile if first-time sign-in.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        identifier = serializer.validated_data['identifier'].strip()
        otp = serializer.validated_data['otp'].strip()
        name = serializer.validated_data.get('name', '').strip()
        age = serializer.validated_data.get('age')
        lang = serializer.validated_data.get('preferred_language', 'en')
        client_ip = get_client_ip(request)

        # Anti-Spam & Fraud Check
        is_blocked, block_reason = check_identifier_blocked(identifier, client_ip)
        if is_blocked:
            record_security_incident(
                event_type=SecurityAuditLog.EventType.SPAM_DETECTED,
                identifier=identifier,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.HIGH,
                details=f"Blocked attempt to verify OTP: {block_reason}"
            )
            return Response({
                "error": f"Access Denied: {block_reason}"
            }, status=status.HTTP_403_FORBIDDEN)

        if not verify_otp_code(identifier, otp):
            record_security_incident(
                event_type=SecurityAuditLog.EventType.FAILED_LOGIN,
                identifier=identifier,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.MEDIUM,
                details=f"Failed OTP verification code attempt: '{otp}'"
            )
            return Response({
                "error": "Invalid or expired OTP. Please use demo code 123456 or request a new OTP."
            }, status=status.HTTP_400_BAD_REQUEST)

        user, profile, id_type, created = get_or_create_patient_by_identifier(
            identifier=identifier,
            name=name,
            age=age,
            preferred_language=lang
        )

        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data

        return Response({
            "message": "Authentication successful.",
            "created": created,
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            "user": user_data
        }, status=status.HTTP_200_OK)


class UnifiedLoginView(APIView):
    """
    Unified multi-identifier login accepting either OTP or Password/PIN.
    Handles Aadhaar (12-digit), ABHA (14-digit), Mobile (10-digit), and Email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UnifiedLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        identifier = serializer.validated_data['identifier'].strip()
        mode = serializer.validated_data['auth_mode']
        password = serializer.validated_data.get('password', '').strip()
        otp = serializer.validated_data.get('otp', '').strip()
        name = serializer.validated_data.get('name', '').strip()
        age = serializer.validated_data.get('age')
        lang = serializer.validated_data.get('preferred_language', 'en')
        client_ip = get_client_ip(request)

        # Anti-Spam & Fraud Check
        is_blocked, block_reason = check_identifier_blocked(identifier, client_ip)
        if is_blocked:
            record_security_incident(
                event_type=SecurityAuditLog.EventType.SPAM_DETECTED,
                identifier=identifier,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.HIGH,
                details=f"Blocked attempt to login: {block_reason}"
            )
            return Response({
                "error": f"Access Denied: {block_reason}"
            }, status=status.HTTP_403_FORBIDDEN)

        if mode == 'otp':
            if not verify_otp_code(identifier, otp):
                record_security_incident(
                    event_type=SecurityAuditLog.EventType.FAILED_LOGIN,
                    identifier=identifier,
                    ip=client_ip,
                    risk_level=SecurityAuditLog.RiskLevel.MEDIUM,
                    details=f"Failed OTP code attempt: '{otp}'"
                )
                return Response({
                    "error": "Invalid or expired OTP. Use demo OTP 123456."
                }, status=status.HTTP_400_BAD_REQUEST)

            user, profile, id_type, created = get_or_create_patient_by_identifier(
                identifier=identifier,
                name=name,
                age=age,
                preferred_language=lang
            )
        else:
            user, profile, id_type = find_user_by_identifier(identifier)
            if not user:
                return Response({
                    "error": "No account found matching this identifier. Try OTP login to sign in or register instantly."
                }, status=status.HTTP_404_NOT_FOUND)

            from django.conf import settings
            password_valid = user.check_password(password) or (getattr(settings, 'DEMO_MODE', False) and password == 'PatientPass123!')
            if not password_valid:
                record_security_incident(
                    event_type=SecurityAuditLog.EventType.FAILED_LOGIN,
                    identifier=identifier,
                    ip=client_ip,
                    risk_level=SecurityAuditLog.RiskLevel.MEDIUM,
                    details="Invalid password entered."
                )
                err_msg = "Invalid password."
                if getattr(settings, 'DEMO_MODE', False):
                    err_msg += " (Demo mode active: PatientPass123!)"
                return Response({
                    "error": err_msg
                }, status=status.HTTP_401_UNAUTHORIZED)

            if profile and age is not None and age > 0:
                profile.age = age
                profile.save(update_fields=['age'])

        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data

        return Response({
            "message": "Login successful.",
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            "user": user_data
        }, status=status.HTTP_200_OK)


class PatientLookupView(APIView):
    """
    Real-time interactive lookup for Aadhaar, ABHA, Phone, or Email.
    Provides instant validation badges before submission.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        identifier = request.query_params.get('identifier', '').strip()
        if not identifier:
            return Response({"error": "Identifier query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        user, profile, detected_type = find_user_by_identifier(identifier)
        if user:
            return Response({
                "exists": True,
                "identifier_type": detected_type,
                "username": user.username,
                "name": profile.name if profile else user.get_full_name() or user.username,
                "age": profile.age if profile else None,
                "gender": profile.gender if profile else None,
                "role": user.role,
                "phone_masked": (f"******{profile.phone[-4:]}") if (profile and len(profile.phone) >= 4) else None,
                "abha_id": profile.mock_abha_id if profile else None,
                "aadhaar_id": profile.mock_aadhaar_id if profile else None,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "exists": False,
                "identifier_type": detected_type,
                "message": "Identifier available. You will be registered immediately upon OTP verification."
            }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def patient_detail_api(request):
    """
    Returns patient profile and vitals dynamically for the authenticated patient.
    Enforces object-level authorization: Patient A cannot query or edit Patient B.
    """
    requested_id = request.query_params.get('patient_id') or (request.data.get('patient_id') if request.method == 'POST' else None)

    target_user = request.user
    if requested_id and requested_id.strip():
        req_id = requested_id.strip()
        if request.user.is_patient:
            profile = getattr(request.user, 'patient_profile', None)
            allowed_ids = {request.user.username}
            if profile:
                if profile.mock_abha_id:
                    allowed_ids.add(profile.mock_abha_id)
                if profile.mock_aadhaar_id:
                    allowed_ids.add(profile.mock_aadhaar_id)
                if profile.phone:
                    allowed_ids.add(profile.phone)
            if req_id not in allowed_ids:
                return Response(
                    {"error": "Forbidden: You cannot access another patient's health records."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.is_clinical_staff:
            found_user, _, _ = find_user_by_identifier(req_id)
            if found_user:
                target_user = found_user

    profile = getattr(target_user, 'patient_profile', None)

    if request.method == 'POST':
        if request.user.is_patient and target_user != request.user:
            return Response(
                {"error": "Forbidden: You cannot modify another patient's profile."},
                status=status.HTTP_403_FORBIDDEN
            )
        data = request.data
        if not profile:
            profile = PatientProfile.objects.create(
                user=target_user,
                name=target_user.get_full_name() or target_user.username,
                phone=target_user.username if target_user.username.isdigit() else '9876543210'
            )

        updated_fields = []
        if 'name' in data and data['name']:
            profile.name = data['name'].strip()
            updated_fields.append('name')
        if 'age' in data and data['age'] is not None:
            try:
                val = int(data['age'])
                if 0 < val <= 125:
                    profile.age = val
                    updated_fields.append('age')
            except (ValueError, TypeError):
                pass
        if 'blood_group' in data and data['blood_group']:
            profile.blood_group = data['blood_group'].strip()
            updated_fields.append('blood_group')
        if 'allergies' in data and isinstance(data['allergies'], list):
            profile.allergies = data['allergies']
            updated_fields.append('allergies')

        if any(k in data for k in ['heart_rate', 'bp_systolic', 'bp_diastolic', 'spo2', 'temperature', 'blood_pressure', 'glucose']):
            vitals_dict = {
                **(profile.latest_vitals or {}),
                "heart_rate": data.get('heart_rate', profile.latest_vitals.get('heart_rate') if profile.latest_vitals else None),
                "bp_systolic": data.get('bp_systolic', profile.latest_vitals.get('bp_systolic') if profile.latest_vitals else None),
                "bp_diastolic": data.get('bp_diastolic', profile.latest_vitals.get('bp_diastolic') if profile.latest_vitals else None),
                "temperature": data.get('temperature', profile.latest_vitals.get('temperature') if profile.latest_vitals else None),
                "spo2": data.get('spo2', profile.latest_vitals.get('spo2') if profile.latest_vitals else None),
                "glucose": data.get('glucose', profile.latest_vitals.get('glucose') if profile.latest_vitals else None),
                "status": "Normal"
            }
            if data.get('bp_systolic') and data.get('bp_diastolic'):
                vitals_dict["blood_pressure"] = f"{data['bp_systolic']}/{data['bp_diastolic']}"
            profile.latest_vitals = vitals_dict
            updated_fields.append('latest_vitals')

            # Also log to VitalReading
            VitalReading.objects.create(
                patient=target_user,
                heart_rate=vitals_dict.get('heart_rate'),
                bp_systolic=vitals_dict.get('bp_systolic'),
                bp_diastolic=vitals_dict.get('bp_diastolic'),
                spo2=vitals_dict.get('spo2'),
                temperature=vitals_dict.get('temperature'),
                glucose=vitals_dict.get('glucose')
            )

        if updated_fields:
            profile.save(update_fields=updated_fields)

        return Response({
            "status": "success",
            "profile": PatientProfileSerializer(profile).data
        }, status=status.HTTP_200_OK)

    # GET response
    docs_qs = MedicalDocument.objects.filter(patient=target_user)
    has_docs = docs_qs.exists() or (profile.has_scanned_documents if profile else False)

    if profile:
        serialized = {
            "patient_id": profile.mock_abha_id or profile.mock_aadhaar_id or profile.phone or target_user.username,
            "name": profile.name or target_user.get_full_name() or target_user.username,
            "gender": profile.gender if profile.gender and profile.gender != 'OTHER' else '',
            "age": profile.age,
            "phone": profile.phone,
            "mock_abha_id": profile.mock_abha_id or '',
            "mock_aadhaar_id": profile.mock_aadhaar_id or '',
            "blood_group": profile.blood_group or '',
            "allergies": profile.allergies or [],
            "chronic_conditions": profile.chronic_conditions or [],
            "primary_doctor": profile.primary_doctor or '',
            "hospital_name": profile.hospital_name or '',
            "emergency_contact": profile.emergency_contact or (f"+91 {profile.phone}" if profile.phone else ''),
            "has_scanned_documents": has_docs,
            "latest_vitals": profile.latest_vitals or {}
        }
    else:
        serialized = {
            "patient_id": target_user.username,
            "name": target_user.get_full_name() or target_user.username,
            "gender": '',
            "age": None,
            "phone": '',
            "mock_abha_id": '',
            "mock_aadhaar_id": '',
            "blood_group": '',
            "allergies": [],
            "chronic_conditions": [],
            "primary_doctor": '',
            "hospital_name": '',
            "emergency_contact": '',
            "has_scanned_documents": has_docs,
            "latest_vitals": {}
        }

    return Response(serialized, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def medications_list_api(request):
    """
    Returns active medications list for authenticated patient.
    Enforces object-level authorization: Patient A cannot see Patient B's medications.
    """
    patient_id = request.query_params.get('patient_id', '').strip()
    target_user = request.user

    if patient_id:
        if request.user.is_patient:
            profile = getattr(request.user, 'patient_profile', None)
            allowed = {request.user.username}
            if profile:
                allowed.update([profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone])
            if patient_id not in allowed:
                return Response(
                    {"error": "Forbidden: You cannot access another patient's medications."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.is_clinical_staff:
            found_user, _, _ = find_user_by_identifier(patient_id)
            if found_user:
                target_user = found_user

    meds_qs = target_user.medications.all()
    serializer = PatientMedicationSerializer(meds_qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def medication_taken_api(request, med_id):
    """
    Marks a medication as taken today and logs to MedicationLog.
    Enforces object-level authorization: Cannot modify another patient's medication.
    """
    med = PatientMedication.objects.filter(id=med_id).first()
    if not med:
        return Response({"error": "Medication not found."}, status=status.HTTP_404_NOT_FOUND)

    if med.patient != request.user and not request.user.is_clinical_staff:
        return Response(
            {"error": "Forbidden: You cannot modify another patient's medication."},
            status=status.HTTP_403_FORBIDDEN
        )

    med.last_taken_at = timezone.now()
    med.save(update_fields=['last_taken_at'])

    MedicationLog.objects.create(
        medication=med,
        patient=med.patient,
        notes="Marked taken via patient portal"
    )

    return Response({
        "status": "success",
        "message": f"'{med.name}' marked as taken today.",
        "medication": PatientMedicationSerializer(med).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def medication_toggle_api(request, med_id):
    """Toggles active/inactive or taken state of medication."""
    med = PatientMedication.objects.filter(id=med_id).first()
    if not med:
        return Response({"error": "Medication not found."}, status=status.HTTP_404_NOT_FOUND)

    if med.patient != request.user and not request.user.is_clinical_staff:
        return Response(
            {"error": "Forbidden: You cannot modify another patient's medication."},
            status=status.HTTP_403_FORBIDDEN
        )

    action = request.data.get('action')
    if action == 'deactivate':
        med.is_active = False
        med.save(update_fields=['is_active'])
    elif action == 'activate':
        med.is_active = True
        med.save(update_fields=['is_active'])
    else:
        med.last_taken_at = timezone.now()
        med.save(update_fields=['last_taken_at'])
        MedicationLog.objects.create(
            medication=med,
            patient=med.patient,
            notes="Toggled taken status via portal"
        )

    return Response({
        "status": "success",
        "message": "Medication status updated successfully.",
        "medication": PatientMedicationSerializer(med).data
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def vitals_api(request):
    """
    GET: Returns vitals history for trend visualizations.
    POST: Records a new vital reading in database and updates latest profile vitals.
    """
    patient_id = request.query_params.get('patient_id', '').strip()
    target_user = request.user

    if patient_id:
        if request.user.is_patient:
            profile = getattr(request.user, 'patient_profile', None)
            allowed = {request.user.username}
            if profile:
                allowed.update([profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone])
            if patient_id not in allowed:
                return Response(
                    {"error": "Forbidden: You cannot access another patient's vitals."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.is_clinical_staff:
            found_user, _, _ = find_user_by_identifier(patient_id)
            if found_user:
                target_user = found_user

    if request.method == 'POST':
        data = request.data
        reading = VitalReading.objects.create(
            patient=target_user,
            heart_rate=data.get('heart_rate'),
            bp_systolic=data.get('bp_systolic'),
            bp_diastolic=data.get('bp_diastolic'),
            spo2=data.get('spo2'),
            temperature=data.get('temperature'),
            glucose=data.get('glucose'),
            status=data.get('status', 'Normal'),
            notes=data.get('notes', 'Manual patient entry')
        )

        profile = getattr(target_user, 'patient_profile', None)
        if profile:
            profile.latest_vitals = {
                **(profile.latest_vitals or {}),
                "heart_rate": reading.heart_rate,
                "bp_systolic": reading.bp_systolic,
                "bp_diastolic": reading.bp_diastolic,
                "blood_pressure": f"{reading.bp_systolic}/{reading.bp_diastolic}" if (reading.bp_systolic and reading.bp_diastolic) else None,
                "spo2": reading.spo2,
                "temperature": reading.temperature,
                "glucose": reading.glucose,
                "status": reading.status
            }
            profile.save(update_fields=['latest_vitals'])

        return Response({
            "status": "success",
            "message": "Vital reading recorded successfully.",
            "reading": VitalReadingSerializer(reading).data,
            "latest_vitals": profile.latest_vitals if profile else {}
        }, status=status.HTTP_201_CREATED)

    readings = target_user.vital_readings.all()[:30]
    serializer = VitalReadingSerializer(readings, many=True)
    profile = getattr(target_user, 'patient_profile', None)
    return Response({
        "latest": profile.latest_vitals if profile else {},
        "history": serializer.data,
        "count": len(serializer.data)
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def agent_conversations_api(request):
    """
    Manages conversations for the authenticated patient.
    GET: Returns all conversations for the patient.
    POST: Creates a new conversation thread with initial greeting.
    """
    target_user = request.user
    patient_id = request.query_params.get('patient_id') or request.data.get('patient_id')
    if patient_id and str(patient_id).strip():
        req_id = str(patient_id).strip()
        if request.user.is_patient:
            profile = getattr(request.user, 'patient_profile', None)
            allowed = {request.user.username}
            if profile:
                allowed.update([profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone])
            if req_id not in allowed:
                return Response(
                    {"error": "Forbidden: You cannot access another patient's conversations."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.is_clinical_staff:
            found_user, _, _ = find_user_by_identifier(req_id)
            if found_user:
                target_user = found_user

    if request.method == 'GET':
        conversations = target_user.conversations.all()
        return Response(ConversationSerializer(conversations, many=True).data)

    # POST: Create new conversation
    title = request.data.get('title', '').strip() or 'New Health Consultation'
    conversation = Conversation.objects.create(patient=target_user, title=title)

    profile = getattr(target_user, 'patient_profile', None)
    patient_name = profile.name if profile else (target_user.get_full_name() or target_user.username)
    first_name = patient_name.split()[0] if patient_name else 'there'

    init_msg = ChatMessage.objects.create(
        conversation=conversation,
        patient=target_user,
        sender=ChatMessage.Sender.AGENT,
        text=(
            f"Hello {first_name}! I have started a new consultation session for you.\n\n"
            "Your health records, active medicines, and latest vitals are loaded. "
            "How can I help you today? You can tap any question below, or tap the microphone to speak."
        ),
        urgency='normal',
        quick_replies=[
            "💊 When should I take my medicines?",
            "🩺 Are my vitals normal today?",
            "⚠️ Are my medicines safe with my allergies?",
            "🏥 How do I see a doctor or nurse?"
        ]
    )

    return Response({
        "conversation": ConversationSerializer(conversation).data,
        "initial_message": ChatMessageSerializer(init_msg).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def agent_chat_api(request):
    """
    Handles AI health assistant interactions using authenticated patient's actual data.
    Enforces object-level authorization: Cannot access another patient's chat.
    """
    patient_id = request.query_params.get('patient_id') or request.data.get('patient_id') or ''
    target_user = request.user

    if patient_id and str(patient_id).strip():
        req_id = str(patient_id).strip()
        if request.user.is_patient:
            profile = getattr(request.user, 'patient_profile', None)
            allowed = {request.user.username}
            if profile:
                allowed.update([profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone])
            if req_id not in allowed:
                return Response(
                    {"error": "Forbidden: You cannot access another patient's assistant chat."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.is_clinical_staff:
            found_user, _, _ = find_user_by_identifier(req_id)
            if found_user:
                target_user = found_user

    # Resolve conversation
    conversation_id = request.query_params.get('conversation_id') or request.data.get('conversation_id')
    conversation = None
    if conversation_id:
        try:
            conversation = target_user.conversations.get(id=conversation_id)
        except (Conversation.DoesNotExist, ValueError):
            return Response(
                {"error": "Conversation not found or does not belong to this patient."},
                status=status.HTTP_404_NOT_FOUND
            )

    profile = getattr(target_user, 'patient_profile', None)
    patient_name = profile.name if profile else (target_user.get_full_name() or target_user.username)
    first_name = patient_name.split()[0] if patient_name else 'there'

    if request.method == 'GET':
        if conversation:
            saved_messages = conversation.messages.all()[:50]
        else:
            latest_conv = target_user.conversations.first()
            if latest_conv:
                conversation = latest_conv
                saved_messages = latest_conv.messages.all()[:50]
            else:
                saved_messages = target_user.chat_messages.all()[:50]

        if saved_messages.exists():
            return Response(ChatMessageSerializer(saved_messages, many=True).data)

        # Create first conversation and greeting if none exists
        if not conversation:
            conversation = Conversation.objects.create(patient=target_user, title='Health Consultation')

        init_msg = ChatMessage.objects.create(
            conversation=conversation,
            patient=target_user,
            sender=ChatMessage.Sender.AGENT,
            text=(
                f"Hello {first_name}! I am your MediKiosk Health Assistant. I have your health numbers and medicines ready.\n\n"
                "How can I help you today? You can tap any of the questions below, or tap the microphone to speak with me!\n\n"
                "⚠️ Medical Disclaimer: MediKiosk Health Assistant provides informational guidance only and does not diagnose disease or replace licensed clinician consultation."
            ),
            urgency='normal',
            quick_replies=[
                "💊 When should I take my medicines?",
                "🩺 Are my vitals normal today?",
                "⚠️ Are my medicines safe with my allergies?",
                "🏥 How do I see a doctor or nurse?"
            ]
        )
        return Response([ChatMessageSerializer(init_msg).data])

    # POST: Patient message processing
    text = request.data.get('text', '').strip()
    if not text:
        return Response({"error": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Ensure conversation exists
    if not conversation:
        conversation = target_user.conversations.first()
        if not conversation:
            conversation = Conversation.objects.create(
                patient=target_user,
                title=text[:45] if len(text) > 45 else text
            )

    # Save user message
    user_msg = ChatMessage.objects.create(
        conversation=conversation,
        patient=target_user,
        sender=ChatMessage.Sender.PATIENT,
        text=text,
        urgency='normal'
    )

    # 1. Build structured Patient EHR Context
    patient_context = PatientContextBuilder.build_context(target_user)
    context_str = PatientContextBuilder.format_system_prompt_context(patient_context)

    # 2. Run Deterministic Clinical Safety Guardrails
    safety_service = SafetyService()
    safety_assessment = safety_service.check_query_safety(
        text=text,
        patient_allergies=patient_context.get('allergies', []),
        active_medications=patient_context.get('medications', [])
    )

    # 3. Retrieve recent conversation history for prompt continuity
    recent_history = []
    prior_messages = conversation.messages.exclude(id=user_msg.id).order_by('-created_at')[:8]
    for m in reversed(list(prior_messages)):
        recent_history.append({
            "sender": m.sender,
            "text": m.text
        })

    # 4. Generate AI response (with model fallbacks and clinical grounding)
    ai_service = AIService()
    ai_result = ai_service.generate_response(
        user_query=text,
        patient_context_str=context_str,
        safety_assessment=safety_assessment,
        recent_messages=recent_history
    )

    # Update conversation title if default
    if conversation.title in ['New Health Consultation', 'Health Consultation'] and len(text) > 3:
        conversation.title = text[:50]
        conversation.save(update_fields=['title', 'updated_at'])
    else:
        conversation.save(update_fields=['updated_at'])

    # 5. Save Agent response
    agent_msg = ChatMessage.objects.create(
        conversation=conversation,
        patient=target_user,
        sender=ChatMessage.Sender.AGENT,
        text=ai_result.get('text', ''),
        urgency=ai_result.get('urgency', 'normal'),
        quick_replies=ai_result.get('quick_replies', []),
        is_emergency=ai_result.get('is_emergency', False)
    )

    return Response(ChatMessageSerializer(agent_msg).data, status=status.HTTP_200_OK)




