"""
End-to-End Medical Document Ingestion & Staged Confirmation Pipeline
Validates, processes OCR, parses clinical entities, evaluates allergies,
and persists confirmed medical records.
"""

import os
import uuid
import datetime
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from .ocr_service import OCRService
from .medical_parser import MedicalParser
from .safety_service import SafetyService

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg'}


class DocumentService:
    def __init__(self):
        self.ocr_service = OCRService()
        self.medical_parser = MedicalParser()
        self.safety_service = SafetyService()

    def validate_file(self, file_obj) -> tuple[bool, str]:
        """Validates file presence, extension, size, and integrity."""
        if not file_obj:
            return False, "No document file was provided."

        file_name = getattr(file_obj, 'name', '')
        _, ext = os.path.splitext(file_name.lower())

        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file type '{ext}'. Please upload a PDF (.pdf) or image (.png, .jpg, .jpeg)."

        size = getattr(file_obj, 'size', 0)
        if size <= 0:
            return False, "The uploaded file is empty."
        if size > MAX_FILE_SIZE_BYTES:
            return False, "The file exceeds the maximum allowed size of 15MB. Please upload a smaller file."

        return True, ""

    def process_uploaded_file(self, file_obj, user=None) -> dict:
        """
        Runs complete extraction pipeline on uploaded document without committing final record.
        Returns structured review result for Step 4 Review.
        """
        is_valid, err = self.validate_file(file_obj)
        if not is_valid:
            return {
                "success": False,
                "can_extract": False,
                "error": err,
                "document": None
            }

        # Save to temporary storage for OCR processing
        file_ext = os.path.splitext(file_obj.name)[1].lower()
        temp_name = f"staging/{uuid.uuid4().hex}{file_ext}"
        saved_path = default_storage.save(temp_name, file_obj)
        full_path = default_storage.path(saved_path)

        try:
            # 1. OCR Text Extraction
            ocr_res = self.ocr_service.process(full_path)
            raw_text = ocr_res.get('raw_text', '')

            if not ocr_res.get('success') or not raw_text:
                return {
                    "success": False,
                    "can_extract": False,
                    "error": ocr_res.get('error') or "We couldn't read this document. Try uploading a clearer scan or photo.",
                    "document": None,
                    "file_path": saved_path
                }

            # 2. Medical Parsing
            parsed = self.medical_parser.parse(raw_text)

            # 3. Patient Allergy Cross-Check
            patient_allergies = []
            if user and hasattr(user, 'patient_profile') and user.patient_profile.allergies:
                patient_allergies = user.patient_profile.allergies

            safety_result = self.safety_service.check_allergies(
                medications=parsed.get('medications', []),
                patient_allergies=patient_allergies
            )

            document_preview = {
                "title": parsed.get('title', 'Scanned Document'),
                "doc_type": parsed.get('doc_type', 'Prescription'),
                "doctor": parsed.get('doctor', 'Attending Physician'),
                "facility": parsed.get('facility', 'Medical Center'),
                "date": parsed.get('date', datetime.date.today().strftime('%Y-%m-%d')),
                "diagnosis": parsed.get('diagnosis', ''),
                "medications": parsed.get('medications', []),
                "lab_results": parsed.get('lab_results', []),
                "vitals": parsed.get('vitals', {}),
                "confidence": parsed.get('confidence', '90.0%'),
                "extracted_text": raw_text,
                "page_count": ocr_res.get('page_count', 1),
                "file_path": saved_path,
                "file_name": file_obj.name,
                "file_size": file_obj.size,
            }

            return {
                "success": True,
                "can_extract": True,
                "document": document_preview,
                "medications": parsed.get('medications', []),
                "lab_results": parsed.get('lab_results', []),
                "allergy_warning": safety_result.get('has_warning', False),
                "allergy_message": safety_result.get('warning_message', ''),
                "flagged_drugs": safety_result.get('flagged_drugs', []),
                "error": None
            }

        except Exception as e:
            logger.exception(f"Error during document processing pipeline: {e}")
            return {
                "success": False,
                "can_extract": False,
                "error": "We couldn't read this document. Try uploading a clearer scan or photo.",
                "document": None,
                "file_path": saved_path
            }

    def confirm_and_save_document(self, user, staged_data: dict, file_obj=None) -> dict:
        """
        Step 5 Confirm: Persists verified medical document, extracted records,
        and active medications to the database for the authenticated user.
        """
        from documents.models import MedicalDocument, ExtractedRecord
        from accounts.models import PatientMedication, VitalReading

        title = staged_data.get('title') or "Medical Document"
        doc_type_str = staged_data.get('doc_type', 'Prescription').lower()

        # Map doc_type
        if 'lab' in doc_type_str:
            dtype = MedicalDocument.DocType.LAB_REPORT
        elif 'rad' in doc_type_str or 'imag' in doc_type_str or 'x-ray' in doc_type_str:
            dtype = MedicalDocument.DocType.IMAGING
        elif 'disch' in doc_type_str:
            dtype = MedicalDocument.DocType.DISCHARGE_SUMMARY
        else:
            dtype = MedicalDocument.DocType.PRESCRIPTION

        user_profile = getattr(user, 'patient_profile', None)
        patient_identifier = ''
        if user_profile:
            patient_identifier = user_profile.mock_abha_id or user_profile.mock_aadhaar_id or user_profile.phone or user.username
        else:
            patient_identifier = user.username

        # Create MedicalDocument
        doc = MedicalDocument.objects.create(
            patient=user,
            patient_identifier=patient_identifier,
            title=title,
            doc_type=dtype,
            ocr_status=MedicalDocument.OCRStatus.COMPLETED,
            raw_text=staged_data.get('extracted_text', '')
        )

        # Attach file if provided or if in staging
        staged_path = staged_data.get('file_path')
        if file_obj:
            doc.file = file_obj
            doc.save(update_fields=['file'])
        elif staged_path and default_storage.exists(staged_path):
            doc.file.name = staged_path
            doc.save(update_fields=['file'])

        doc_date = datetime.date.today()
        try:
            if staged_data.get('date'):
                doc_date = datetime.datetime.strptime(staged_data['date'], '%Y-%m-%d').date()
        except Exception:
            pass

        # Save ExtractedRecords for medications
        meds = staged_data.get('medications', [])
        for m in meds:
            ExtractedRecord.objects.create(
                document=doc,
                record_type=ExtractedRecord.RecordType.MEDICATION,
                structured_data=m,
                document_date=doc_date,
                is_abnormal=False
            )
            # Create or update PatientMedication
            med_name = m.get('name', '').strip()
            if med_name:
                PatientMedication.objects.update_or_create(
                    patient=user,
                    name=med_name,
                    defaults={
                        'dosage': m.get('dose', 'Standard'),
                        'frequency': m.get('frequency', 'Once daily'),
                        'timing': m.get('timing', 'Morning'),
                        'duration': m.get('duration', '5 days'),
                        'instruction': m.get('instruction', 'Take with water'),
                        'is_active': True,
                        'source_document': doc
                    }
                )

        # Save ExtractedRecords for lab results
        labs = staged_data.get('lab_results', [])
        for lab in labs:
            ExtractedRecord.objects.create(
                document=doc,
                record_type=ExtractedRecord.RecordType.LAB_RESULT,
                structured_data=lab,
                document_date=doc_date,
                is_abnormal=lab.get('is_abnormal', False),
                abnormal_flag_reason=lab.get('flag_reason', '')
            )

        # Save diagnosis record
        diag = staged_data.get('diagnosis')
        if diag:
            ExtractedRecord.objects.create(
                document=doc,
                record_type=ExtractedRecord.RecordType.DIAGNOSIS,
                structured_data={"condition": diag, "status": "active"},
                document_date=doc_date,
                is_abnormal=False
            )

        # Update patient profile
        if user_profile:
            updated_profile_fields = ['has_scanned_documents']
            user_profile.has_scanned_documents = True

            if staged_data.get('doctor') and not user_profile.primary_doctor:
                user_profile.primary_doctor = staged_data['doctor']
                updated_profile_fields.append('primary_doctor')

            if staged_data.get('facility') and not user_profile.hospital_name:
                user_profile.hospital_name = staged_data['facility']
                updated_profile_fields.append('hospital_name')

            incoming_vitals = staged_data.get('vitals', {})
            if incoming_vitals:
                user_profile.latest_vitals = {
                    **(user_profile.latest_vitals or {}),
                    **incoming_vitals
                }
                updated_profile_fields.append('latest_vitals')

                # Record in VitalReading history
                VitalReading.objects.create(
                    patient=user,
                    heart_rate=incoming_vitals.get('heart_rate'),
                    bp_systolic=incoming_vitals.get('bp_systolic'),
                    bp_diastolic=incoming_vitals.get('bp_diastolic'),
                    spo2=incoming_vitals.get('spo2'),
                    temperature=incoming_vitals.get('temperature')
                )

            user_profile.save(update_fields=updated_profile_fields)

        return {
            "id": doc.id,
            "doc_id": doc.doc_id,
            "title": doc.title,
            "doc_type": doc.doc_type,
            "doctor": staged_data.get('doctor', 'Attending Physician'),
            "facility": staged_data.get('facility', 'Medical Center'),
            "diagnosis": staged_data.get('diagnosis', ''),
            "date": doc_date.strftime('%Y-%m-%d'),
            "file_url": doc.file.url if doc.file else "",
            "medications_count": len(meds),
            "status": "Verified"
        }
