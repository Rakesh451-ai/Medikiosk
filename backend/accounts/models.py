from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = 'PATIENT', 'Patient'
        DOCTOR = 'DOCTOR', 'Doctor'
        TRIAGE_STAFF = 'TRIAGE_STAFF', 'Triage Staff'
        ADMIN = 'ADMIN', 'Administrator'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT,
        help_text="Role-based access level for MediKiosk"
    )

    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR

    @property
    def is_triage_staff(self):
        return self.role == self.Role.TRIAGE_STAFF

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    @property
    def is_clinical_staff(self):
        return self.role in [self.Role.DOCTOR, self.Role.TRIAGE_STAFF, self.Role.ADMIN]

    def __str__(self):
        return f"{self.username} [{self.role}]"


class PatientProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='patient_profile'
    )
    name = models.CharField(max_length=150)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        default=Gender.OTHER
    )
    phone = models.CharField(max_length=20, db_index=True)
    preferred_language = models.CharField(
        max_length=20,
        default='en',
        help_text="Language code (e.g., en, hi, te, bn)"
    )
    # mock_abha_id stands in for real ABHA integration until Phase 6
    # 14-digit format: e.g. 14-8921-3490-1284 or username@abdm
    mock_abha_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Mock 14-digit ABHA ID (e.g. 14-8921-3490-1284) standing in for ABDM gateway"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Patient: {self.name} (ABHA: {self.mock_abha_id or 'None'})"


class DoctorProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='doctor_profile'
    )
    name = models.CharField(max_length=150)
    department = models.CharField(max_length=100, default='General Medicine')
    specialization = models.CharField(max_length=100, default='Consultant Physician')
    room_number = models.CharField(max_length=20, default='Room 3')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dr. {self.name} ({self.specialization}, {self.department})"


class TriageStaffProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='triage_staff_profile'
    )
    name = models.CharField(max_length=150)
    station_id = models.CharField(max_length=50, default='Kiosk Station 01')
    shift = models.CharField(max_length=50, default='Morning (08:00 - 16:00)')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Staff: {self.name} ({self.station_id})"


