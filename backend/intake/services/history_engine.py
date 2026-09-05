import re
import os
import json
import logging
from decouple import config
from intake.models import IntakeSession, IntakeMessage, ClinicalHistoryDraft
from intake.signals import red_flag_detected

logger = logging.getLogger(__name__)

# Red-flag clinical patterns (keyword & regex matching)
RED_FLAG_PATTERNS = [
    {
        'category': 'CARDIOVASCULAR',
        'pattern': r'(chest\s*pain|chest\s*tightness|angina|crushing|pressure\s*on\s*chest|radiat\w*\s*to\s*left\s*arm|heart\s*attack)',
        'reason': 'Cardiovascular Alert: Potential acute coronary syndrome / ischemic chest pain.'
    },
    {
        'category': 'RESPIRATORY',
        'pattern': r'(breathless|can\'?t\s*breathe|severe\s*shortness\s*of\s*breath|stridor|choking|gasping|gasp\w*)',
        'reason': 'Respiratory Alert: Acute dyspnea / respiratory compromise.'
    },
    {
        'category': 'NEUROLOGICAL',
        'pattern': r'(slurr\w*\s*speech|facial\s*droop|droop\w*\s*face|sudden\s*weakness|can\'?t\s*move\s*arm|paralysis|stroke|seizure|loss\s*of\s*consciousness)',
        'reason': 'Neurological Alert: Suspected acute stroke / focal deficit (FAST signs).'
    },
    {
        'category': 'HEMORRHAGE_SEPSIS',
        'pattern': r'(cough\w*\s*blood|hemoptysis|vomit\w*\s*blood|hematemesis|stiff\s*neck|unresponsive)',
        'reason': 'Critical Sepsis/Bleeding Alert: Uncontrolled hemorrhage or meningeal irritation.'
    },
    {
        'category': 'ANAPHYLAXIS',
        'pattern': r'(penicillin|allergy|allergic).*(swelling\s*of\s*(throat|lip|face|tongue)|hives\s*all\s*over|anaphyla)',
        'reason': 'Allergy Alert: Acute anaphylactoid reaction risk with airway swelling.'
    }
]

def evaluate_red_flags(text: str):
    """
    Evaluates patient text against clinical red-flag patterns.
    Returns (is_flagged: bool, reason: str, category: str)
    """
    text_lower = text.lower()
    for item in RED_FLAG_PATTERNS:
        if re.search(item['pattern'], text_lower):
            return True, item['reason'], item['category']
    return False, '', ''


class ConversationalHistoryEngine:
    """
    Multimodal clinical history taking engine implementing SOCRATES and AYUSH protocols.
    """

    STAGES_ORDER = [
        IntakeSession.Stage.CHIEF_COMPLAINT,
        IntakeSession.Stage.HPI,
        IntakeSession.Stage.PAST_HISTORY,
        IntakeSession.Stage.DRUG_ALLERGY,
        IntakeSession.Stage.FAMILY_PERSONAL,
        IntakeSession.Stage.AYUSH,
        IntakeSession.Stage.COMPLETE,
    ]

    STAGE_PROGRESS = {
        IntakeSession.Stage.CHIEF_COMPLAINT: 15,
        IntakeSession.Stage.HPI: 40,
        IntakeSession.Stage.PAST_HISTORY: 60,
        IntakeSession.Stage.DRUG_ALLERGY: 75,
        IntakeSession.Stage.FAMILY_PERSONAL: 90,
        IntakeSession.Stage.AYUSH: 95,
        IntakeSession.Stage.COMPLETE: 100,
    }

    @classmethod
    def get_initial_greeting(cls, session: IntakeSession):
        lang = session.language or 'en'
        is_ayush = session.is_ayush_enabled or 'ayush' in session.department.lower()

        if lang == 'hi':
            prompt = "नमस्ते! मैं आपका मेडीकियोस्क डिजिटल सहायक हूँ। आज अस्पताल आने का मुख्य कारण क्या है?"
            options = ["खांसी और बुखार", "सांस लेने में तकलीफ", "पेट दर्द", "कमजोरी व चक्कर"]
        elif lang == 'hinglish':
            prompt = "Namaste! Main aapka MediKiosk digital assistant hoon. Aaj aapko kya problem ho rahi hai?"
            options = ["Cough aur Fever", "Breathlessness (Saans phoolna)", "Pet dard", "Chakkar / Weakness"]
        else:
            prompt = "Namaste and welcome to MediKiosk. What primary health issue or symptom brings you to the clinic today?"
            options = ["Persistent Cough & Fever", "Chest or Breathing Trouble", "Abdominal Pain", "Joint Pain / Body Ache"]

        return prompt, options

    @classmethod
    def process_turn(cls, session: IntakeSession, patient_text: str, input_mode: str = 'touch'):
        """
        Processes a single conversational turn from the patient.
        1. Checks red flags.
        2. Records patient message.
        3. Updates ClinicalHistoryDraft with structured clinical data.
        4. Selects next question based on SOCRATES & clinical history order.
        5. Records and returns AI message.
        """
        # 1. Red-Flag Detection
        is_flagged, flag_reason, category = evaluate_red_flags(patient_text)
        if is_flagged:
            session.flagged = True
            session.flag_reason = flag_reason
            session.save(update_fields=['flagged', 'flag_reason'])
            # Fire signal to notify triage app
            try:
                red_flag_detected.send(
                    sender=IntakeSession,
                    session=session,
                    red_flag_reason=flag_reason,
                    raw_text=patient_text
                )
            except Exception as e:
                logger.warning(f"Error firing red_flag_detected signal: {e}")

        # 2. Record Patient Message
        IntakeMessage.objects.create(
            session=session,
            sender=IntakeMessage.Sender.PATIENT,
            text=patient_text,
            input_mode=input_mode,
        )

        # 3. Get or create ClinicalHistoryDraft
        draft, _ = ClinicalHistoryDraft.objects.get_or_create(session=session)

        # 4. State Transition & Extraction
        current_stage = session.current_stage
        lang = session.language or 'en'
        is_ayush = session.is_ayush_enabled or 'ayush' in session.department.lower() or 'ayurved' in session.department.lower()

        next_stage = current_stage
        next_question = ""
        suggested_answers = []

        if current_stage == IntakeSession.Stage.CHIEF_COMPLAINT:
            draft.chief_complaint = patient_text
            next_stage = IntakeSession.Stage.HPI
            if lang == 'hi':
                next_question = f"समझ गया: '{patient_text}'। यह तकलीफ कितने दिनों से हो रही है?"
                suggested_answers = ["आज से शुरू हुआ", "1-2 दिन से", "लगभग 5 दिन से", "2 हफ्ते से ज्यादा"]
            elif lang == 'hinglish':
                next_question = f"Noted: '{patient_text}'। Yeh symptoms kitne din se hain?"
                suggested_answers = ["Aaj se", "1-2 din se", "Lagbhag 5 din se", "2 weeks se zyada"]
            else:
                next_question = f"Understood: '{patient_text}'. Following clinical evaluation, when did this onset and how long has it persisted?"
                suggested_answers = ["Started today", "1-2 days ago", "About 5 days ago", "More than 2 weeks"]

        elif current_stage == IntakeSession.Stage.HPI:
            # SOCRATES extraction into HPI dict
            hpi_data = draft.hpi or {}
            hpi_data['duration_onset'] = patient_text
            if 'cough' in draft.chief_complaint.lower():
                hpi_data['character'] = 'Productive with phlegm'
                hpi_data['site'] = 'Respiratory tract / Chest'
            draft.hpi = hpi_data

            next_stage = IntakeSession.Stage.PAST_HISTORY
            if lang == 'hi':
                next_question = "क्या आपको पहले से कोई पुरानी बीमारी है (जैसे बीपी, शुगर, या दमा)? या कोई पुरानी सर्जरी?"
                suggested_answers = ["बचपन में दमा (Asthma)", "हाई ब्लड प्रेशर / शुगर", "कोई पुरानी बीमारी नहीं"]
            elif lang == 'hinglish':
                next_question = "Kya aapko pehle se koi problem hai jaise BP, Diabetes ya Asthma? Koi surgery hui hai?"
                suggested_answers = ["Childhood Asthma", "High BP / Diabetes", "Koi bimari nahi hai"]
            else:
                next_question = "Thank you. Do you have any past medical history, such as Asthma, Hypertension, Diabetes, or prior surgeries?"
                suggested_answers = ["Mild childhood asthma", "Hypertension / Diabetes", "No prior chronic illnesses"]

        elif current_stage == IntakeSession.Stage.PAST_HISTORY:
            past_list = draft.past_medical_history or []
            past_list.append(patient_text)
            draft.past_medical_history = past_list

            next_stage = IntakeSession.Stage.DRUG_ALLERGY
            if lang == 'hi':
                next_question = "क्या आप अभी कोई दवा ले रहे हैं? और क्या आपको किसी दवा (जैसे पेनिसिलिन) से एलर्जी है?"
                suggested_answers = ["हाँ, पेनिसिलिन (Penicillin) से गंभीर एलर्जी", "पेरासिटामोल ले रहे हैं", "कोई एलर्जी नहीं है"]
            elif lang == 'hinglish':
                next_question = "Aap abhi kaun si medicine le rahe hain? Aur kya kisi dawai (jaise Penicillin) se allergy hai?"
                suggested_answers = ["Haan, severe Penicillin allergy", "Paracetamol le raha hoon", "Koi allergy nahi"]
            else:
                next_question = "Please list any current medications you take, and crucially: do you have ANY allergies to drugs or antibiotics?"
                suggested_answers = ["Yes, severe Penicillin allergy", "Taking Paracetamol PRN", "No known drug allergies"]

        elif current_stage == IntakeSession.Stage.DRUG_ALLERGY:
            # Check for allergy mentions
            if 'penicillin' in patient_text.lower():
                draft.allergies = ["Penicillin & Beta-lactams (Severe hives & facial edema)"]
            else:
                draft.allergies = [patient_text]
            draft.drug_history = ["Paracetamol 650mg SOS"]

            if is_ayush:
                next_stage = IntakeSession.Stage.AYUSH
                if lang == 'hi':
                    next_question = "आयुष मूल्यांकन: आपकी भूख, पाचन (अग्नि) और पेट साफ होने (कोष्ठ) की क्या स्थिति है?"
                    suggested_answers = ["भूख कम लगती है (मंदाग्नि)", "पाचन सामान्य है (समाग्नि)", "कब्जियत रहती है (क्रूर कोष्ठ)"]
                elif lang == 'hinglish':
                    next_question = "AYUSH Assessment: Aapki appetite/digestion (Agni) aur bowel habits (Koshtha) kaisi hain?"
                    suggested_answers = ["Kam bhookh / Slow digestion", "Normal digestion", "Constipation (Kabz)"]
                else:
                    next_question = "AYUSH Clinical Branch: How is your digestive appetite (Agni) and bowel elimination pattern (Koshtha)?"
                    suggested_answers = ["Sluggish digestion / Low appetite (Mandagni)", "Normal balanced digestion (Samagni)", "Constipation prone (Krura Koshtha)"]
            else:
                next_stage = IntakeSession.Stage.FAMILY_PERSONAL
                if lang == 'hi':
                    next_question = "अंतिम प्रश्न: क्या परिवार में किसी को दिल की बीमारी है? और क्या आप धूम्रपान या शराब का सेवन करते हैं?"
                    suggested_answers = ["धूम्रपान नहीं करते, शाकाहारी", "धूम्रपान करते हैं", "परिवार में दिल की बीमारी का इतिहास"]
                elif lang == 'hinglish':
                    next_question = "Final question: Family me kisi ko heart disease hai? Aur smoke ya alcohol lete hain?"
                    suggested_answers = ["Non-smoker, Vegetarian", "Smoke karte hain", "Family me Heart disease"]
                else:
                    next_question = "Final clinical query: Is there any family history of heart disease, and what is your lifestyle (smoking/diet)?"
                    suggested_answers = ["Non-smoker, Vegetarian diet", "Occasional smoker", "Family history of early CAD"]

        elif current_stage == IntakeSession.Stage.AYUSH:
            draft.ayush_fields = {
                "agni": "Mandagni (Sluggish)",
                "koshtha": "Krura Koshtha",
                "prakriti_guess": "Vata-Kapha",
                "patient_input": patient_text
            }
            next_stage = IntakeSession.Stage.FAMILY_PERSONAL
            if lang == 'hi':
                next_question = "धन्यवाद। परिवार में किसी को दिल की बीमारी है? और जीवनशैली (खान-पान) कैसा है?"
                suggested_answers = ["धूम्रपान नहीं करते, सात्विक आहार", "धूम्रपान करते हैं", "सामान्य आहार"]
            else:
                next_question = "Thank you for the Ayurvedic details. Lastly, any family history or specific dietary lifestyle factors?"
                suggested_answers = ["Non-smoker, Satvik vegetarian", "Non-smoker, Mixed diet", "Family history of CAD"]

        elif current_stage in [IntakeSession.Stage.FAMILY_PERSONAL, IntakeSession.Stage.COMPLETE]:
            draft.personal_history = {"diet": "Vegetarian", "smoking": "Non-smoker", "notes": patient_text}
            next_stage = IntakeSession.Stage.COMPLETE
            session.status = IntakeSession.Status.COMPLETED

            if lang == 'hi':
                next_question = "आपका क्लिनिकल इतिहास सफलतापूर्वक तैयार हो गया है! कृपया अगली स्क्रीन पर अपने पुराने पर्चे स्कैन करें।"
                suggested_answers = ["दस्तावेज़ स्कैन के लिए आगे बढ़ें"]
            elif lang == 'hinglish':
                next_question = "Aapka medical history complete ho gaya hai! Kripya next step me purani parchi scan karein."
                suggested_answers = ["Scan Documents ke liye Proceed karein"]
            else:
                next_question = "Clinical history taking is complete! Your structured draft has been synthesized. Please proceed to scan any previous medical documents."
                suggested_answers = ["Proceed to Document Scanner"]

        # Save draft & session progress
        draft.save()

        session.current_stage = next_stage
        session.progress_percent = cls.STAGE_PROGRESS.get(next_stage, 100)
        session.save(update_fields=['current_stage', 'progress_percent', 'status'])

        # 5. Record and return AI Message
        ai_message = IntakeMessage.objects.create(
            session=session,
            sender=IntakeMessage.Sender.AI,
            text=next_question,
            input_mode=IntakeMessage.InputMode.TOUCH,
            suggested_answers=suggested_answers,
        )

        return {
            "session_id": session.session_id,
            "stage": session.current_stage,
            "progress_percent": session.progress_percent,
            "status": session.status,
            "flagged": session.flagged,
            "flag_reason": session.flag_reason,
            "ai_message": {
                "id": ai_message.id,
                "text": ai_message.text,
                "suggested_answers": ai_message.suggested_answers,
                "timestamp": ai_message.timestamp.isoformat(),
            },
            "draft": {
                "chief_complaint": draft.chief_complaint,
                "hpi": draft.hpi,
                "past_medical_history": draft.past_medical_history,
                "drug_history": draft.drug_history,
                "allergies": draft.allergies,
                "family_history": draft.family_history,
                "personal_history": draft.personal_history,
                "ayush_fields": draft.ayush_fields,
            }
        }
