import uuid
from django.db import models
from django.conf import settings
from intake.models import IntakeSession

class PhysicianSummary(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft (AI-Generated)'
        IN_REVIEW = 'IN_REVIEW', 'In Doctor Review'
        CONFIRMED = 'CONFIRMED', 'Confirmed by Physician'

    summary_id = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    session = models.ForeignKey(
        IntakeSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='physician_summaries'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='physician_summaries'
    )
    patient_identifier = models.CharField(max_length=64, default='MK-78294', db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Standard Clinical Note Structure
    chief_complaint = models.TextField(blank=True, default='')
    hpi = models.TextField(blank=True, default='', help_text="History of Present Illness")
    past_medical_surgical_history = models.TextField(blank=True, default='')
    drug_history = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    family_history = models.TextField(blank=True, default='')
    personal_history = models.TextField(blank=True, default='')
    review_of_systems = models.TextField(blank=True, default='')
    investigations = models.JSONField(default=list, blank=True, help_text="Lab test results with abnormal flags")
    previous_procedures = models.JSONField(default=list, blank=True)

    # Bilingual clinical note version
    regional_language = models.CharField(max_length=20, default='hi')
    bilingual_summary = models.JSONField(default=dict, blank=True)

    doctor_notes = models.TextField(blank=True, default='')
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_physician_summaries'
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Summary {self.summary_id} [{self.status}] for {self.patient_identifier}"

# Alias for backwards compatibility
ClinicalSummary = PhysicianSummary


class SummaryRevision(models.Model):
    """
    Audit log of doctor edits and confirmations to the clinical summary.
    Never lets AI summary silently become final without logged human clinical action.
    """
    summary = models.ForeignKey(
        PhysicianSummary,
        on_delete=models.CASCADE,
        related_name='revisions'
    )
    edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    changes = models.JSONField(default=dict)
    revision_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Revision on {self.summary.summary_id} by {self.edited_by} at {self.created_at}"


