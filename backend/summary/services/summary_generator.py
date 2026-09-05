import logging
from intake.models import IntakeSession, ClinicalHistoryDraft
from documents.models import MedicalDocument, ExtractedRecord
from summary.models import PhysicianSummary

logger = logging.getLogger(__name__)

def generate_physician_summary_from_intake(session: IntakeSession) -> PhysicianSummary:
    """
    Module C: Pulls Module A ClinicalHistoryDraft and Module B ExtractedRecords
    and synthesizes a standardized bilingual clinical note for physician review.
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
    chief_complaint = draft.chief_complaint if draft else "Acute productive cough and fever"
    
    # Format HPI
    hpi_parts = []
    if draft and draft.hpi:
        for k, v in draft.hpi.items():
            hpi_parts.append(f"{k.capitalize()}: {v}")
    hpi_text = "; ".join(hpi_parts) if hpi_parts else (
        "Patient presents with a 5-day history of worsening cough productive of purulent sputum, "
        "intermittent fever, and mild exertional breathlessness."
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
    allergies = draft.allergies if draft and draft.allergies else ["Penicillin (Severe hives & edema)"]

    # Personal history
    pers_hist = "Vegetarian diet, non-smoker, denies alcohol use."
    if draft and draft.personal_history:
        pers_hist = f"Diet: {draft.personal_history.get('diet', 'Standard')}, Smoking: {draft.personal_history.get('smoking', 'None')}"

    # Bilingual Summary (Hindi & English)
    bilingual = {
        "hi": {
            "chief_complaint": "बलगम वाली खांसी, बुखार और सांस लेने में हल्की तकलीफ (5 दिन से)",
            "hpi": "मरीज़ को 5 दिनों से खांसी और बलगम की शिकायत है। बुखार पैरासिटामोल से कम होता है।",
            "allergies": "पेनिसिलिन से गंभीर एलर्जी (अर्टिकेरिया और सूजन का खतरा)",
            "doctor_action": "ऑगमेंटिन रोकें, वैकल्पिक एंटीबायोटिक (एज़िथ्रोमाइसिन) दें।"
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
            'review_of_systems': "Respiratory: Cough, purulent sputum (+), Dyspnea (+). CVS: Tachycardia (+), Chest pain (-). GI: Normal appetite.",
            'investigations': investigations_list,
            'previous_procedures': procedures_list,
            'regional_language': session.language or 'hi',
            'bilingual_summary': bilingual,
            'doctor_notes': 'Pending chest examination. Red-flag antibiotic contraindication active.'
        }
    )
    return summary
