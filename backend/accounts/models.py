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
    is_flagged_spammer = models.BooleanField(
        default=False,
        help_text="Flagged by security system or admin for spamming or suspicious activity"
    )
    spam_score = models.PositiveIntegerField(
        default=0,
        help_text="Risk score (0=clean, >50=warning, >80=high risk/auto-block)"
    )
    spam_notes = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Security or admin notes on why user is flagged"
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
    mock_aadhaar_id = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Mock 12-digit Aadhaar Number (e.g. 5521 8934 1284 or 552189341284) standing in for UIDAI gateway"
    )
    blood_group = models.CharField(max_length=10, blank=True, default='')
    allergies = models.JSONField(default=list, blank=True)
    chronic_conditions = models.JSONField(default=list, blank=True)
    primary_doctor = models.CharField(max_length=150, blank=True, default='')
    hospital_name = models.CharField(max_length=200, blank=True, default='')
    emergency_contact = models.CharField(max_length=50, blank=True, default='')
    latest_vitals = models.JSONField(default=dict, blank=True)
    has_scanned_documents = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Patient: {self.name} (ABHA: {self.mock_abha_id or 'None'}, Aadhaar: {self.mock_aadhaar_id or 'None'})"


class OTPVerification(models.Model):
    class IdentifierType(models.TextChoices):
        AADHAAR = 'AADHAAR', 'Aadhaar'
        ABHA = 'ABHA', 'ABHA'
        MOBILE = 'MOBILE', 'Mobile'
        EMAIL = 'EMAIL', 'Email'
        AUTO = 'AUTO', 'Auto-detected'

    identifier = models.CharField(max_length=120, db_index=True)
    otp_code = models.CharField(max_length=10)
    identifier_type = models.CharField(
        max_length=20,
        choices=IdentifierType.choices,
        default=IdentifierType.AUTO
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        from django.utils import timezone
        from datetime import timedelta
        return not self.is_verified and (timezone.now() - self.created_at) < timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.identifier}: {self.otp_code} [Verified: {self.is_verified}]"


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


class BlockedIdentifier(models.Model):
    """
    Registry of blacklisted/blocked identifiers to protect against OTP flood,
    credential stuffing, forged Aadhaar/ABHA, and persistent spammers.
    """
    class IdentifierType(models.TextChoices):
        IP = 'IP', 'IP Address'
        PHONE = 'PHONE', 'Phone Number'
        EMAIL = 'EMAIL', 'Email Address'
        AADHAAR = 'AADHAAR', 'Aadhaar Number'
        ABHA = 'ABHA', 'ABHA ID'
        USERNAME = 'USERNAME', 'Username'

    identifier = models.CharField(max_length=150, db_index=True)
    identifier_type = models.CharField(
        max_length=20,
        choices=IdentifierType.choices,
        default=IdentifierType.IP
    )
    reason = models.TextField(help_text="Reason for blocking or blacklisting")
    is_active = models.BooleanField(default=True, help_text="Whether this block is active")
    blocked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blocked_identifiers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Blocked {self.identifier_type}: {self.identifier} ({'Active' if self.is_active else 'Revoked'})"


class SecurityAuditLog(models.Model):
    """
    Security and audit trail for tracking suspicious logins, OTP spamming,
    fraud detection, and administrative security enforcement.
    """
    class EventType(models.TextChoices):
        FAILED_LOGIN = 'FAILED_LOGIN', 'Failed Login Attempt'
        OTP_FLOOD = 'OTP_FLOOD', 'Excessive OTP Requests'
        SPAM_DETECTED = 'SPAM_DETECTED', 'Spam / Fraud Detected'
        USER_BANNED = 'USER_BANNED', 'User Banned / Flagged'
        USER_UNBANNED = 'USER_UNBANNED', 'User Restored'
        IDENTIFIER_BLOCKED = 'IDENTIFIER_BLOCKED', 'Identifier Blacklisted'
        IDENTIFIER_UNBLOCKED = 'IDENTIFIER_UNBLOCKED', 'Identifier Unblocked'
        ROLE_CHANGED = 'ROLE_CHANGED', 'User Role Modified'
        ACCOUNT_DELETED = 'ACCOUNT_DELETED', 'Account Removed'
        SUSPICIOUS_GEO = 'SUSPICIOUS_GEO', 'Unusual Geographic Access'

    class RiskLevel(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    event_type = models.CharField(max_length=50, choices=EventType.choices)
    identifier = models.CharField(max_length=150, db_index=True)
    ip_address = models.CharField(max_length=64, default='127.0.0.1')
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.LOW)
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.risk_level}] {self.event_type} - {self.identifier} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"


class PatientMedication(models.Model):
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='medications'
    )
    name = models.CharField(max_length=150)
    dosage = models.CharField(max_length=100, default='Standard')
    frequency = models.CharField(max_length=100, default='Once daily')
    timing = models.CharField(max_length=100, default='Morning')
    duration = models.CharField(max_length=100, default='5 days')
    instruction = models.CharField(max_length=255, default='Take with water', blank=True)
    is_active = models.BooleanField(default=True)
    last_taken_at = models.DateTimeField(null=True, blank=True)
    source_document = models.ForeignKey(
        'documents.MedicalDocument',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='associated_medications'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_active', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.dosage}) for {self.patient.username}"


class MedicationLog(models.Model):
    medication = models.ForeignKey(
        PatientMedication,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='medication_logs'
    )
    taken_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-taken_at']

    def __str__(self):
        return f"{self.medication.name} taken at {self.taken_at.strftime('%Y-%m-%d %H:%M')}"


class VitalReading(models.Model):
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='vital_readings'
    )
    heart_rate = models.IntegerField(null=True, blank=True)
    bp_systolic = models.IntegerField(null=True, blank=True)
    bp_diastolic = models.IntegerField(null=True, blank=True)
    spo2 = models.IntegerField(null=True, blank=True)
    temperature = models.FloatField(null=True, blank=True)
    glucose = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, default='Normal')
    notes = models.CharField(max_length=255, blank=True, default='')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"Vitals for {self.patient.username} at {self.recorded_at.strftime('%Y-%m-%d %H:%M')}"


class Conversation(models.Model):
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    title = models.CharField(max_length=255, default='New Health Consultation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation {self.id} for {self.patient.username}: {self.title}"


class ChatMessage(models.Model):
    class Sender(models.TextChoices):
        PATIENT = 'patient', 'Patient'
        AGENT = 'agent', 'Agent'

    conversation = models.ForeignKey(
        Conversation,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_messages'
    )
    sender = models.CharField(max_length=20, choices=Sender.choices)
    text = models.TextField()
    urgency = models.CharField(max_length=20, default='normal')
    quick_replies = models.JSONField(default=list, blank=True)
    is_emergency = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender}] {self.patient.username}: {self.text[:30]}"




