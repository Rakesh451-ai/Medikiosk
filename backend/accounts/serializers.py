import random
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, PatientProfile, DoctorProfile, TriageStaffProfile

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
    password = serializers.CharField(write_only=True, required=False, default='PatientPass123!')
    name = serializers.CharField(max_length=150)
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=PatientProfile.Gender.choices, default=PatientProfile.Gender.OTHER)
    phone = serializers.CharField(max_length=20)
    preferred_language = serializers.CharField(max_length=20, default='en')
    mock_abha_id = serializers.CharField(max_length=64, required=False, allow_blank=True)

    def validate_phone(self, value):
        cleaned = value.strip().replace(" ", "").replace("-", "")
        return cleaned

    def create(self, validated_data):
        phone = validated_data.get('phone')
        name = validated_data.get('name')
        age = validated_data.get('age')
        gender = validated_data.get('gender', PatientProfile.Gender.OTHER)
        lang = validated_data.get('preferred_language', 'en')
        mock_abha = validated_data.get('mock_abha_id')
        password = validated_data.get('password', 'PatientPass123!')

        # Generate username if not provided (e.g. pt_9123456780)
        username = validated_data.get('username')
        if not username:
            username = f"pt_{phone}_{random.randint(100, 999)}"

        # If mock_abha_id not provided, generate standard 14-digit format: e.g. 14-XXXX-XXXX-XXXX
        if not mock_abha:
            rand_12 = ''.join([str(random.randint(0, 9)) for _ in range(12)])
            mock_abha = f"14-{rand_12[0:4]}-{rand_12[4:8]}-{rand_12[8:12]}"

        # Create or update user
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'role': User.Role.PATIENT,
                'first_name': name.split()[0] if name else '',
                'last_name': ' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
            }
        )
        if created or password:
            user.set_password(password)
            user.role = User.Role.PATIENT
            user.save()

        # Create or update Patient Profile
        profile, _ = PatientProfile.objects.update_or_create(
            user=user,
            defaults={
                'name': name,
                'age': age,
                'gender': gender,
                'phone': phone,
                'preferred_language': lang,
                'mock_abha_id': mock_abha,
            }
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enriches SimpleJWT login response with role and profile metadata.
    """
    def validate(self, attrs):
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
