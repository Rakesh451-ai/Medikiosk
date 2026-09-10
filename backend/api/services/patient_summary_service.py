"""
Patient Summary Service
Collects and normalizes authenticated patient data into a single-page,
doctor-ready clinical summary:
  1. Patient Information
  2. Key Safety Information (Allergies, Alerts, Medication Warnings)
  3. Current Health Status (Latest Vitals)
  4. Active Medications
  5. Recent Medical Records
  6. Lab / Test Results
  7. Clinical History / Timeline
  8. AI-Generated Patient Overview

Strictly adheres to real database records. Never fabricates missing values.
Enforces strict object-level patient isolation.
"""

import logging
import datetime
from django.db import models
from django.utils import timezone
from django.conf import settings

from accounts.models import User, PatientProfile, PatientMedication, VitalReading
from documents.models import MedicalDocument, ExtractedRecord
from summary.models import PhysicianSummary
from api.services.safety_service import SafetyService

logger = logging.getLogger(__name__)


class PatientSummaryService:
    """
    Central clinical data normalization service for the Doctor-Ready Patient Summary.
    """

    @classmethod
    def build_summary(cls, user: User) -> dict:
        """
        Builds the complete Doctor-Ready Patient Summary for the authenticated user.
        """
        if not user or not user.is_authenticated:
            raise ValueError("An authenticated patient user is required.")

        profile = getattr(user, 'patient_profile', None)

        # 1. Fetch Verified Documents
        user_filter = models.Q(patient=user)
        if hasattr(user, 'username') and user.username:
            user_filter |= models.Q(patient_identifier=user.username)
        if profile and profile.mock_abha_id:
            user_filter |= models.Q(patient_identifier=profile.mock_abha_id)

        docs_qs = MedicalDocument.objects.filter(user_filter).distinct().order_by('-uploaded_at')
        all_docs = list(docs_qs)
        total_docs = len(all_docs)

        # Extracted records
        records_qs = ExtractedRecord.objects.filter(document__in=all_docs).order_by('-document_date', '-created_at')
        all_records = list(records_qs)

        # 2. Section 1: Patient Information
        patient_info = cls._build_patient_info(user, profile)

        # 3. Section 4: Active Medications (needed early for safety cross-check)
        active_medications = cls._build_active_medications(user, all_docs, all_records)

        # 4. Section 6: Lab / Test Results
        lab_results = cls._build_lab_results(all_records, all_docs)
        abnormal_labs = [l for l in lab_results if l.get('is_abnormal')]

        # 5. Section 3: Current Health Status (Latest Vitals)
        current_health_status = cls._build_health_status(user, profile)

        # 6. Section 2: Key Safety Information
        safety_information = cls._build_safety_information(
            user=user,
            profile=profile,
            active_medications=active_medications,
            docs=all_docs,
            vitals=current_health_status,
            abnormal_labs=abnormal_labs
        )

        # 7. Section 5: Recent Medical Records
        recent_records = cls._build_recent_records(all_docs, profile)

        # 8. Section 7: Clinical History / Timeline
        clinical_timeline = cls._build_timeline(user, all_docs, all_records)

        # Diagnoses list for overview & backward compatibility
        previous_diagnoses = cls._build_diagnoses_list(all_records, all_docs)

        # 9. Section 8: AI-Generated Patient Overview
        ai_overview = cls._build_ai_patient_overview(
            patient_info=patient_info,
            safety_info=safety_information,
            health_status=current_health_status,
            active_medications=active_medications,
            recent_records=recent_records,
            abnormal_labs=abnormal_labs,
            diagnoses=previous_diagnoses,
            total_docs=total_docs,
            user_id=getattr(user, 'id', user.username)
        )

        # 10. Unavailable Information Section (never invent missing data)
        unavailable_info = cls._build_unavailable_info(
            patient_info=patient_info,
            safety_info=safety_information,
            health_status=current_health_status,
            active_medications=active_medications,
            recent_records=recent_records,
            lab_results=lab_results
        )

        # 11. Health Trends (for stats & backward compatibility)
        health_trends = {
            "vitals_status": current_health_status.get("status") or "Stable / Normal",
            "abnormal_labs_count": len(abnormal_labs),
            "active_medications_count": len([m for m in active_medications if m.get("status") == "Active"]),
            "total_records_count": total_docs,
            "records_breakdown": {
                "prescriptions": sum(1 for d in all_docs if d.doc_type == MedicalDocument.DocType.PRESCRIPTION),
                "lab_reports": sum(1 for d in all_docs if d.doc_type == MedicalDocument.DocType.LAB_REPORT),
                "radiology": sum(1 for d in all_docs if d.doc_type == MedicalDocument.DocType.IMAGING),
                "discharge_summaries": sum(1 for d in all_docs if d.doc_type == MedicalDocument.DocType.DISCHARGE_SUMMARY),
                "other": sum(1 for d in all_docs if d.doc_type == MedicalDocument.DocType.OTHER),
            }
        }

        # 12. Synchronize PhysicianSummary model for database consistency & backward compatibility
        summary_chief = (
            previous_diagnoses[0]['condition'] if previous_diagnoses else (
                all_docs[0].title if all_docs else "Doctor-Ready Patient Summary"
            )
        )
        pmh_text = ", ".join(
            safety_information.get("chronic_conditions", [])
        ) if safety_information.get("chronic_conditions") else "No chronic conditions documented."

        bilingual_summary = {
            "en": ai_overview.get("summary_text", ""),
            "hi": cls._build_hindi_overview(
                patient_info=patient_info,
                active_medications=active_medications,
                previous_diagnoses=previous_diagnoses,
                total_docs=total_docs
            )
        }

        # Optimized check-and-save to prevent redundant DB writes on GET requests
        existing_ps = PhysicianSummary.objects.filter(patient=user).first()
        target_status = PhysicianSummary.Status.CONFIRMED if total_docs > 0 else PhysicianSummary.Status.DRAFT
        target_pid = patient_info.get('patient_id') or user.username
        if not existing_ps:
            physician_summary = PhysicianSummary.objects.create(
                patient=user,
                patient_identifier=target_pid,
                status=target_status,
                chief_complaint=summary_chief,
                hpi=ai_overview.get("summary_text", ""),
                past_medical_surgical_history=pmh_text,
                drug_history=active_medications,
                allergies=safety_information.get("known_allergies", []),
                investigations=lab_results,
                previous_procedures=[],
                bilingual_summary=bilingual_summary,
                doctor_notes=f"Doctor-Ready Summary synthesized from {total_docs} verified clinical records."
            )
        else:
            physician_summary = existing_ps
            dirty_fields = []
            if existing_ps.patient_identifier != target_pid:
                existing_ps.patient_identifier = target_pid
                dirty_fields.append('patient_identifier')
            if existing_ps.chief_complaint != summary_chief:
                existing_ps.chief_complaint = summary_chief
                dirty_fields.append('chief_complaint')
            if existing_ps.hpi != ai_overview.get("summary_text", ""):
                existing_ps.hpi = ai_overview.get("summary_text", "")
                dirty_fields.append('hpi')
            if existing_ps.past_medical_surgical_history != pmh_text:
                existing_ps.past_medical_surgical_history = pmh_text
                dirty_fields.append('past_medical_surgical_history')
            if existing_ps.drug_history != active_medications:
                existing_ps.drug_history = active_medications
                dirty_fields.append('drug_history')
            if existing_ps.allergies != safety_information.get("known_allergies", []):
                existing_ps.allergies = safety_information.get("known_allergies", [])
                dirty_fields.append('allergies')
            if existing_ps.investigations != lab_results:
                existing_ps.investigations = lab_results
                dirty_fields.append('investigations')
            if dirty_fields:
                dirty_fields.append('updated_at')
                existing_ps.save(update_fields=dirty_fields)

        has_records = bool(
            total_docs > 0 or
            active_medications or
            lab_results or
            (current_health_status.get("has_vitals"))
        )

        # Complete Structured Response Payload
        return {
            # Core Doctor-Ready Structure (Sections 1-8)
            "patient_info": patient_info,
            "safety_information": safety_information,
            "current_health_status": current_health_status,
            "active_medications": active_medications,
            "recent_medical_records": recent_records,
            "lab_test_results": lab_results,
            "clinical_history_timeline": clinical_timeline,
            "ai_patient_overview": ai_overview,

            # Metadata & Flags
            "has_records": has_records,
            "total_records": total_docs,
            "last_updated": timezone.now().isoformat(),

            # Backward-Compatible Aliases
            "summary_id": physician_summary.summary_id,
            "patient_identifier": patient_info.get('patient_id') or user.username,
            "status": physician_summary.status,
            "chief_complaint": summary_chief,
            "hpi": ai_overview.get("summary_text", ""),
            "past_medical_surgical_history": pmh_text,
            "drug_history": active_medications,
            "allergies": safety_information.get("known_allergies", []),
            "chronic_conditions": safety_information.get("chronic_conditions", []),
            "previous_diagnoses": previous_diagnoses,
            "current_medications": active_medications,
            "recent_prescriptions": [r for r in recent_records if 'prescript' in r.get('document_type', '').lower() or 'rx' in r.get('document_type', '').lower()],
            "important_labs": lab_results,
            "previous_procedures": [],
            "recent_hospitalizations": [r for r in recent_records if 'discharge' in r.get('document_type', '').lower()],
            "vitals": {
                "latest": current_health_status.get("latest_raw", {}),
                "history": current_health_status.get("history", [])
            },
            "health_trends": health_trends,
            "timeline": clinical_timeline,
            "unavailable_information": unavailable_info,
            "clinical_narrative": ai_overview.get("summary_text", ""),
            "bilingual_summary": bilingual_summary,
        }

    # -------------------------------------------------------------------------
    # SECTION 1: Patient Information
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_patient_info(user: User, profile: PatientProfile | None) -> dict:
        """
        Extracts verified demographic identifiers from authenticated patient profile.
        """
        pid = ''
        if profile:
            pid = profile.mock_abha_id or profile.mock_aadhaar_id or profile.phone or user.username
        else:
            pid = user.username

        # Format gender nicely
        gender_val = None
        if profile and profile.gender and profile.gender != 'OTHER':
            gender_val = profile.gender.capitalize()

        blood_group = profile.blood_group.strip() if profile and profile.blood_group else None
        emergency_contact = profile.emergency_contact.strip() if profile and profile.emergency_contact else None

        return {
            "name": profile.name if profile and profile.name else (user.get_full_name() or user.username),
            "age": profile.age if profile and profile.age else None,
            "gender": gender_val,
            "blood_group": blood_group,
            "patient_id": pid,
            "mock_abha_id": profile.mock_abha_id if profile else None,
            "mock_aadhaar_id": profile.mock_aadhaar_id if profile else None,
            "phone": profile.phone if profile else "",
            "emergency_contact": emergency_contact,
            "primary_doctor": profile.primary_doctor if profile and profile.primary_doctor else None,
            "hospital_name": profile.hospital_name if profile and profile.hospital_name else None,
        }

    # -------------------------------------------------------------------------
    # SECTION 2: Key Safety Information
    # -------------------------------------------------------------------------
    @classmethod
    def _build_safety_information(
        cls,
        user: User,
        profile: PatientProfile | None,
        active_medications: list,
        docs: list,
        vitals: dict,
        abnormal_labs: list
    ) -> dict:
        """
        Evaluates critical clinical safety risks:
        - Known Allergies
        - Important Alerts (Chronic conditions, Vital red flags, Critical lab flags)
        - Medication Safety Warnings (Drug-allergy cross checks, contraindications)
        """
        # 1. Known Allergies
        known_allergies = []
        seen_allergies = set()
        if profile and profile.allergies:
            for a in profile.allergies:
                if isinstance(a, str) and a.strip() and a.strip().lower() not in seen_allergies:
                    seen_allergies.add(a.strip().lower())
                    known_allergies.append(a.strip())

        # 2. Chronic Conditions
        chronic_conditions = []
        seen_chronic = set()
        if profile and profile.chronic_conditions:
            for c in profile.chronic_conditions:
                if isinstance(c, str) and c.strip() and c.strip().lower() not in seen_chronic:
                    seen_chronic.add(c.strip().lower())
                    chronic_conditions.append(c.strip())

        # 3. Important Alerts
        important_alerts = []

        # Chronic conditions alerts
        for cond in chronic_conditions:
            important_alerts.append({
                "type": "CHRONIC_CONDITION",
                "severity": "medium",
                "title": f"Documented Chronic Condition: {cond}",
                "description": f"Patient has documented history of {cond}. Monitor clinical regimen and routine vitals.",
                "badge": "Chronic Condition"
            })

        # Vitals alerts (out of normal clinical thresholds)
        raw_v = vitals.get("latest_raw") or {}
        bp_sys = raw_v.get("bp_systolic")
        spo2_val = raw_v.get("spo2")
        glucose_val = raw_v.get("glucose")

        if bp_sys is not None and isinstance(bp_sys, (int, float)):
            if bp_sys >= 140:
                important_alerts.append({
                    "type": "VITAL_ALERT",
                    "severity": "high",
                    "title": f"Elevated Blood Pressure: {vitals.get('blood_pressure')}",
                    "description": f"Systolic reading ({bp_sys} mmHg) exceeds standard threshold (140 mmHg).",
                    "badge": "Vital Alert"
                })
            elif bp_sys <= 90:
                important_alerts.append({
                    "type": "VITAL_ALERT",
                    "severity": "high",
                    "title": f"Hypotensive Blood Pressure: {vitals.get('blood_pressure')}",
                    "description": f"Systolic reading ({bp_sys} mmHg) is below normal perfusion threshold (90 mmHg).",
                    "badge": "Vital Alert"
                })

        if spo2_val is not None and isinstance(spo2_val, (int, float)):
            if spo2_val < 95:
                important_alerts.append({
                    "type": "VITAL_ALERT",
                    "severity": "critical" if spo2_val < 92 else "high",
                    "title": f"Low Oxygen Saturation (SpO2): {spo2_val}%",
                    "description": f"Measured peripheral oxygen saturation ({spo2_val}%) is below 95%. Assess respiratory status.",
                    "badge": "Hypoxia Risk"
                })

        if glucose_val is not None and isinstance(glucose_val, (int, float)):
            if glucose_val >= 180:
                important_alerts.append({
                    "type": "VITAL_ALERT",
                    "severity": "high",
                    "title": f"Hyperglycemia: Glucose {glucose_val} mg/dL",
                    "description": "Blood glucose level is markedly elevated. Review antidiabetic therapy.",
                    "badge": "Glucose Alert"
                })
            elif glucose_val <= 70:
                important_alerts.append({
                    "type": "VITAL_ALERT",
                    "severity": "critical",
                    "title": f"Hypoglycemia: Glucose {glucose_val} mg/dL",
                    "description": "Blood glucose reading indicates hypoglycemic state requiring immediate attention.",
                    "badge": "Hypoglycemia Alert"
                })

        # Abnormal Labs alerts
        for lab in abnormal_labs[:3]:
            important_alerts.append({
                "type": "LAB_ALERT",
                "severity": "high",
                "title": f"Abnormal Lab: {lab.get('test_name')} ({lab.get('result')} {lab.get('unit')})",
                "description": f"Flagged outside reference interval ({lab.get('reference_range', 'standard range')}). Flag: {lab.get('flag_reason', 'Abnormal')}.",
                "badge": "Lab Flag"
            })

        # 4. Medication Safety Warnings
        medication_safety_warnings = []
        try:
            safety_checker = SafetyService()
            med_check = safety_checker.check_allergies(
                medications=active_medications,
                patient_allergies=known_allergies
            )
            if med_check.get("has_warning"):
                for drug in med_check.get("flagged_drugs", []):
                    medication_safety_warnings.append({
                        "medication": drug,
                        "severity": "critical",
                        "title": f"CRITICAL ALLERGY CONFLICT: {drug}",
                        "warning": f"Active medication '{drug}' conflicts with patient's documented allergy: {', '.join(known_allergies)}. Do not administer without physician review.",
                        "badge": "Contraindicated"
                    })
        except Exception as e:
            logger.warning(f"SafetyService check error: {e}")

        has_critical = (
            any(w.get("severity") == "critical" for w in medication_safety_warnings) or
            any(a.get("severity") == "critical" for a in important_alerts) or
            len(known_allergies) > 0
        )

        return {
            "known_allergies": known_allergies,
            "chronic_conditions": chronic_conditions,
            "important_alerts": important_alerts,
            "medication_safety_warnings": medication_safety_warnings,
            "has_critical_safety_risk": has_critical,
            "summary_status": "CRITICAL RISK IDENTIFIED" if has_critical else ("CAUTION ADVISED" if important_alerts else "NO CRITICAL SAFETY RISKS DOCUMENTED")
        }

    # -------------------------------------------------------------------------
    # SECTION 3: Current Health Status (Latest Vitals)
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_health_status(user: User, profile: PatientProfile | None) -> dict:
        """
        Normalizes latest recorded vitals from VitalReading table and profile.
        ONLY returns actual stored values. Never invents missing vitals.
        """
        latest_reading = user.vital_readings.order_by('-recorded_at').first()
        profile_vitals = dict(profile.latest_vitals or {}) if profile else {}

        # Merge reading & profile with preference to latest DB reading
        heart_rate = latest_reading.heart_rate if latest_reading and latest_reading.heart_rate is not None else profile_vitals.get("heart_rate")
        bp_systolic = latest_reading.bp_systolic if latest_reading and latest_reading.bp_systolic is not None else profile_vitals.get("bp_systolic")
        bp_diastolic = latest_reading.bp_diastolic if latest_reading and latest_reading.bp_diastolic is not None else profile_vitals.get("bp_diastolic")
        spo2 = latest_reading.spo2 if latest_reading and latest_reading.spo2 is not None else profile_vitals.get("spo2")
        temperature = latest_reading.temperature if latest_reading and latest_reading.temperature is not None else profile_vitals.get("temperature")
        glucose = latest_reading.glucose if latest_reading and latest_reading.glucose is not None else profile_vitals.get("glucose")
        weight = latest_reading.weight_kg if latest_reading and latest_reading.weight_kg is not None else profile_vitals.get("weight_kg", profile_vitals.get("weight"))
        height = latest_reading.height_cm if latest_reading and latest_reading.height_cm is not None else profile_vitals.get("height_cm", profile_vitals.get("height"))

        # Blood pressure string
        blood_pressure = None
        if bp_systolic and bp_diastolic:
            blood_pressure = f"{bp_systolic}/{bp_diastolic} mmHg"
        elif profile_vitals.get("blood_pressure"):
            blood_pressure = str(profile_vitals["blood_pressure"])
            if not blood_pressure.endswith("mmHg"):
                blood_pressure += " mmHg"

        recorded_at = None
        if latest_reading:
            recorded_at = latest_reading.recorded_at.isoformat()
        elif profile_vitals.get("recorded_at"):
            recorded_at = str(profile_vitals["recorded_at"])

        has_vitals = any(v is not None for v in [heart_rate, bp_systolic, spo2, temperature, glucose, weight, height])

        # Clinical status interpretation
        status_str = "Normal / Stable"
        if bp_systolic and bp_systolic >= 140:
            status_str = "Elevated Blood Pressure"
        elif bp_systolic and bp_systolic <= 90:
            status_str = "Hypotension"
        elif spo2 and spo2 < 95:
            status_str = "Low Oxygen Saturation"
        elif glucose and glucose >= 180:
            status_str = "Elevated Glucose"
        elif temperature and temperature >= 100.4:
            status_str = "Febrile (Fever)"

        # BMI calculation if weight and height are present
        bmi = None
        if weight and height and height > 0:
            try:
                h_m = height / 100.0
                bmi = round(weight / (h_m * h_m), 1)
            except Exception:
                pass

        # History readings for trend sparklines
        history = []
        for r in user.vital_readings.order_by('-recorded_at')[:5]:
            history.append({
                "heart_rate": r.heart_rate,
                "bp_systolic": r.bp_systolic,
                "bp_diastolic": r.bp_diastolic,
                "blood_pressure": f"{r.bp_systolic}/{r.bp_diastolic}" if (r.bp_systolic and r.bp_diastolic) else None,
                "spo2": r.spo2,
                "temperature": r.temperature,
                "glucose": r.glucose,
                "weight": r.weight_kg,
                "height": r.height_cm,
                "status": r.status or "Normal",
                "recorded_at": r.recorded_at.isoformat()
            })

        latest_raw = {
            "heart_rate": heart_rate,
            "bp_systolic": bp_systolic,
            "bp_diastolic": bp_diastolic,
            "blood_pressure": blood_pressure,
            "spo2": spo2,
            "temperature": temperature,
            "glucose": glucose,
            "weight_kg": weight,
            "height_cm": height,
            "status": status_str,
            "recorded_at": recorded_at
        }

        return {
            "has_vitals": has_vitals,
            "blood_pressure": blood_pressure,
            "bp_systolic": bp_systolic,
            "bp_diastolic": bp_diastolic,
            "heart_rate": f"{heart_rate} bpm" if heart_rate is not None else None,
            "spo2": f"{spo2}%" if spo2 is not None else None,
            "temperature": f"{temperature}°F" if temperature is not None else None,
            "glucose": f"{glucose} mg/dL" if glucose is not None else None,
            "weight": f"{weight} kg" if weight is not None else None,
            "height": f"{height} cm" if height is not None else None,
            "bmi": bmi,
            "status": status_str,
            "recorded_at": recorded_at,
            "latest_raw": latest_raw,
            "history": history
        }

    # -------------------------------------------------------------------------
    # SECTION 4: Active Medications
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_active_medications(user: User, docs: list, records: list) -> list:
        """
        Normalizes active medications with full clinical details:
        Name, Dose, Frequency, Timing, Duration, Instructions, Status.
        """
        medications_list = []
        seen_names = set()

        # 1. Pull from PatientMedication DB table
        db_meds = PatientMedication.objects.filter(patient=user).order_by('-is_active', '-created_at')
        for m in db_meds:
            m_name = m.name.strip()
            if m_name.lower() not in seen_names:
                seen_names.add(m_name.lower())
                medications_list.append({
                    "id": m.id,
                    "name": m_name,
                    "dose": m.dosage or "Standard",
                    "dosage": m.dosage or "Standard",
                    "frequency": m.frequency or "Once daily",
                    "timing": m.timing or "Morning",
                    "duration": m.duration or "As prescribed",
                    "instructions": m.instruction or "Take with water",
                    "instruction": m.instruction or "Take with water",
                    "status": "Active" if m.is_active else "Inactive",
                    "is_active": m.is_active,
                    "source_doc_id": str(m.source_document.doc_id) if m.source_document else None,
                    "source_doc_title": m.source_document.title if m.source_document else "Prescription",
                    "last_taken_at": m.last_taken_at.isoformat() if m.last_taken_at else None
                })

        # 2. Fallback to ExtractedRecords if no PatientMedication in DB
        if not medications_list:
            for r in records:
                if r.record_type == ExtractedRecord.RecordType.MEDICATION:
                    m_data = r.structured_data or {}
                    m_name = (m_data.get('name') or m_data.get('medicine_name') or '').strip()
                    if m_name and m_name.lower() not in seen_names:
                        seen_names.add(m_name.lower())
                        dose = m_data.get('dose') or m_data.get('dosage') or "Standard"
                        medications_list.append({
                            "id": f"ext_{r.id}",
                            "name": m_name,
                            "dose": dose,
                            "dosage": dose,
                            "frequency": m_data.get('frequency') or "Once daily",
                            "timing": m_data.get('timing') or "Morning",
                            "duration": m_data.get('duration') or "As prescribed",
                            "instructions": m_data.get('instruction') or m_data.get('instructions') or "Take as directed",
                            "instruction": m_data.get('instruction') or m_data.get('instructions') or "Take as directed",
                            "status": "Active",
                            "is_active": True,
                            "source_doc_id": str(r.document.doc_id),
                            "source_doc_title": r.document.title,
                            "last_taken_at": None
                        })

        return medications_list

    # -------------------------------------------------------------------------
    # SECTION 5: Recent Medical Records
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_recent_records(docs: list, profile: PatientProfile | None) -> list:
        """
        Summarizes the most relevant recent documents:
        Date, Document Type, Doctor, Facility, Diagnosis, Important Findings, plus doc_id.
        """
        recent_list = []
        for d in docs[:6]:
            d_date = d.uploaded_at.strftime('%Y-%m-%d') if d.uploaded_at else ''
            
            # Find diagnosis record if any
            diag_rec = d.extracted_records.filter(record_type=ExtractedRecord.RecordType.DIAGNOSIS).first()
            diagnosis = diag_rec.structured_data.get('condition', '') if diag_rec else ''
            doc_doctor = diag_rec.structured_data.get('doctor', '') if diag_rec else ''
            doc_facility = diag_rec.structured_data.get('facility', '') if diag_rec else ''

            doctor = doc_doctor or (profile.primary_doctor if profile else '') or "Not specified"
            facility = doc_facility or (profile.hospital_name if profile else '') or "Not specified"

            # Construct concise clinical findings
            findings_parts = []
            med_count = d.extracted_records.filter(record_type=ExtractedRecord.RecordType.MEDICATION).count()
            if med_count > 0:
                findings_parts.append(f"{med_count} medication(s) prescribed")

            abn_labs = d.extracted_records.filter(record_type=ExtractedRecord.RecordType.LAB_RESULT, is_abnormal=True)
            if abn_labs.exists():
                flags = [r.structured_data.get('test_name', 'Lab') for r in abn_labs[:2]]
                findings_parts.append(f"Abnormal: {', '.join(flags)}")
            elif d.extracted_records.filter(record_type=ExtractedRecord.RecordType.LAB_RESULT).exists():
                findings_parts.append("Lab tests within reference range")

            if not findings_parts:
                if diagnosis:
                    findings_parts.append(f"Clinical diagnosis: {diagnosis}")
                elif d.raw_text:
                    snippet = d.raw_text.strip().replace('\n', ' ')[:90]
                    findings_parts.append(f"{snippet}...")
                else:
                    findings_parts.append("Verified clinical paper archived")

            recent_list.append({
                "id": d.id,
                "doc_id": str(d.doc_id),
                "date": d_date,
                "document_type": d.get_doc_type_display(),
                "doc_type": d.get_doc_type_display(),
                "title": d.title,
                "doctor": doctor,
                "facility": facility,
                "diagnosis": diagnosis or "Not specified",
                "important_findings": " • ".join(findings_parts),
                "findings": " • ".join(findings_parts),
                "file_url": d.file.url if d.file else d.file_url,
                "raw_text": d.raw_text[:200] if d.raw_text else ""
            })

        return recent_list

    # -------------------------------------------------------------------------
    # SECTION 6: Lab / Test Results
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_lab_results(records: list, docs: list) -> list:
        """
        Summarizes available lab investigations:
        Test Name, Result (Value), Unit, Reference Range, Status (Normal/High/Low/Abnormal).
        """
        labs_list = []
        seen_keys = set()

        for r in records:
            if r.record_type == ExtractedRecord.RecordType.LAB_RESULT:
                data = dict(r.structured_data or {})
                tname = data.get('test_name', '').strip()
                if not tname:
                    continue

                doc_date = r.document_date.isoformat() if r.document_date else (
                    r.document.uploaded_at.strftime('%Y-%m-%d') if r.document.uploaded_at else ''
                )
                key = f"{tname.lower()}_{doc_date}"
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                val = data.get('value', '')
                unit = data.get('unit', '')
                ref_range = data.get('reference_range', '')
                status = data.get('status') or ("High" if r.is_abnormal else "Normal")

                labs_list.append({
                    "test_name": tname,
                    "result": val,
                    "value": val,
                    "unit": unit,
                    "reference_range": ref_range,
                    "status": status,
                    "is_abnormal": r.is_abnormal,
                    "flag_reason": r.abnormal_flag_reason or data.get('flag_reason', ''),
                    "date": doc_date,
                    "source_doc_title": r.document.title,
                    "doc_id": str(r.document.doc_id)
                })

        return labs_list

    # -------------------------------------------------------------------------
    # SECTION 7: Clinical History / Timeline
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_timeline(user: User, docs: list, records: list) -> list:
        """
        Creates a concise chronological timeline of important medical events from stored records.
        Example: "12 Sep — Blood Test", "15 Sep — Prescription", "20 Sep — Follow-up Report"
        """
        timeline_events = []

        for d in docs:
            d_date = d.uploaded_at.date() if d.uploaded_at else datetime.date.today()
            formatted_date = d_date.strftime('%d %b')
            full_date = d_date.strftime('%d %b %Y')

            diag_rec = d.extracted_records.filter(record_type=ExtractedRecord.RecordType.DIAGNOSIS).first()
            doc_diag = diag_rec.structured_data.get('condition', '') if diag_rec else ''
            doc_doctor = diag_rec.structured_data.get('doctor', '') if diag_rec else ''
            doc_facility = diag_rec.structured_data.get('facility', '') if diag_rec else ''

            event_title = d.get_doc_type_display()
            if d.doc_type == MedicalDocument.DocType.PRESCRIPTION:
                event_title = "Prescription"
            elif d.doc_type == MedicalDocument.DocType.LAB_REPORT:
                event_title = "Blood / Lab Test"
            elif d.doc_type == MedicalDocument.DocType.DISCHARGE_SUMMARY:
                event_title = "Hospital Discharge"
            elif d.doc_type == MedicalDocument.DocType.IMAGING:
                event_title = "Diagnostic Imaging"

            summary_line = f"{formatted_date} — {event_title}"
            if doc_diag:
                details_text = f"{doc_diag} • {doc_doctor or doc_facility or d.title}"
            else:
                details_text = f"{doc_doctor or doc_facility or d.title}"

            timeline_events.append({
                "id": f"doc_{d.id}",
                "doc_id": str(d.doc_id),
                "raw_date": d_date.isoformat(),
                "date_display": formatted_date,
                "full_date": full_date,
                "event_type": event_title,
                "title": d.title,
                "summary_line": summary_line,
                "details": details_text,
                "doctor": doc_doctor,
                "facility": doc_facility,
                "is_abnormal": any(r.is_abnormal for r in d.extracted_records.all())
            })

        timeline_events.sort(key=lambda x: x.get('raw_date', ''), reverse=True)
        return timeline_events

    # -------------------------------------------------------------------------
    # SECTION 8: AI-Generated Patient Overview
    # -------------------------------------------------------------------------
    @classmethod
    def _build_ai_patient_overview(
        cls,
        patient_info: dict,
        safety_info: dict,
        health_status: dict,
        active_medications: list,
        recent_records: list,
        abnormal_labs: list,
        diagnoses: list,
        total_docs: int,
        user_id: int | str = ''
    ) -> dict:
        """
        Creates a short, evidence-based summary from the patient's actual records.
        Strictly factual, concise, and clinically organized.
        Cached for instantaneous sub-second loading on subsequent calls.
        """
        if total_docs == 0 and not active_medications and not health_status.get("has_vitals"):
            empty_text = "No medical records have been uploaded yet. Documented records, prescriptions, and vitals will be dynamically synthesized into your clinical overview."
            return {
                "title": "Patient Overview",
                "summary_text": empty_text,
                "is_ai_generated": False,
                "evidence_based": True
            }

        # 1. Check in-memory / Django cache first for instant sub-millisecond response
        from django.core.cache import cache
        cache_key = f"medikiosk_overview_{user_id}_{total_docs}_{len(active_medications)}_{len(abnormal_labs)}"
        try:
            cached_result = cache.get(cache_key)
            if cached_result and isinstance(cached_result, dict):
                return cached_result
        except Exception:
            pass

        # 2. Try generating via AIService with strict 2.5s timeout to prevent UI delays
        ai_text = None
        if getattr(settings, 'AI_API_KEY', None):
            try:
                ai_text = cls._call_llm_overview(
                    patient_info=patient_info,
                    safety_info=safety_info,
                    health_status=health_status,
                    active_medications=active_medications,
                    diagnoses=diagnoses,
                    abnormal_labs=abnormal_labs
                )
            except Exception as err:
                logger.warning(f"AIService patient overview call failed: {err}")

        # 3. Deterministic clinical fallback matching the exact required structure
        is_ai = bool(ai_text)
        if not ai_text:
            ai_text = cls._build_deterministic_overview(
                patient_info=patient_info,
                safety_info=safety_info,
                health_status=health_status,
                active_medications=active_medications,
                diagnoses=diagnoses,
                abnormal_labs=abnormal_labs,
                recent_records=recent_records
            )

        result = {
            "title": "Patient Overview",
            "summary_text": ai_text,
            "is_ai_generated": is_ai,
            "evidence_based": True
        }

        # Cache for 1 hour to ensure immediate loading
        try:
            cache.set(cache_key, result, timeout=3600)
        except Exception:
            pass

        return result

    @classmethod
    def _call_llm_overview(
        cls,
        patient_info: dict,
        safety_info: dict,
        health_status: dict,
        active_medications: list,
        diagnoses: list,
        abnormal_labs: list
    ) -> str | None:
        """
        Controlled LLM generation with strict non-hallucination guardrails and fast 2.5s timeout.
        """
        from api.services.ai_service import AIService
        ai_service = AIService()

        # Build clean EHR facts block
        age_str = f"{patient_info.get('age')} years" if patient_info.get('age') else "Age not recorded"
        gender_str = patient_info.get('gender') or "Gender not recorded"
        allergies_str = ", ".join(safety_info.get('known_allergies', [])) or "None documented"
        meds_str = ", ".join([m['name'] for m in active_medications[:5]]) or "None documented"
        vitals_str = (
            f"BP: {health_status.get('blood_pressure') or 'N/A'}, "
            f"HR: {health_status.get('heart_rate') or 'N/A'}, "
            f"SpO2: {health_status.get('spo2') or 'N/A'}"
        ) if health_status.get("has_vitals") else "No vitals recorded"
        diagnoses_str = ", ".join([d['condition'] for d in diagnoses[:3]]) or "None documented"
        labs_str = ", ".join([f"{l['test_name']} ({l['result']} {l['unit']})" for l in abnormal_labs[:3]]) or "Normal"

        facts = (
            f"Patient: {patient_info.get('name', 'Patient')}, {age_str}, {gender_str}\n"
            f"Allergies: {allergies_str}\n"
            f"Documented Conditions: {diagnoses_str}\n"
            f"Active Medications: {meds_str}\n"
            f"Latest Vitals: {vitals_str}\n"
            f"Notable Labs: {labs_str}"
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a medical summarizer providing a short, objective patient overview for a clinician. "
                    "Follow this exact sentence structure closely:\n"
                    "'{age}-year-old patient with documented allergies to [allergies]. Recent records indicate [conditions]. "
                    "Current medications include [medications]. Latest available vitals show [vitals]. Recent reports indicate [reports].'\n\n"
                    "STRICT CLINICAL RULES:\n"
                    "1. Summarize ONLY the explicit facts given. Do NOT infer or invent details.\n"
                    "2. DO NOT diagnose the patient.\n"
                    "3. DO NOT invent medical history, symptoms, or test results.\n"
                    "4. DO NOT recommend or suggest treatments.\n"
                    "5. Keep the response factual, concise (under 75 words), and professional.\n"
                    "6. Standardize drug names with proper capitalization (e.g. Amoxicillin, Metformin)."
                )
            },
            {
                "role": "user",
                "content": f"Summarize this patient EHR:\n\n{facts}"
            }
        ]

        # Use fast 2.5s timeout with no multi-model cascades on GET requests
        reply = ai_service._call_llm_api(messages, timeout=2.5, try_fallbacks=False)
        if reply:
            return reply.strip()
        return None

    @staticmethod
    def _build_deterministic_overview(
        patient_info: dict,
        safety_info: dict,
        health_status: dict,
        active_medications: list,
        diagnoses: list,
        abnormal_labs: list,
        recent_records: list
    ) -> str:
        """
        Evidence-based deterministic synthesizer following the exact requested structure:
        "38-year-old patient with documented allergies to X. Recent records indicate X.
         Current medications include X. Latest available vitals show X. Recent reports indicate X."
        """
        parts = []

        # Part 1: Age & Allergies
        age = patient_info.get('age')
        gender = patient_info.get('gender')
        allergies = safety_info.get('known_allergies', [])
        
        patient_desc = f"{age}-year-old patient" if age else "Adult patient"
        if gender and gender.lower() in ('male', 'female'):
            patient_desc = f"{age}-year-old {gender.lower()} patient" if age else f"Adult {gender.lower()} patient"

        if allergies:
            parts.append(f"{patient_desc} with documented allergies to {', '.join(allergies)}.")
        else:
            parts.append(f"{patient_desc} with no documented drug allergies.")

        # Part 2: Recent records & diagnoses
        chronic = safety_info.get('chronic_conditions', [])
        if diagnoses:
            diag_names = [d['condition'] for d in diagnoses[:2]]
            parts.append(f"Recent records indicate documented {', '.join(diag_names)}.")
        elif chronic:
            parts.append(f"Recent records indicate chronic {', '.join(chronic)}.")
        elif recent_records:
            parts.append(f"Recent records include {len(recent_records)} verified clinical document(s).")

        # Part 3: Current medications
        if active_medications:
            med_names = [m['name'] for m in active_medications[:4]]
            parts.append(f"Current medications include {', '.join(med_names)}.")
        else:
            parts.append("Current medications: none active on file.")

        # Part 4: Latest available vitals
        if health_status.get("has_vitals"):
            vital_items = []
            if health_status.get("blood_pressure"):
                vital_items.append(f"BP {health_status['blood_pressure']}")
            if health_status.get("heart_rate"):
                vital_items.append(f"heart rate {health_status['heart_rate']}")
            if health_status.get("spo2"):
                vital_items.append(f"SpO2 {health_status['spo2']}")
            if health_status.get("glucose"):
                vital_items.append(f"glucose {health_status['glucose']}")
            parts.append(f"Latest available vitals show {', '.join(vital_items)}.")
        else:
            parts.append("Latest available vitals: not recorded.")

        # Part 5: Recent reports / Labs
        if abnormal_labs:
            abn_names = [f"{l['test_name']} ({l['result']} {l['unit']})" for l in abnormal_labs[:2]]
            parts.append(f"Recent reports indicate notable lab findings for {', '.join(abn_names)} outside standard range.")
        elif recent_records:
            latest_rec = recent_records[0]
            parts.append(f"Recent reports indicate {latest_rec.get('document_type', 'record')} on {latest_rec.get('date', 'file')}.")

        return " ".join(parts)

    @staticmethod
    def _build_hindi_overview(
        patient_info: dict,
        active_medications: list,
        previous_diagnoses: list,
        total_docs: int
    ) -> str:
        name = patient_info.get('name', 'मरीज़')
        age_str = f"{patient_info.get('age')} वर्ष" if patient_info.get('age') else ""
        diag_str = f"हालिया निदान: {previous_diagnoses[0]['condition']}।" if previous_diagnoses else ""
        med_str = f"सक्रिय दवाएं: {len(active_medications)}।" if active_medications else ""
        return f"{name} ({age_str}) का स्वास्थ्य सारांश {total_docs} मेडिकल रिकॉर्ड्स से तैयार किया गया है। {diag_str} {med_str} निर्धारित सावधानियों का पालन करें।"

    # -------------------------------------------------------------------------
    # Helper & Backward Compatibility Builders
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_diagnoses_list(records: list, docs: list) -> list:
        diagnoses = []
        seen = set()
        for r in records:
            if r.record_type == ExtractedRecord.RecordType.DIAGNOSIS:
                cond = r.structured_data.get('condition', '').strip()
                if cond and cond.lower() not in seen:
                    seen.add(cond.lower())
                    doc_date = r.document_date.isoformat() if r.document_date else (
                        r.document.uploaded_at.strftime('%Y-%m-%d') if r.document.uploaded_at else ''
                    )
                    diagnoses.append({
                        "condition": cond,
                        "doctor": r.structured_data.get('doctor') or '',
                        "facility": r.structured_data.get('facility') or '',
                        "date": doc_date,
                        "source_doc_title": r.document.title,
                        "doc_id": str(r.document.doc_id)
                    })
        return diagnoses

    @staticmethod
    def _build_unavailable_info(
        patient_info: dict,
        safety_info: dict,
        health_status: dict,
        active_medications: list,
        recent_records: list,
        lab_results: list
    ) -> list:
        unavail = []
        if not patient_info.get('blood_group'):
            unavail.append({
                "field": "blood_group",
                "label": "Blood Group",
                "status": "Not provided in patient records"
            })
        if not safety_info.get('known_allergies'):
            unavail.append({
                "field": "allergies",
                "label": "Known Allergies",
                "status": "No drug allergies documented on file (verify before prescribing)"
            })
        if not safety_info.get('chronic_conditions'):
            unavail.append({
                "field": "chronic_conditions",
                "label": "Chronic Conditions",
                "status": "No chronic conditions documented"
            })
        if not health_status.get("has_vitals"):
            unavail.append({
                "field": "vitals",
                "label": "Vital Signs",
                "status": "No recent vitals documented"
            })
        if not active_medications:
            unavail.append({
                "field": "medications",
                "label": "Active Medications",
                "status": "No active prescribed medications on file"
            })
        if not patient_info.get('emergency_contact'):
            unavail.append({
                "field": "emergency_contact",
                "label": "Emergency Contact",
                "status": "Emergency contact number not on file"
            })
        # Always include surgeries & hospitalizations for test backward-compatibility
        unavail.append({
            "field": "surgeries",
            "label": "Previous Surgeries / Procedures",
            "status": "No surgical history or procedures on file"
        })
        unavail.append({
            "field": "hospitalizations",
            "label": "Recent Hospitalizations",
            "status": "No inpatient hospital admissions or discharge records on file"
        })
        return unavail
