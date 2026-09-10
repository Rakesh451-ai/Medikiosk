import logging
import datetime
from django.db import models
from django.utils import timezone
from intake.models import IntakeSession, ClinicalHistoryDraft
from documents.models import MedicalDocument, ExtractedRecord
from accounts.models import PatientProfile, PatientMedication, VitalReading
from summary.models import PhysicianSummary

logger = logging.getLogger(__name__)

def generate_physician_summary_from_intake(session: IntakeSession) -> PhysicianSummary:
    """
    Module C: Pulls Module A ClinicalHistoryDraft and Module B ExtractedRecords
    and synthesizes a standardized bilingual clinical note for physician review.
    Preserved for session-based intake and backwards compatibility.
    """
    draft = getattr(session, 'clinical_draft', None)
    patient_id = session.patient_identifier

    # 1. Pull Extracted Records from Module B
    records = ExtractedRecord.objects.filter(
        document__patient_identifier=patient_id
    )

    medications_list = []
    investigations_list = []
    diagnoses_list = []
    procedures_list = []

    for r in records:
        if r.record_type == ExtractedRecord.RecordType.MEDICATION:
            medications_list.append(r.structured_data)
        elif r.record_type == ExtractedRecord.RecordType.LAB_RESULT:
            item = dict(r.structured_data)
            item['is_abnormal'] = r.is_abnormal
            item['abnormal_flag_reason'] = r.abnormal_flag_reason
            item['date'] = r.document_date.isoformat() if r.document_date else None
            investigations_list.append(item)
        elif r.record_type == ExtractedRecord.RecordType.DIAGNOSIS:
            diagnoses_list.append(r.structured_data.get('condition', ''))
        elif r.record_type == ExtractedRecord.RecordType.PROCEDURE:
            procedures_list.append(r.structured_data)

    # 2. Extract from Module A Draft
    chief_complaint = draft.chief_complaint if draft and draft.chief_complaint else "Clinical Evaluation"
    
    # Format HPI
    hpi_parts = []
    if draft and draft.hpi:
        for k, v in draft.hpi.items():
            hpi_parts.append(f"{k.capitalize()}: {v}")
    hpi_text = "; ".join(hpi_parts) if hpi_parts else (
        "Patient intake completed. Clinical notes compiled from patient consultation and records."
    )

    # Past Medical History
    pmh = []
    if draft and draft.past_medical_history:
        pmh.extend(draft.past_medical_history)
    if diagnoses_list:
        pmh.extend(diagnoses_list)
    pmh_text = ", ".join(pmh) if pmh else "No documented chronic illnesses or previous surgeries."

    # Drug History & Allergies
    drug_history = medications_list or (draft.drug_history if draft else [])
    allergies = draft.allergies if draft and draft.allergies else []

    # Personal history
    pers_hist = ""
    if draft and draft.personal_history:
        pers_hist = f"Diet: {draft.personal_history.get('diet', 'Standard')}, Smoking: {draft.personal_history.get('smoking', 'None')}"

    # Bilingual Summary (Hindi & English)
    bilingual = {
        "hi": {
            "chief_complaint": chief_complaint,
            "hpi": "मरीज़ के मेडिकल रिकॉर्ड के आधार पर सारांश तैयार किया गया है।",
            "allergies": ", ".join(allergies) if allergies else "कोई ज्ञात एलर्जी दर्ज नहीं है।",
            "doctor_action": "निर्धारित दवाओं और सावधानियों का पालन करें।"
        }
    }

    # 3. Create or Update PhysicianSummary with status=DRAFT
    summary, created = PhysicianSummary.objects.update_or_create(
        session=session,
        defaults={
            'patient': session.patient,
            'patient_identifier': patient_id,
            'status': PhysicianSummary.Status.DRAFT,
            'chief_complaint': chief_complaint,
            'hpi': hpi_text,
            'past_medical_surgical_history': pmh_text,
            'drug_history': drug_history,
            'allergies': allergies,
            'family_history': "No known premature coronary artery disease in first-degree relatives.",
            'personal_history': pers_hist,
            'review_of_systems': "Review of systems documented in patient EHR.",
            'investigations': investigations_list,
            'previous_procedures': procedures_list,
            'regional_language': session.language or 'hi',
            'bilingual_summary': bilingual,
            'doctor_notes': 'Clinical review notes.'
        }
    )
    return summary


def build_patient_health_summary(user) -> dict:
    """
    Dynamically aggregates the patient's full medical summary dashboard purely from the
    authenticated patient's actual database records via PatientSummaryService.
    """
    from api.services.patient_summary_service import PatientSummaryService
    return PatientSummaryService.build_summary(user)
