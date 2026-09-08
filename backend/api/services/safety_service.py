"""
Clinical Safety & Allergy Conflict Cross-Check Service
Checks parsed medications against the authenticated patient's actual recorded allergies.
"""

import logging

logger = logging.getLogger(__name__)

ALLERGY_CLASSES = {
    'penicillin': [
        'amoxicillin', 'augmentin', 'ampicillin', 'piperacillin',
        'penicillin', 'cloxacillin', 'amoxiclav', 'ampiclox'
    ],
    'cephalosporin': [
        'cephalexin', 'cefuroxime', 'cefixime', 'ceftriaxone', 'cefpodoxime', 'cefaclor'
    ],
    'sulfa': [
        'sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'trimethoprim-sulfamethoxazole'
    ],
    'nsaid': [
        'ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'aceclofenac', 'combiflam', 'ketorolac'
    ],
    'aspirin': [
        'aspirin', 'acetylsalicylic acid', 'ecosprin', 'disprin'
    ]
}


class SafetyService:
    """Evaluates drug-allergy interactions for a patient."""

    def check_allergies(self, medications: list, patient_allergies: list) -> dict:
        """
        Cross-checks medications against patient's verified allergies.
        Returns {"has_warning": bool, "warning_message": str, "flagged_drugs": list}.
        """
        if not medications or not patient_allergies:
            return {
                "has_warning": False,
                "warning_message": "",
                "flagged_drugs": []
            }

        # Normalize patient allergies
        norm_allergies = [a.lower().strip() for a in patient_allergies if a]

        flagged_drugs = []
        warning_messages = []

        for med in medications:
            med_name = med.get('name', '') if isinstance(med, dict) else str(med)
            m_lower = med_name.lower().strip()

            for allergy in norm_allergies:
                # Direct match
                if allergy in m_lower or m_lower in allergy:
                    flagged_drugs.append(med_name)
                    warning_messages.append(
                        f"Prescribed medication '{med_name}' matches your recorded allergy to '{allergy}'."
                    )
                    continue

                # Drug class match
                for allergy_class, drug_list in ALLERGY_CLASSES.items():
                    if allergy_class in allergy:
                        if any(d in m_lower for d in drug_list):
                            flagged_drugs.append(med_name)
                            warning_messages.append(
                                f"Prescribed '{med_name}' belongs to the {allergy_class.title()} antibiotic class, but your health profile has a documented {allergy.upper()} allergy!"
                            )
                            break

        has_warning = len(flagged_drugs) > 0
        joined_msg = " | ".join(warning_messages) if warning_messages else ""

        return {
            "has_warning": has_warning,
            "warning_message": joined_msg,
            "flagged_drugs": flagged_drugs
        }

    def check_query_safety(self, text: str, patient_allergies: list = None, active_medications: list = None) -> dict:
        """
        Evaluates user input text for emergency red flags and documented allergy conflicts.
        Returns safety assessment dict.
        """
        lower = (text or "").lower()
        patient_allergies = patient_allergies or []
        norm_allergies = [a.lower().strip() for a in patient_allergies if a]

        # 1. Emergency Red-Flag Trigger
        emergency_triggers = [
            'chest pain', 'heart attack', 'shortness of breath', 'severe bleeding',
            'difficulty breathing', "can't breathe", 'cant breathe', 'stroke',
            'unconscious', 'collapsed', 'choking', 'suicide', 'blue lips',
            'anaphylaxis', 'passing out', 'loss of consciousness'
        ]
        
        for trigger in emergency_triggers:
            if trigger in lower:
                return {
                    "is_emergency": True,
                    "urgency": "critical",
                    "trigger": trigger,
                    "override_response": (
                        "🚨 CRITICAL EMERGENCY ALERT: The symptoms you described may require immediate medical attention!\n\n"
                        "• Please call emergency services (112 / 108 / 911) or alert nursing and emergency clinic staff right now.\n"
                        "• Sit in a supported position and do not attempt to walk or drive alone.\n"
                        "• Hospital staff can provide immediate clinical triage."
                    ),
                    "warning_message": f"Emergency red-flag symptom detected: '{trigger}'"
                }

        # 2. Allergy Conflict in Query
        flagged_allergy = []
        for allergy in norm_allergies:
            if allergy in lower:
                flagged_allergy.append(allergy)
                continue
            for a_class, drugs in ALLERGY_CLASSES.items():
                if a_class in allergy:
                    for d in drugs:
                        if d in lower:
                            flagged_allergy.append(f"{d} (belongs to {a_class.title()} class, matches your documented {allergy.upper()} allergy)")
                            break

        if flagged_allergy:
            return {
                "is_emergency": False,
                "urgency": "warning",
                "trigger": "allergy_conflict",
                "override_response": None,
                "warning_message": f"⚠️ Allergy Alert: User asked about medication/substance conflicting with recorded allergy: {'; '.join(flagged_allergy)}"
            }

        return {
            "is_emergency": False,
            "urgency": "normal",
            "trigger": None,
            "override_response": None,
            "warning_message": ""
        }
