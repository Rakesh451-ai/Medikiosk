"""
Patient Context Builder for MediKiosk AI Health Assistant
Assembles verified EHR data (vitals, medications, allergies, documents)
for a patient into structured context for the AI reasoning engine.
"""

from typing import Dict, Any, List


class PatientContextBuilder:
    """Extracts and formats verified patient EHR records into AI context."""

    @staticmethod
    def build_context(user) -> Dict[str, Any]:
        """
        Builds a comprehensive dictionary of patient clinical data.
        Guarantees strict patient isolation by only pulling data related to `user`.
        """
        profile = getattr(user, 'patient_profile', None)
        
        # 1. Demographics & Identification
        patient_name = profile.name if profile else (user.get_full_name() or user.username)
        age = profile.age if profile else None
        gender = profile.gender if profile else "Not specified"
        blood_group = profile.blood_group if profile else "Not recorded"
        primary_doctor = profile.primary_doctor if profile else "Attending Physician"
        hospital_name = profile.hospital_name if profile else "MediKiosk Health Network"
        
        # 2. Allergies & Chronic Conditions
        allergies = profile.allergies if (profile and profile.allergies) else []
        chronic_conditions = profile.chronic_conditions if (profile and profile.chronic_conditions) else []

        # 3. Active Prescriptions
        meds = list(user.medications.filter(is_active=True).order_by('-created_at')[:10])
        medications_list = []
        for m in meds:
            medications_list.append({
                "id": m.id,
                "name": m.name,
                "dosage": m.dosage,
                "frequency": m.frequency,
                "timing": m.timing,
                "duration": m.duration,
                "instruction": m.instruction,
                "last_taken_at": m.last_taken_at.isoformat() if m.last_taken_at else None
            })

        # 4. Latest Vitals & Trend History
        latest_vitals = profile.latest_vitals if (profile and profile.latest_vitals) else {}
        recent_readings = list(user.vital_readings.all().order_by('-recorded_at')[:5])
        vitals_history = []
        for r in recent_readings:
            vitals_history.append({
                "recorded_at": r.recorded_at.strftime("%Y-%m-%d %H:%M"),
                "heart_rate": r.heart_rate,
                "bp_systolic": r.bp_systolic,
                "bp_diastolic": r.bp_diastolic,
                "spo2": r.spo2,
                "temperature": r.temperature,
                "glucose": r.glucose,
                "status": r.status
            })

        # 5. Verified Medical Documents & OCR findings
        documents = list(user.patient_documents.all().order_by('-uploaded_at')[:5])
        documents_list = []
        for doc in documents:
            documents_list.append({
                "id": doc.id,
                "title": doc.title,
                "doc_type": getattr(doc, 'doc_type', 'Medical Document'),
                "uploaded_at": doc.uploaded_at.strftime("%Y-%m-%d"),
                "summary": (getattr(doc, 'raw_text', '')[:250] if getattr(doc, 'raw_text', None) else "")
            })

        return {
            "patient_id": user.username,
            "name": patient_name,
            "age": age,
            "gender": gender,
            "blood_group": blood_group,
            "primary_doctor": primary_doctor,
            "hospital_name": hospital_name,
            "allergies": allergies,
            "chronic_conditions": chronic_conditions,
            "medications": medications_list,
            "latest_vitals": latest_vitals,
            "vitals_history": vitals_history,
            "documents": documents_list,
        }

    @staticmethod
    def format_system_prompt_context(context: Dict[str, Any]) -> str:
        """
        Formats patient context into clear text for the LLM system prompt.
        """
        lines = [
            "PATIENT EHR RECORD:",
            f"- Name: {context.get('name')}",
            f"- Age: {context.get('age') or 'Not recorded'} | Gender: {context.get('gender')} | Blood Group: {context.get('blood_group')}",
            f"- Primary Doctor: {context.get('primary_doctor')} | Facility: {context.get('hospital_name')}",
        ]

        # Allergies
        allergies = context.get('allergies', [])
        if allergies:
            lines.append(f"- Known Drug/Environmental Allergies: {', '.join(allergies)} (CRITICAL: Never recommend or approve medications conflicting with these)")
        else:
            lines.append("- Known Allergies: None recorded")

        # Chronic conditions
        chronic = context.get('chronic_conditions', [])
        if chronic:
            lines.append(f"- Chronic Conditions: {', '.join(chronic)}")

        # Active Medications
        meds = context.get('medications', [])
        if meds:
            lines.append("- Active Medications:")
            for m in meds:
                lines.append(f"  • {m['name']} ({m['dosage']}) - {m['frequency']} ({m['timing']}). Notes: {m['instruction']}")
        else:
            lines.append("- Active Medications: None currently on file")

        # Latest Vitals
        vitals = context.get('latest_vitals', {})
        if vitals and any(vitals.values()):
            v_parts = []
            if vitals.get('heart_rate'):
                v_parts.append(f"Heart Rate: {vitals['heart_rate']} bpm")
            if vitals.get('blood_pressure'):
                v_parts.append(f"Blood Pressure: {vitals['blood_pressure']}")
            elif vitals.get('bp_systolic'):
                v_parts.append(f"BP: {vitals['bp_systolic']}/{vitals.get('bp_diastolic', 80)} mmHg")
            if vitals.get('spo2'):
                v_parts.append(f"SpO2: {vitals['spo2']}%")
            if vitals.get('temperature'):
                v_parts.append(f"Temp: {vitals['temperature']} °F")
            if vitals.get('glucose'):
                v_parts.append(f"Blood Sugar: {vitals['glucose']} mg/dL")
            lines.append(f"- Latest Vitals: {', '.join(v_parts) if v_parts else 'None'}")
        else:
            lines.append("- Latest Vitals: No recent vital measurements recorded")

        # Recent Vitals History
        history = context.get('vitals_history', [])
        if history:
            lines.append("- Recent Vital Trends:")
            for h in history[:3]:
                lines.append(f"  • {h['recorded_at']}: HR {h.get('heart_rate') or '—'}, BP {h.get('bp_systolic') or '—'}/{h.get('bp_diastolic') or '—'}, SpO2 {h.get('spo2') or '—'}%")

        # Medical Documents
        docs = context.get('documents', [])
        if docs:
            lines.append("- Medical Documents On File:")
            for d in docs:
                lines.append(f"  • {d['title']} ({d.get('doc_type', 'Document')}, {d['uploaded_at']}): {d['summary']}")
        else:
            lines.append("- Medical Documents On File: No documents uploaded yet")

        return "\n".join(lines)
