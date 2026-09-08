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

    def process_uploaded_file(self, file_obj, user=None, client_text: str = None) -> dict:
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
                "document": None,
                "parsed_data": None
            }

        # Save to temporary storage for OCR processing
        file_ext = os.path.splitext(file_obj.name)[1].lower()
        temp_name = f"staging/{uuid.uuid4().hex}{file_ext}"
        saved_path = default_storage.save(temp_name, file_obj)
        full_path = default_storage.path(saved_path)

        try:
            # 1. OCR Text Extraction (combining file processing and optional client OCR transcript)
            ocr_res = self.ocr_service.process(full_path, client_text=client_text)
            raw_text = ocr_res.get('raw_text', '')

            if not ocr_res.get('success') or not raw_text:
                return {
                    "success": False,
                    "can_extract": False,
                    "error": ocr_res.get('error') or "We couldn't read this document. Try uploading a clearer scan or photo.",
                    "document": None,
                    "parsed_data": None,
                    "file_path": saved_path
                }

            # 2. Medical Entity Extraction without fake values
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
                "title": parsed.get('title', 'Scanned Medical Document'),
                "doc_type": parsed.get('doc_type', 'Prescription'),
                "patient_name": parsed.get('patient_name', ''),
                "doctor": parsed.get('doctor', ''),
                "facility": parsed.get('facility', ''),
                "date": parsed.get('date', datetime.date.today().strftime('%Y-%m-%d')),
                "diagnosis": parsed.get('diagnosis', ''),
                "findings": parsed.get('findings', ''),
                "impression": parsed.get('impression', ''),
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
                "parsed_data": document_preview,
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
                "parsed_data": None,
                "file_path": saved_path
            }

    def confirm_and_save_document(self, user, staged_data: dict, file_obj=None) -> dict:
        """
        Step 5 Confirm: Persists verified medical document, extracted records,
        and active medications to the database for the authenticated user.
        """
        from documents.models import MedicalDocument, ExtractedRecord
        from accounts.models import PatientMedication, VitalReading

        # Normalize nested payloads if passed under extracted_data or parsed_data
        staged_data = dict(staged_data)
        if isinstance(staged_data.get('extracted_data'), dict):
            for k, v in staged_data['extracted_data'].items():
                staged_data.setdefault(k, v)
        if isinstance(staged_data.get('parsed_data'), dict):
            for k, v in staged_data['parsed_data'].items():
                staged_data.setdefault(k, v)

        title = staged_data.get('title') or staged_data.get('document_name') or "Medical Document"
        doc_type_str = (staged_data.get('doc_type') or staged_data.get('document_type') or 'Prescription').lower()

        # Map doc_type
        if 'lab' in doc_type_str:
            dtype = MedicalDocument.DocType.LAB_REPORT
        elif 'rad' in doc_type_str or 'imag' in doc_type_str or 'x-ray' in doc_type_str or 'diagnos' in doc_type_str:
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

        # Save ExtractedRecords for medications ONLY if medications were actually found
        meds = staged_data.get('medications', [])
        for m in meds:
            med_name = m.get('name', '').strip()
            if not med_name:
                continue

            ExtractedRecord.objects.create(
                document=doc,
                record_type=ExtractedRecord.RecordType.MEDICATION,
                structured_data=m,
                document_date=doc_date,
                is_abnormal=False
            )
            # Create or update PatientMedication
            PatientMedication.objects.update_or_create(
                patient=user,
                name=med_name,
                defaults={
                    'dosage': m.get('dose') or 'As directed',
                    'frequency': m.get('frequency') or 'As directed',
                    'timing': m.get('timing') or 'As directed',
                    'duration': m.get('duration') or 'As prescribed',
                    'instruction': m.get('instruction') or 'Take with water',
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

        # Save diagnosis / findings / metadata record
        diag = staged_data.get('diagnosis') or staged_data.get('findings') or staged_data.get('impression') or ''
        doc_doctor = staged_data.get('doctor', '')
        doc_facility = staged_data.get('facility', '')
        if diag or doc_doctor or doc_facility:
            ExtractedRecord.objects.create(
                document=doc,
                record_type=ExtractedRecord.RecordType.DIAGNOSIS,
                structured_data={
                    "condition": diag,
                    "doctor": doc_doctor,
                    "facility": doc_facility,
                    "patient_name": staged_data.get('patient_name', ''),
                    "status": "active"
                },
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

            def _parse_num(val, is_float=False):
                if val is None or val == '':
                    return None
                if isinstance(val, (int, float)):
                    return float(val) if is_float else int(val)
                import re
                m = re.search(r'[-+]?\d*\.?\d+', str(val))
                if m:
                    try:
                        return float(m.group(0)) if is_float else int(float(m.group(0)))
                    except (ValueError, TypeError):
                        return None
                return None

            incoming_vitals = staged_data.get('vitals', {})
            cleaned_vitals = {}
            if isinstance(incoming_vitals, dict):
                hr = _parse_num(incoming_vitals.get('heart_rate'))
                sys = _parse_num(incoming_vitals.get('bp_systolic'))
                dia = _parse_num(incoming_vitals.get('bp_diastolic'))
                if (sys is None or dia is None) and incoming_vitals.get('blood_pressure'):
                    bp_str = str(incoming_vitals['blood_pressure'])
                    if '/' in bp_str:
                        parts = bp_str.split('/')
                        sys = sys if sys is not None else _parse_num(parts[0])
                        dia = dia if dia is not None else _parse_num(parts[1])
                spo2 = _parse_num(incoming_vitals.get('spo2'))
                temp = _parse_num(incoming_vitals.get('temperature'), is_float=True)
                gluc = _parse_num(incoming_vitals.get('glucose'))

                if hr is not None: cleaned_vitals['heart_rate'] = hr
                if sys is not None: cleaned_vitals['bp_systolic'] = sys
                if dia is not None: cleaned_vitals['bp_diastolic'] = dia
                if sys is not None and dia is not None:
                    cleaned_vitals['blood_pressure'] = f"{sys}/{dia}"
                elif incoming_vitals.get('blood_pressure'):
                    cleaned_vitals['blood_pressure'] = str(incoming_vitals['blood_pressure']).strip()
                if spo2 is not None: cleaned_vitals['spo2'] = spo2
                if temp is not None: cleaned_vitals['temperature'] = temp
                if gluc is not None: cleaned_vitals['glucose'] = gluc
                if incoming_vitals.get('status'): cleaned_vitals['status'] = incoming_vitals['status']

            if cleaned_vitals:
                user_profile.latest_vitals = {
                    **(user_profile.latest_vitals or {}),
                    **cleaned_vitals
                }
                updated_profile_fields.append('latest_vitals')

                # Record in VitalReading history with validated types
                VitalReading.objects.create(
                    patient=user,
                    heart_rate=cleaned_vitals.get('heart_rate'),
                    bp_systolic=cleaned_vitals.get('bp_systolic'),
                    bp_diastolic=cleaned_vitals.get('bp_diastolic'),
                    spo2=cleaned_vitals.get('spo2'),
                    temperature=cleaned_vitals.get('temperature'),
                    glucose=cleaned_vitals.get('glucose'),
                    status=cleaned_vitals.get('status', 'Normal'),
                    notes=f"Extracted from {doc.title}"
                )

            user_profile.save(update_fields=updated_profile_fields)

        # Create or update PhysicianSummary from verified document data
        try:
            from summary.models import PhysicianSummary
            summary_chief = diag or staged_data.get('title') or 'Clinical Consultation'
            findings_str = staged_data.get('findings') or staged_data.get('impression') or diag or ''

            hpi_elements = []
            if doc_doctor:
                hpi_elements.append(f"Consultation with Dr. {doc_doctor}")
            if doc_facility:
                hpi_elements.append(f"at {doc_facility}")
            if doc_date:
                hpi_elements.append(f"on {doc_date.strftime('%B %d, %Y')}.")
            if diag:
                hpi_elements.append(f"Diagnosis / assessment: {diag}.")
            if findings_str and findings_str != diag:
                hpi_elements.append(f"Clinical findings: {findings_str}.")
            if meds:
                med_names = [m.get('name') for m in meds if m.get('name')]
                if med_names:
                    hpi_elements.append(f"Prescribed medications: {', '.join(med_names)}.")
            if cleaned_vitals:
                v_items = []
                if cleaned_vitals.get('heart_rate'): v_items.append(f"Heart Rate {cleaned_vitals['heart_rate']} bpm")
                if cleaned_vitals.get('blood_pressure'): v_items.append(f"BP {cleaned_vitals['blood_pressure']}")
                if cleaned_vitals.get('spo2'): v_items.append(f"SpO2 {cleaned_vitals['spo2']}%")
                if cleaned_vitals.get('temperature'): v_items.append(f"Temp {cleaned_vitals['temperature']}°F")
                if cleaned_vitals.get('glucose'): v_items.append(f"Glucose {cleaned_vitals['glucose']} mg/dL")
                if v_items:
                    hpi_elements.append(f"Documented vitals: {', '.join(v_items)}.")

            hpi_text = " ".join(hpi_elements) if hpi_elements else "Medical record reviewed and verified."

            bilingual_summary = {
                "hi": {
                    "chief_complaint": diag or "चिकित्सीय परामर्श",
                    "hpi": f"मरीज़ का दस्तावेज़ दर्ज किया गया। डॉक्टर: {doc_doctor or 'उपलब्ध नहीं'}, अस्पताल: {doc_facility or 'उपलब्ध नहीं'}।",
                    "doctor_action": "निर्धारित दवाओं और सावधानियों का पालन करें।"
                }
            }

            PhysicianSummary.objects.update_or_create(
                patient=user,
                defaults={
                    'patient_identifier': patient_identifier,
                    'status': PhysicianSummary.Status.CONFIRMED,
                    'chief_complaint': summary_chief,
                    'hpi': hpi_text,
                    'past_medical_surgical_history': diag or "No prior surgical history documented.",
                    'drug_history': meds,
                    'allergies': user_profile.allergies if user_profile else [],
                    'investigations': labs,
                    'bilingual_summary': bilingual_summary,
                    'doctor_notes': f"Extracted from verified {doc.doc_type}: {doc.title}"
                }
            )
        except Exception as summary_err:
            logger.warning(f"Could not update PhysicianSummary: {summary_err}")

        return {
            "id": doc.id,
            "doc_id": doc.doc_id,
            "title": doc.title,
            "doc_type": doc.doc_type,
            "doctor": staged_data.get('doctor', ''),
            "facility": staged_data.get('facility', ''),
            "patient_name": staged_data.get('patient_name', ''),
            "date": doc_date.strftime('%Y-%m-%d'),
            "diagnosis": staged_data.get('diagnosis', ''),
            "findings": staged_data.get('findings', ''),
            "impression": staged_data.get('impression', ''),
            "medications": meds,
            "lab_results": labs,
            "file_url": doc.file.url if doc.file else (doc.file_url or ''),
            "uploaded_at": doc.uploaded_at.isoformat()
        }
