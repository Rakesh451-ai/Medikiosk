import uuid
from django.db import models
from django.conf import settings

class ConsentRecord(models.Model):
    class Purpose(models.TextChoices):
        SHARE_HOSPITAL = 'share_hospital', 'Share with Consulting Hospital & Doctor'
        STORE_DOCUMENTS = 'store_documents', 'Store & Digitize Medical Documents'
        LINK_ABHA = 'link_abha', 'Link to ABHA Digital Health Record (ABDM)'
        AI_TRANSCRIPTION = 'ai_transcription', 'AI Automated Clinical Transcription'

    consent_id = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_records',
        null=True,
        blank=True
    )
    patient_identifier = models.CharField(max_length=64, default='', blank=True, db_index=True)
    purpose = models.CharField(max_length=50, choices=Purpose.choices, default=Purpose.SHARE_HOSPITAL)
    granted = models.BooleanField(default=True, db_index=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    hip_id = models.CharField(max_length=64, default='IN-HOSP-001')
    hiu_id = models.CharField(max_length=64, default='IN-HIU-MEDIKIOSK')
    mock_fhir_bundle = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-granted_at']

    def __str__(self):
        state = "GRANTED" if self.granted else "REVOKED"
        return f"Consent [{state}] {self.purpose} for {self.patient_identifier}"

# Alias for backwards compatibility
ConsentArtifact = ConsentRecord


