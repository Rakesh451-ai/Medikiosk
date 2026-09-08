from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    PatientProfile,
    DoctorProfile,
    OTPVerification,
    BlockedIdentifier,
    SecurityAuditLog,
)
from .permissions import IsAdminUserRole
from .auth_utils import (
    clean_digits,
    format_aadhaar,
    format_abha,
    record_security_incident,
    get_client_ip,
)

User = get_user_model()


def serialize_admin_user(user):
    profile = getattr(user, 'patient_profile', None)
    doc_profile = getattr(user, 'doctor_profile', None)

    name = user.get_full_name() or user.username
    phone = ''
    aadhaar = ''
    abha = ''

    if profile:
        name = profile.name or name
        phone = profile.phone or phone
        aadhaar = profile.mock_aadhaar_id or aadhaar
        abha = profile.mock_abha_id or abha
    elif doc_profile:
        name = f"Dr. {doc_profile.name}"
        phone = 'Hospital Intercom'

    return {
        "id": user.id,
        "username": user.username,
        "name": name,
        "email": user.email,
        "role": user.role,
        "phone": phone,
        "mock_aadhaar_id": aadhaar,
        "mock_abha_id": abha,
        "is_active": user.is_active,
        "is_flagged_spammer": getattr(user, 'is_flagged_spammer', False),
        "spam_score": getattr(user, 'spam_score', 0),
        "spam_notes": getattr(user, 'spam_notes', ''),
        "is_staff": user.is_staff,
        "date_joined": user.date_joined.strftime("%Y-%m-%d %H:%M") if user.date_joined else None,
        "last_login": user.last_login.strftime("%Y-%m-%d %H:%M") if user.last_login else "Never",
    }


class AdminLoginView(APIView):
    """
    Secure Administrator Authentication Gateway.
    Verifies staff / admin status and issues authenticated JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        client_ip = get_client_ip(request)

        if not username or not password:
            return Response({"error": "Admin username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()

        if not user or not user.check_password(password):
            record_security_incident(
                event_type=SecurityAuditLog.EventType.FAILED_LOGIN,
                identifier=username,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.MEDIUM,
                details="Failed administrator login: Invalid credentials."
            )
            return Response({"error": "Invalid administrator username or password."}, status=status.HTTP_401_UNAUTHORIZED)

        if not (user.role == User.Role.ADMIN or user.is_superuser):
            record_security_incident(
                event_type=SecurityAuditLog.EventType.SPAM_DETECTED,
                identifier=username,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.HIGH,
                details=f"Unauthorized non-admin role ({user.role}) attempted admin portal access."
            )
            return Response({"error": "Access Denied: Only system administrators can access this portal."}, status=status.HTTP_403_FORBIDDEN)

        if not user.is_active:
            return Response({"error": "Administrator account has been deactivated."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)

        record_security_incident(
            event_type=SecurityAuditLog.EventType.USER_UNBANNED,
            identifier=username,
            ip=client_ip,
            risk_level=SecurityAuditLog.RiskLevel.LOW,
            details=f"Admin '{username}' successfully authenticated to Admin Control Panel."
        )

        return Response({
            "message": "Admin authorization granted.",
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            "user": serialize_admin_user(user)
        }, status=status.HTTP_200_OK)


class AdminStatsView(APIView):
    """
    Overview statistics for the Admin Security and User Management Dashboard.
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        total_users = User.objects.count()
        patients_count = User.objects.filter(role=User.Role.PATIENT).count()
        doctors_count = User.objects.filter(role=User.Role.DOCTOR).count()
        admins_count = User.objects.filter(Q(role=User.Role.ADMIN) | Q(is_staff=True)).count()

        flagged_spammers_count = User.objects.filter(is_flagged_spammer=True).count()
        active_blocked_count = BlockedIdentifier.objects.filter(is_active=True).count()

        today_incidents = SecurityAuditLog.objects.filter(created_at__gte=today_start).count()
        today_otps = OTPVerification.objects.filter(created_at__gte=today_start).count()

        critical_alerts = SecurityAuditLog.objects.filter(
            risk_level__in=[SecurityAuditLog.RiskLevel.HIGH, SecurityAuditLog.RiskLevel.CRITICAL],
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).count()

        return Response({
            "total_users": total_users,
            "patients_count": patients_count,
            "doctors_count": doctors_count,
            "admins_count": admins_count,
            "flagged_spammers_count": flagged_spammers_count,
            "active_blocked_count": active_blocked_count,
            "today_incidents": today_incidents,
            "today_otps": today_otps,
            "critical_alerts_24h": critical_alerts,
            "system_health": "OPTIMAL",
            "fraud_engine_status": "ACTIVE_MONITORING"
        })


class AdminUsersListView(APIView):
    """
    List and filter users with search, role filter, and spam status filter.
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        search_query = request.query_params.get('q', '').strip()
        role_filter = request.query_params.get('role', '').strip().upper()
        status_filter = request.query_params.get('status', '').strip().lower()

        queryset = User.objects.all().select_related('patient_profile', 'doctor_profile').order_by('-date_joined')

        if search_query:
            digits = clean_digits(search_query)
            q_filter = (
                Q(username__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(patient_profile__name__icontains=search_query)
            )
            if digits:
                q_filter |= (
                    Q(patient_profile__phone__icontains=digits) |
                    Q(patient_profile__mock_aadhaar_id__icontains=digits) |
                    Q(patient_profile__mock_abha_id__icontains=digits)
                )
            queryset = queryset.filter(q_filter)

        if role_filter and role_filter != 'ALL':
            queryset = queryset.filter(role=role_filter)

        if status_filter == 'spammer':
            queryset = queryset.filter(is_flagged_spammer=True)
        elif status_filter == 'active':
            queryset = queryset.filter(is_active=True, is_flagged_spammer=False)
        elif status_filter == 'suspended' or status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)

        users_data = [serialize_admin_user(u) for u in queryset[:100]]

        return Response({
            "count": len(users_data),
            "users": users_data
        })


class AdminUserDetailActionView(APIView):
    """
    Handles user updates, toggling spammer status, deactivating/activating, and deletion.
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request, user_id):
        try:
            user = User.objects.select_related('patient_profile', 'doctor_profile').get(id=user_id)
            return Response(serialize_admin_user(user))
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, user_id):
        try:
            user = User.objects.select_related('patient_profile', 'doctor_profile').get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        client_ip = get_client_ip(request)

        if action == 'toggle_spammer':
            new_state = not user.is_flagged_spammer
            user.is_flagged_spammer = new_state
            if new_state:
                user.spam_score = max(user.spam_score, 85)
                user.spam_notes = request.data.get('notes') or 'Manually flagged as spammer by Administrator'
                record_security_incident(
                    event_type=SecurityAuditLog.EventType.USER_BANNED,
                    identifier=user.username,
                    ip=client_ip,
                    risk_level=SecurityAuditLog.RiskLevel.HIGH,
                    details=f"User {user.username} flagged as spammer. Reason: {user.spam_notes}"
                )
            else:
                user.spam_score = 0
                user.spam_notes = 'Cleared by Administrator'
                record_security_incident(
                    event_type=SecurityAuditLog.EventType.USER_UNBANNED,
                    identifier=user.username,
                    ip=client_ip,
                    risk_level=SecurityAuditLog.RiskLevel.LOW,
                    details=f"User {user.username} unflagged from spammer list"
                )
            user.save()
            return Response({"message": f"Spammer status updated to {new_state}", "user": serialize_admin_user(user)})

        elif action == 'toggle_active':
            new_active = not user.is_active
            user.is_active = new_active
            user.save(update_fields=['is_active'])
            record_security_incident(
                event_type=SecurityAuditLog.EventType.USER_BANNED if not new_active else SecurityAuditLog.EventType.USER_UNBANNED,
                identifier=user.username,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.MEDIUM,
                details=f"User account status changed to {'Active' if new_active else 'Suspended'}"
            )
            return Response({"message": f"User active status set to {new_active}", "user": serialize_admin_user(user)})

        elif action == 'edit_user':
            name = request.data.get('name', '').strip()
            email = request.data.get('email', '').strip()
            phone = request.data.get('phone', '').strip()
            role = request.data.get('role', '').strip()
            spam_notes = request.data.get('spam_notes', '').strip()

            if email:
                user.email = email
            if role and role in dict(User.Role.choices):
                user.role = role
            if spam_notes:
                user.spam_notes = spam_notes

            if name:
                parts = name.split()
                user.first_name = parts[0]
                user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''

            user.save()

            profile = getattr(user, 'patient_profile', None)
            if profile:
                if name:
                    profile.name = name
                if phone:
                    profile.phone = clean_digits(phone)
                profile.save()

            record_security_incident(
                event_type=SecurityAuditLog.EventType.ROLE_CHANGED,
                identifier=user.username,
                ip=client_ip,
                risk_level=SecurityAuditLog.RiskLevel.LOW,
                details=f"Profile updated by administrator: Role={user.role}, Name={name}"
            )
            return Response({"message": "User updated successfully.", "user": serialize_admin_user(user)})

        elif action == 'reset_security':
            user.spam_score = 0
            user.is_flagged_spammer = False
            user.is_active = True
            user.spam_notes = 'Security score reset by Admin'
            user.save()
            OTPVerification.objects.filter(identifier__icontains=user.username).delete()
            return Response({"message": "Security score and OTP limits reset successfully.", "user": serialize_admin_user(user)})

        return Response({"error": f"Unknown action: {action}"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            if user.is_staff and User.objects.filter(is_staff=True).count() <= 1:
                return Response({"error": "Cannot delete the sole administrator account."}, status=status.HTTP_400_BAD_REQUEST)

            username = user.username
            user.delete()

            record_security_incident(
                event_type=SecurityAuditLog.EventType.ACCOUNT_DELETED,
                identifier=username,
                ip=get_client_ip(request),
                risk_level=SecurityAuditLog.RiskLevel.HIGH,
                details=f"User account {username} was permanently deleted by admin."
            )
            return Response({"message": f"User {username} deleted successfully."})
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminBlockedIdentifiersView(APIView):
    """
    Manage the blacklist / blocked identifiers (IPs, Phone numbers, Aadhaar IDs, Emails).
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        active_only = request.query_params.get('active_only', 'false').lower() == 'true'
        queryset = BlockedIdentifier.objects.all().order_by('-created_at')
        if active_only:
            queryset = queryset.filter(is_active=True)

        results = [
            {
                "id": item.id,
                "identifier": item.identifier,
                "identifier_type": item.identifier_type,
                "reason": item.reason,
                "is_active": item.is_active,
                "created_at": item.created_at.strftime("%Y-%m-%d %H:%M"),
                "blocked_by": item.blocked_by.username if item.blocked_by else "Admin Security Engine"
            }
            for item in queryset[:100]
        ]
        return Response({"count": len(results), "blocked_identifiers": results})

    def post(self, request):
        identifier = request.data.get('identifier', '').strip()
        id_type = request.data.get('identifier_type', 'IP').upper()
        reason = request.data.get('reason', 'Suspicious activity / Policy violation').strip()
        client_ip = get_client_ip(request)

        if not identifier:
            return Response({"error": "Identifier is required."}, status=status.HTTP_400_BAD_REQUEST)

        blocked_obj, created = BlockedIdentifier.objects.get_or_create(
            identifier=identifier,
            defaults={
                "identifier_type": id_type,
                "reason": reason,
                "is_active": True
            }
        )
        if not created:
            blocked_obj.is_active = True
            blocked_obj.reason = reason
            blocked_obj.identifier_type = id_type
            blocked_obj.save()

        # If it matches a registered user, also flag and deactivate user
        user = User.objects.filter(
            Q(username__iexact=identifier) |
            Q(email__iexact=identifier) |
            Q(patient_profile__phone__icontains=clean_digits(identifier) if len(clean_digits(identifier)) >= 10 else identifier) |
            Q(patient_profile__mock_aadhaar_id__icontains=clean_digits(identifier) if len(clean_digits(identifier)) == 12 else identifier)
        ).first()

        if user:
            user.is_flagged_spammer = True
            user.spam_score = 100
            user.is_active = False
            user.spam_notes = f"Blacklisted: {reason}"
            user.save(update_fields=['is_flagged_spammer', 'spam_score', 'is_active', 'spam_notes'])

        record_security_incident(
            event_type=SecurityAuditLog.EventType.IDENTIFIER_BLOCKED,
            identifier=identifier,
            ip=client_ip,
            risk_level=SecurityAuditLog.RiskLevel.CRITICAL,
            details=f"Blocked {id_type}: {identifier}. Reason: {reason}"
        )

        return Response({
            "message": f"Successfully blocked {id_type} '{identifier}'.",
            "blocked_identifier": {
                "id": blocked_obj.id,
                "identifier": blocked_obj.identifier,
                "identifier_type": blocked_obj.identifier_type,
                "reason": blocked_obj.reason,
                "is_active": blocked_obj.is_active,
                "created_at": blocked_obj.created_at.strftime("%Y-%m-%d %H:%M")
            }
        }, status=status.HTTP_201_CREATED)


class AdminUnblockIdentifierView(APIView):
    """
    Unblock a blacklisted identifier.
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        block_id = request.data.get('id')
        identifier = request.data.get('identifier', '').strip()
        client_ip = get_client_ip(request)

        blocked_obj = None
        if block_id:
            blocked_obj = BlockedIdentifier.objects.filter(id=block_id).first()
        elif identifier:
            blocked_obj = BlockedIdentifier.objects.filter(identifier__iexact=identifier, is_active=True).first()

        if not blocked_obj:
            return Response({"error": "Blocked entry not found."}, status=status.HTTP_404_NOT_FOUND)

        blocked_obj.is_active = False
        blocked_obj.save(update_fields=['is_active'])

        record_security_incident(
            event_type=SecurityAuditLog.EventType.IDENTIFIER_UNBLOCKED,
            identifier=blocked_obj.identifier,
            ip=client_ip,
            risk_level=SecurityAuditLog.RiskLevel.LOW,
            details=f"Identifier {blocked_obj.identifier} ({blocked_obj.identifier_type}) unblocked by Admin"
        )

        return Response({
            "message": f"Successfully unblocked {blocked_obj.identifier_type} '{blocked_obj.identifier}'."
        })


class AdminSecurityLogsView(APIView):
    """
    Audit and security logs feed for fraud, spam, and incident tracking.
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        risk_filter = request.query_params.get('risk', '').strip().upper()
        event_filter = request.query_params.get('event', '').strip()

        queryset = SecurityAuditLog.objects.all().order_by('-created_at')

        if risk_filter and risk_filter != 'ALL':
            queryset = queryset.filter(risk_level=risk_filter)

        if event_filter and event_filter != 'ALL':
            queryset = queryset.filter(event_type=event_filter)

        logs_data = [
            {
                "id": log.id,
                "event_type": log.event_type,
                "event_display": log.get_event_type_display(),
                "identifier": log.identifier,
                "ip_address": log.ip_address,
                "risk_level": log.risk_level,
                "details": log.details,
                "created_at": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for log in queryset[:150]
        ]

        return Response({
            "count": len(logs_data),
            "logs": logs_data
        })


class AdminSimulateIncidentView(APIView):
    """
    Simulates a security/spam incident for testing the fraud detection response.
    Requires ADMIN / Staff role.
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        incident_type = request.data.get('type', 'otp_flood')
        client_ip = get_client_ip(request)

        if incident_type == 'otp_flood':
            fake_phone = f"99{timezone.now().microsecond % 90000000 + 10000000}"
            log = record_security_incident(
                event_type=SecurityAuditLog.EventType.OTP_FLOOD,
                identifier=fake_phone,
                ip="198.51.100.88",
                risk_level=SecurityAuditLog.RiskLevel.HIGH,
                details="Automated threat alert: 12 OTP requests dispatched in 45s from suspicious proxy."
            )
            return Response({
                "message": "Simulated OTP Flood incident recorded.",
                "incident": {"id": log.id, "identifier": fake_phone, "risk": "HIGH"}
            })

        elif incident_type == 'aadhaar_fraud':
            fake_aadhaar = "9999 0000 1111"
            log = record_security_incident(
                event_type=SecurityAuditLog.EventType.SPAM_DETECTED,
                identifier=fake_aadhaar,
                ip="203.0.113.45",
                risk_level=SecurityAuditLog.RiskLevel.CRITICAL,
                details="Suspicious UIDAI verification mismatch: Multiple conflicting names used with same Aadhaar hash."
            )
            return Response({
                "message": "Simulated Aadhaar Fraud incident recorded.",
                "incident": {"id": log.id, "identifier": fake_aadhaar, "risk": "CRITICAL"}
            })

        return Response({"error": "Unknown incident type"}, status=status.HTTP_400_BAD_REQUEST)
