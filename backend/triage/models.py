import uuid
from django.db import models
from django.conf import settings
from intake.models import IntakeSession

# CLINICAL SAFETY NOTICE:
# This system flags critical physiological patterns and patient-reported symptoms
# for IMMEDIATE HUMAN CLINICIAN ATTENTION. It DOES NOT diagnose any disease or medical condition.
# All clinical decisions remain exclusively with licensed medical practitioners.

class TriageAlert(models.Model):
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low Urgency'
        MEDIUM = 'MEDIUM', 'Moderate Urgency'
        HIGH = 'HIGH', 'High Urgency (Priority)'
        CRITICAL = 'CRITICAL', 'Critical Red-Flag (Immediate Nurse Attention)'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open / Active'
        ACKNOWLEDGED = 'acknowledged', 'Acknowledged by Staff'
        RESOLVED = 'resolved', 'Resolved by Clinician'

    alert_id = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    session = models.ForeignKey(
        IntakeSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triage_alerts'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_triage_alerts',
        null=True,
        blank=True
    )
    patient_identifier = models.CharField(max_length=64, default='', blank=True, db_index=True)
    reason = models.TextField(default='', blank=True, help_text="Clinical symptom trigger flagged for clinician review")
    trigger_reason = models.CharField(max_length=255, blank=True, default='')
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.HIGH, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    is_resolved = models.BooleanField(default=False)
    vitals_snapshot = models.JSONField(default=dict, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_triage_alerts'
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_triage_alerts'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.status.upper()}: {self.reason[:40]} ({self.patient_identifier})"


