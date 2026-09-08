import uuid
from django.db import models
from django.conf import settings

class IntakeSession(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        ABANDONED = 'ABANDONED', 'Abandoned'

    class Stage(models.TextChoices):
        CHIEF_COMPLAINT = 'CHIEF_COMPLAINT', 'Chief Complaint'
        HPI = 'HPI', 'History of Present Illness (SOCRATES)'
        PAST_HISTORY = 'PAST_HISTORY', 'Past Medical & Surgical History'
        DRUG_ALLERGY = 'DRUG_ALLERGY', 'Medications & Allergies'
        FAMILY_PERSONAL = 'FAMILY_PERSONAL', 'Family & Personal History'
        AYUSH = 'AYUSH', 'AYUSH / Ayurvedic Specifics'
        COMPLETE = 'COMPLETE', 'Intake Completed'

    session_id = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intake_sessions',
        null=True,
        blank=True
    )
    patient_identifier = models.CharField(max_length=64, default='', blank=True)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctor_intake_sessions'
    )
    department = models.CharField(max_length=100, default='General Medicine')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    language = models.CharField(max_length=20, default='en')
    is_ayush_enabled = models.BooleanField(default=False)
    flagged = models.BooleanField(default=False, db_index=True)
    flag_reason = models.CharField(max_length=255, blank=True, default='')
    progress_percent = models.PositiveIntegerField(default=10)
    current_stage = models.CharField(max_length=30, choices=Stage.choices, default=Stage.CHIEF_COMPLAINT)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        flag_str = " [RED FLAG]" if self.flagged else ""
        return f"Session {self.session_id} - {self.patient_identifier}{flag_str} ({self.status})"


class IntakeMessage(models.Model):
    class Sender(models.TextChoices):
        PATIENT = 'patient', 'Patient'
        AI = 'ai', 'AI Kiosk Agent'
        SYSTEM = 'system', 'System'

    class InputMode(models.TextChoices):
        VOICE = 'voice', 'Voice (ASR)'
        TOUCH = 'touch', 'Touch Selection'
        TEXT = 'text', 'Text Input'

    session = models.ForeignKey(
        IntakeSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.CharField(max_length=20, choices=Sender.choices)
    text = models.TextField()
    input_mode = models.CharField(max_length=20, choices=InputMode.choices, default=InputMode.TOUCH)
    suggested_answers = models.JSONField(default=list, blank=True)
    extracted_entities = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.sender}] {self.text[:30]}"

# Backwards compatibility alias
ConversationTurn = IntakeMessage


class ClinicalHistoryDraft(models.Model):
    session = models.OneToOneField(
        IntakeSession,
        on_delete=models.CASCADE,
        related_name='clinical_draft'
    )
    chief_complaint = models.TextField(blank=True, default='')
    hpi = models.JSONField(default=dict, blank=True)
    past_medical_history = models.JSONField(default=list, blank=True)
    drug_history = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    family_history = models.JSONField(default=list, blank=True)
    personal_history = models.JSONField(default=dict, blank=True)
    ayush_fields = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Draft for {self.session.session_id} - CC: {self.chief_complaint[:30]}"


