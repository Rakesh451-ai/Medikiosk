import uuid
from django.db import models
from django.conf import settings
from intake.models import IntakeSession

class MedicalDocument(models.Model):
    class DocType(models.TextChoices):
        PRESCRIPTION = 'prescription', 'Prescription'
        LAB_REPORT = 'lab_report', 'Laboratory Report'
        DISCHARGE_SUMMARY = 'discharge_summary', 'Discharge Summary'
        IMAGING = 'imaging', 'Diagnostic Imaging / Radiology'
        OTHER = 'other', 'Other Document'

    class OCRStatus(models.TextChoices):
        PENDING = 'pending', 'Pending Processing'
        PROCESSING = 'processing', 'Processing OCR'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    doc_id = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    session = models.ForeignKey(
        IntakeSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='medical_documents'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='patient_documents'
    )
    patient_identifier = models.CharField(max_length=64, default='', blank=True, db_index=True)
    title = models.CharField(max_length=255, default='Medical Document')
    file = models.FileField(upload_to='documents/%Y/%m/%d/', blank=True, null=True)
    file_url = models.CharField(max_length=500, blank=True, default='')
    doc_type = models.CharField(max_length=30, choices=DocType.choices, default=DocType.PRESCRIPTION)
    ocr_status = models.CharField(max_length=20, choices=OCRStatus.choices, default=OCRStatus.PENDING)
    celery_task_id = models.CharField(max_length=128, blank=True, null=True)
    raw_text = models.TextField(blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.title} ({self.doc_type}) - {self.ocr_status}"


class ExtractedRecord(models.Model):
    class RecordType(models.TextChoices):
        MEDICATION = 'medication', 'Medication / Prescription'
        LAB_RESULT = 'lab_result', 'Laboratory Test Result'
        DIAGNOSIS = 'diagnosis', 'Clinical Diagnosis'
        PROCEDURE = 'procedure', 'Surgical / Medical Procedure'

    document = models.ForeignKey(
        MedicalDocument,
        on_delete=models.CASCADE,
        related_name='extracted_records'
    )
    record_type = models.CharField(max_length=20, choices=RecordType.choices)
    structured_data = models.JSONField(default=dict)
    document_date = models.DateField(null=True, blank=True, db_index=True)
    is_abnormal = models.BooleanField(default=False, db_index=True)
    abnormal_flag_reason = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-document_date', '-created_at']

    def __str__(self):
        abn = " [ABNORMAL]" if self.is_abnormal else ""
        return f"[{self.record_type}]{abn} Doc: {self.document.doc_id}"


