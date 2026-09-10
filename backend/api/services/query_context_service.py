"""
Query Context Service for MediKiosk AI Health Assistant
Classifies user queries into:
1. 'general': General health, medical education, symptoms, wellness, nutrition, sleep.
              Patient EHR data is NOT injected into AI context to preserve privacy.
2. 'personal': Patient-specific records, active medications, recorded vitals, test reports, allergies.
              Grounded strictly in verified patient EHR data.
3. 'mixed': Asks both for general medical education and personal comparison with chart records.
            AI explains the general concept first, then compares with patient's actual stored data.
"""

import re
from typing import Dict, Any, Optional


class QueryContextService:
    """Classifies user queries to govern sensitive patient EHR context injection."""

    # Explicit personal record terms (English & Hindi/Hinglish)
    PERSONAL_RECORD_PATTERNS = [
        # Explicit possessives tied to clinical records
        r'\b(?:my|mine|our)\s+(?:medicines?|medications?|meds?|pills?|tablets?|doses?|dosages?|prescriptions?|vitals?|readings?|bp|blood\s+pressure|heart\s+rate|pulse|spo2|oxygen|sugar|glucose|temperature|tests?|reports?|results?|labs?|doctor|physician|allerg(?:y|ies)|charts?|records?|files?|diagnos(?:is|es)|conditions?|history)\b',
        # Inquiries about what medications the patient is currently taking
        r'\b(?:what\s+medicines?|what\s+meds?|what\s+pills?|what\s+tablets?|what\s+drugs?)\s+(?:am\s+i|do\s+i)\s+(?:taking|on|prescribed)\b',
        r'\b(?:when\s+should\s+i\s+take|when\s+to\s+take|how\s+to\s+take|should\s+i\s+take)\s+my\b',
        r'\b(?:did\s+i\s+take|have\s+i\s+taken)\s+my\b',
        # Inquiries about patient's specific recorded vitals or reports
        r'\b(?:are\s+my|is\s+my)\s+(?:vitals?|bp|blood\s+pressure|heart\s+rate|pulse|spo2|sugar|temperature|reading|report|test)\b',
        r'\b(?:explain|review|summarize|read|check)\s+my\s+(?:latest\s+)?(?:reports?|tests?|results?|vitals?|prescriptions?|records?|chart)\b',
        r'\b(?:what\s+does\s+my\s+(?:latest\s+)?(?:report|test|result|chart)\s+say)\b',
        # Questions asking if the patient has a documented allergy or condition in chart
        r'\b(?:am\s+i\s+allergic|do\s+i\s+have\s+(?:any\s+)?allerg(?:y|ies)|is\s+it\s+safe\s+with\s+my\s+allerg(?:y|ies))\b',
        r'\b(?:can\s+i\s+take|is\s+it\s+safe\s+for\s+me\s+to\s+take)\s+([a-zA-Z0-9\s]+)\s+with\s+my\b',
        # Mixed comparison markers: "and is mine high?", "and do I have it?"
        r'\b(?:and\s+do\s+i\s+have\s+(?:it|this)|do\s+i\s+have\s+(?:it|this)|and\s+is\s+mine\b|is\s+mine\s+(?:high|low|normal|ok|okay|elevated))\b',
        # Hindi / Hinglish possessive patterns
        r'\b(?:mera|meri|mere|hamara|hamari)\s+(?:dawa|dawai|dawaiya|dawaiyan|goli|goliya|goliyan|khurak|prescription|vital|vitals|bp|blood\s+pressure|sugar|heart\s+rate|dhadkan|spo2|pulse|report|reports|test|tests|doctor|allergy|allergies|bimari|chart|record)\b',
        r'\b(?:meri\s+dawai|mera\s+bp|meri\s+report|mere\s+vitals|mera\s+sugar|meri\s+sugar|meri\s+goli)\b',
        r'\b(?:kya\s+main\s+ye\s+le\s+sakta|kya\s+mujhe\s+ye\s+dawa|kya\s+meri\s+report|meri\s+report\s+mein\s+kya\s+hai)\b',
        r'\b(?:mujhe\s+kaunsi\s+dawai\s+leni\s+hai|meri\s+dawai\s+kab\s+leni\s+hai)\b',
        r'\b(?:kya\s+mera\s+bp\s+(?:theek|normal|high|sahi)\s+hai|kya\s+mujhe\s+ye\s+hai)\b',
    ]

    # General concept / educational patterns
    GENERAL_CONCEPT_PATTERNS = [
        r'\b(?:what\s+is|what\s+are|what\s+does\s+.*\s+mean|define|meaning\s+of)\b',
        r'\b(?:explain\s+(?:diabetes|hypertension|dehydration|fever|flu|asthma|blood\s+pressure|cholesterol|bmi|anemia|migraine))\b',
        r'\b(?:explain\s+(?:it\s+)?in\s+simple\s+(?:words|terms)|explain\s+it\s+simply)\b',
        r'\b(?:difference\s+between\s+.*\s+and\s+.*)\b',
        r'\b(?:what\s+causes|causes\s+of|why\s+does\s+.*\s+happen)\b',
        r'\b(?:signs\s+of|symptoms\s+of)\b',
        r'\b(?:how\s+to\s+improve|tips\s+for|guidance\s+on|advice\s+for)\s+(?:diet|sleep|nutrition|exercise|health|digestion|immunity)\b',
        r'\b(?:what\s+should\s+i\s+(?:eat|drink|do)\s+for)\s+(?:a\s+)?(?:mild\s+)?(?:cold|headache|cough|fever|dehydration|better\s+sleep|healthy\s+diet)\b',
        r'\b(?:normal\s+(?:sleep\s+duration|heart\s+rate|bp|blood\s+pressure|body\s+temperature|blood\s+sugar\s+range))\b',
        # Hindi / Hinglish general education patterns
        r'\b(?:kya\s+hota\s+hai|kya\s+hai|kyon\s+hota\s+hai|kyun\s+hota\s+hai)\b',
        r'\b(?:ke\s+lakshan|ke\s+karan|ke\s+upay|kaise\s+theek\s+karein|ke\s+fayde)\b',
        r'\b(?:dehydration|diabetes|hypertension|blood\s+pressure|fever|flu|neend|aahar)\s+(?:kya\s+hai|kya\s+hota\s+hai)\b',
        r'\b(?:bukhar\s+aur\s+flu\s+mein\s+kya\s+antar\s+hai)\b',
        r'\b(?:swasth\s+aahar|achhi\s+neend|neend\s+ke\s+upay)\b',
    ]

    # Quick start general prompts
    GENERAL_PROMPT_TITLES = {
        "ask a health question",
        "explain a medical term",
        "healthy diet tips",
        "sleep advice",
        "exercise guidance",
        "common symptoms",
        "signs of dehydration",
        "explain diabetes in simple words",
        "what is high blood pressure?",
        "what is dehydration?",
        "what is diabetes?",
    }

    @classmethod
    def determine_context(
        cls,
        user_text: str,
        patient_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Determines the query mode: 'general', 'personal', or 'mixed'.
        """
        raw_text = (user_text or "").strip()
        q = raw_text.lower()

        # Check for matching quick start generic titles
        clean_prompt = re.sub(r'^[^\w\s]+', '', q).strip()
        if clean_prompt in cls.GENERAL_PROMPT_TITLES:
            return {
                "type": "general",
                "reason": "matches standard general health quick-start topic",
                "requires_patient_data": False
            }

        # Check for personal record references
        has_personal_marker = False
        personal_matched_pattern = ""
        for pat in cls.PERSONAL_RECORD_PATTERNS:
            if re.search(pat, q, re.IGNORECASE):
                has_personal_marker = True
                personal_matched_pattern = pat
                break

        # Check for general educational inquiry
        has_general_marker = False
        for pat in cls.GENERAL_CONCEPT_PATTERNS:
            if re.search(pat, q, re.IGNORECASE):
                has_general_marker = True
                break

        # Check for explicit mixed questions
        # Example: "What is high blood pressure, and is my BP high?"
        # Example: "What is diabetes, and do I have it?"
        # Example: "Explain HbA1c and what was my value?"
        is_mixed = False
        if has_personal_marker and has_general_marker:
            # Contains both concept definition and personal inquiry
            is_mixed = True
        elif has_personal_marker and re.search(r'\b(?:what\s+is|what\s+are|define|meaning\s+of|kya\s+hota\s+hai)\b', q):
            is_mixed = True
        elif has_general_marker and re.search(r'\b(?:and\s+is\s+my|and\s+my|is\s+mine|aur\s+mera|aur\s+meri|compared\s+to\s+mine)\b', q):
            is_mixed = True

        if is_mixed:
            return {
                "type": "mixed",
                "reason": "asks for general concept definition alongside personal chart comparison",
                "requires_patient_data": True
            }

        if has_personal_marker:
            return {
                "type": "personal",
                "reason": f"references personal medical records or chart ({personal_matched_pattern})",
                "requires_patient_data": True
            }

        # Default is general health education
        return {
            "type": "general",
            "reason": "general health question or educational inquiry",
            "requires_patient_data": False
        }
