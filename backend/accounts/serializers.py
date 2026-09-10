import random
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, PatientProfile, DoctorProfile, TriageStaffProfile,
    PatientMedication, MedicationLog, VitalReading, ChatMessage, Conversation
)

class ConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'updated_at', 'message_count', 'last_message']
        read_only_fields = ['id', 'created_at', 'updated_at', 'message_count', 'last_message']

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return {
                'id': last.id,
                'sender': last.sender,
                'text': last.text[:80],
                'created_at': last.created_at.isoformat()
            }
        return None


class ChatMessageSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'conversation', 'sender', 'text', 'urgency', 'quick_replies', 'is_emergency', 'query_mode', 'created_at', 'time']
        read_only_fields = ['id', 'created_at', 'time']

    def get_time(self, obj):
        return obj.created_at.strftime('%I:%M %p') if obj.created_at else ''


class PatientMedicationSerializer(serializers.ModelSerializer):
    taken_today = serializers.SerializerMethodField()

    class Meta:
        model = PatientMedication
        fields = [
            'id', 'name', 'dosage', 'frequency', 'timing', 'duration',
            'instruction', 'is_active', 'last_taken_at', 'taken_today',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_taken_today(self, obj):
        if not obj.last_taken_at:
            return False
        from django.utils import timezone
        return obj.last_taken_at.date() == timezone.now().date()


class MedicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationLog
        fields = ['id', 'medication', 'taken_at', 'notes']
        read_only_fields = ['id', 'taken_at']


class VitalReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalReading
        fields = [
            'id', 'heart_rate', 'bp_systolic', 'bp_diastolic', 'spo2',
            'temperature', 'glucose', 'weight_kg', 'height_cm', 'status', 'notes', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']



class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = [
            'id',
            'name',
            'age',
            'gender',
            'phone',
            'preferred_language',
            'mock_abha_id',
            'mock_aadhaar_id',
            'blood_group',
            'allergies',
            'chronic_conditions',
            'primary_doctor',
            'hospital_name',
            'emergency_contact',
            'latest_vitals',
            'has_scanned_documents',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = [
            'id',
            'name',
            'department',
            'specialization',
            'room_number',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class TriageStaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageStaffProfile
        fields = [
            'id',
            'name',
            'station_id',
            'shift',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    patient_profile = PatientProfileSerializer(read_only=True)
    doctor_profile = DoctorProfileSerializer(read_only=True)
    triage_staff_profile = TriageStaffProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'role',
            'first_name',
            'last_name',
            'patient_profile',
            'doctor_profile',
            'triage_staff_profile',
            'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class RegisterPatientSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False)
    password = serializers.CharField(write_only=True, min_length=6, required=True, help_text="Patient password (minimum 6 characters)")
    name = serializers.CharField(max_length=150)
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, default='OTHER')
    phone = serializers.CharField(max_length=20)
    preferred_language = serializers.CharField(max_length=20, default='en')
    mock_abha_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    mock_aadhaar_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    blood_group = serializers.CharField(max_length=10, required=False, allow_blank=True)
    allergies = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate_phone(self, value):
        cleaned = ''.join(c for c in str(value) if c.isdigit())
        if len(cleaned) < 10:
            raise serializers.ValidationError("Please enter a valid 10-digit mobile number.")
        if PatientProfile.objects.filter(phone=cleaned).exists():
            raise serializers.ValidationError("A patient account with this mobile number is already registered. Please log in.")
        return cleaned

    def validate_username(self, value):
        if value:
            cleaned = str(value).strip()
            if User.objects.filter(username__iexact=cleaned).exists():
                raise serializers.ValidationError("An account with this username or phone already exists. Please log in.")
            return cleaned
        return value

    def validate_gender(self, value):
        if isinstance(value, str):
            val_upper = value.strip().upper()
            if val_upper in ['MALE', 'FEMALE', 'OTHER']:
                return val_upper
        return PatientProfile.Gender.OTHER

    def create(self, validated_data):
        phone = validated_data.get('phone')
        name = validated_data.get('name')
        age = validated_data.get('age')
        gender = validated_data.get('gender', PatientProfile.Gender.OTHER)
        lang = validated_data.get('preferred_language', 'en')
        mock_abha = validated_data.get('mock_abha_id')
        mock_aadhaar = validated_data.get('mock_aadhaar_id')
        blood_group = validated_data.get('blood_group', '')
        allergies = validated_data.get('allergies', [])
        password = validated_data.get('password')

        # Use phone as username if username not provided
        username = validated_data.get('username')
        if not username:
            username = phone

        # If mock_abha_id not provided or exists, generate unique 14-digit format: 14-XXXX-XXXX-XXXX
        if not mock_abha or PatientProfile.objects.filter(mock_abha_id=mock_abha).exists():
            while True:
                rand_12 = ''.join([str(random.randint(0, 9)) for _ in range(12)])
                candidate_abha = f"14-{rand_12[0:4]}-{rand_12[4:8]}-{rand_12[8:12]}"
                if not PatientProfile.objects.filter(mock_abha_id=candidate_abha).exists():
                    mock_abha = candidate_abha
                    break

        first_name = name.split()[0] if name else 'Patient'
        last_name = ' '.join(name.split()[1:]) if (name and len(name.split()) > 1) else ''

        # Ensure user does not already exist
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "An account with this phone or username already exists."})

        # Create persistent patient user with real password
        user = User.objects.create_user(
            username=username,
            password=password,
            email=f"{username}@medikiosk.in",
            first_name=first_name,
            last_name=last_name,
            role=User.Role.PATIENT
        )

        # Create Patient Profile with unique identifiers
        profile = PatientProfile.objects.create(
            user=user,
            name=name,
            age=age,
            gender=gender,
            phone=phone,
            preferred_language=lang,
            mock_abha_id=mock_abha,
            mock_aadhaar_id=mock_aadhaar or None,
            blood_group=blood_group,
            allergies=allergies or []
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enriches SimpleJWT login response with role and profile metadata.
    Supports login with Username, Aadhaar, ABHA ID, Mobile Phone, or Email!
    """
    def validate(self, attrs):
        from .auth_utils import find_user_by_identifier
        raw_identifier = attrs.get(self.username_field, '')
        resolved_user, _, _ = find_user_by_identifier(raw_identifier)
        if resolved_user:
            attrs[self.username_field] = resolved_user.username

        data = super().validate(attrs)
        user = self.user

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'name': user.get_full_name() or user.username,
        }

        if user.is_patient and hasattr(user, 'patient_profile'):
            profile = user.patient_profile
            data['user']['profile'] = {
                'name': profile.name,
                'age': profile.age,
                'gender': profile.gender,
                'phone': profile.phone,
                'preferred_language': profile.preferred_language,
                'mock_abha_id': profile.mock_abha_id,
                'mock_aadhaar_id': profile.mock_aadhaar_id,
            }
        elif user.is_doctor and hasattr(user, 'doctor_profile'):
            doc = user.doctor_profile
            data['user']['profile'] = {
                'name': doc.name,
                'department': doc.department,
                'specialization': doc.specialization,
                'room_number': doc.room_number,
            }
        elif user.is_triage_staff and hasattr(user, 'triage_staff_profile'):
            staff = user.triage_staff_profile
            data['user']['profile'] = {
                'name': staff.name,
                'station_id': staff.station_id,
                'shift': staff.shift,
            }

        return data


class SendOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        max_length=120,
        help_text="Aadhaar number (12 digits), ABHA ID (14 digits or @abdm), Mobile (10 digits), or Email"
    )
    identifier_type = serializers.CharField(max_length=20, required=False, default='auto')


class VerifyOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=120)
    otp = serializers.CharField(max_length=10)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    age = serializers.IntegerField(required=False, allow_null=True)
    preferred_language = serializers.CharField(max_length=20, required=False, default='en')


class UnifiedLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        max_length=120,
        help_text="Aadhaar (12 digits), ABHA (14 digits), Mobile, or Email"
    )
    auth_mode = serializers.ChoiceField(choices=['otp', 'password'], default='password')
    password = serializers.CharField(max_length=128, required=False, allow_blank=True)
    otp = serializers.CharField(max_length=10, required=False, allow_blank=True)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    age = serializers.IntegerField(required=False, allow_null=True)
    preferred_language = serializers.CharField(max_length=20, required=False, default='en')

