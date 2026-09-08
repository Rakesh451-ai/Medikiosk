import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.management import call_command
from accounts.models import PatientProfile, DoctorProfile, TriageStaffProfile
from intake.models import IntakeSession, ConversationTurn
from documents.models import MedicalDocument
from summary.models import ClinicalSummary
from consent.models import ConsentArtifact
from triage.models import TriageAlert

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial demonstration data for MediKiosk (Patient, Doctor, Intake, Documents, Summary, Consent, Triage)'

    def handle(self, *args, **options):
        self.stdout.write("Running full MediKiosk database seed...")

        # Run accounts seed first
        call_command('seed_accounts')

        patient_user = User.objects.get(username='sarah_jenkins')
        doc_user = User.objects.get(username='dr_sharma')

        # 3. Intake Session & Conversation Turns (Module A)
        session, _ = IntakeSession.objects.update_or_create(
            session_id='intake-session-001',
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'chief_complaint': 'Severe productive cough, low-grade fever, and mild shortness of breath for 5 days',
                'language': 'en',
                'mode': 'HYBRID',
                'status': 'COMPLETED',
            }
        )

        ConversationTurn.objects.filter(session=session).delete()
        turns = [
            ("AI", "Namaste and welcome to MediKiosk. What health problem brings you to the hospital today?", {"intent": "GREETING_INTAKE"}),
            ("PATIENT", "I have had a bad cough for the last 5 days, and since yesterday I've got fever and feel a bit breathless when climbing stairs.", {"symptoms": ["cough", "fever", "dyspnea"], "duration": "5 days"}),
            ("AI", "I understand. Is your cough dry or producing sputum (phlegm)? Any chest pain or wheezing?", {"intent": "SYMPTOM_CLARIFICATION"}),
            ("PATIENT", "It is bringing up greenish-yellow phlegm. No chest pain, but I feel tightness.", {"symptom_detail": "productive_cough_purulent", "sputum": "greenish-yellow"}),
            ("AI", "Thank you. Do you have any known medical conditions or allergies to medicines?", {"intent": "ALLERGY_HISTORY_CHECK"}),
            ("PATIENT", "Yes, I am severely allergic to Penicillin. I broke out in severe hives and facial swelling once.", {"allergy": "Penicillin", "reaction": "hives, facial swelling, anaphylaxis risk"}),
        ]
        for speaker, text, entities in turns:
            ConversationTurn.objects.create(
                session=session,
                sender=speaker.lower(),
                text=text,
                extracted_entities=entities
            )

        # 4. Scanned Medical Document with OCR (Module B)
        MedicalDocument.objects.update_or_create(
            doc_id='DOC-SCAN-8891',
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'session': session,
                'title': 'City Clinic Prior Prescription (Dr. Mehta)',
                'file_url': '/media/documents/sample_rx_8891.pdf',
                'doc_type': 'prescription',
                'ocr_status': 'completed',
                'celery_task_id': 'celery-ocr-mock-uuid-8891',
                'raw_text': "CITY CLINIC HEALTHCARE\nPatient: Sarah Jenkins | Age: 38F\nRx:\n1. Tab Augmentin 625mg (Amoxicillin + Clavulanate) - 1 tab TDS x 5 days\n2. Tab Paracetamol 650mg - SOS fever\n3. Syp Ascoril-D 10ml TDS",
            }
        )

        # 5. Clinical Summary (Module C)
        ClinicalSummary.objects.update_or_create(
            summary_id='summary-001',
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'session': session,
                'status': 'CONFIRMED',
                'chief_complaint': "Productive cough with purulent greenish sputum x 5 days, intermittent fever up to 101.4 F, exertional shortness of breath",
                'hpi': (
                    "Patient is a 38-year-old female presenting with 5 days of worsening productive cough "
                    "with greenish-yellow phlegm. Reports low-grade to moderate fever (101.4 F) managed with OTC paracetamol. "
                    "Noticed shortness of breath upon mild exertion over the last 24 hours. "
                    "Was prescribed Augmentin 625mg at another clinic yesterday but has NOT started taking it yet."
                ),
                'past_medical_surgical_history': "Mild childhood bronchial asthma (inactive). No hypertension or diabetes mellitus.",
                'drug_history': [
                    {"name": "Paracetamol 650mg", "dosage": "1 tab PRN", "adherence": "Occasional"},
                    {"name": "Prescribed Augmentin 625mg", "status": "HOLD / CONTRAINDICATED (Penicillin class)"}
                ],
                'allergies': [
                    {"substance": "Penicillin & Beta-lactams", "reaction": "Severe urticaria & facial edema (anaphylactoid)", "severity": "CRITICAL"}
                ],
            }
        )

        # 6. Red-Flag Triage Alert (Triage App)
        TriageAlert.objects.update_or_create(
            alert_id='alert-001',
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'session': session,
                'severity': 'CRITICAL',
                'trigger_reason': 'Prescribed Augmentin (Amoxicillin) with documented PENICILLIN ANAPHYLAXIS allergy.',
                'reason': 'Scanned prescription contains Amoxicillin+Clavulanate. Patient reported severe allergic hives and facial swelling to Penicillin during intake.',
                'vitals_snapshot': {
                    "pulse": "104 bpm",
                    "spo2": "95%",
                    "temp": "101.2 F"
                },
                'is_resolved': False,
            }
        )

        # 7. Consent Artifact & Mock ABDM/FHIR (Module D)
        mock_fhir = {
            "resourceType": "Bundle",
            "type": "document",
            "timestamp": timezone.now().isoformat(),
            "entry": [
                {
                    "resource": {
                        "resourceType": "Composition",
                        "id": "comp-mk-001",
                        "status": "preliminary",
                        "type": {"coding": [{"system": "http://loinc.org", "code": "34117-2", "display": "Outpatient Consultation Note"}]},
                        "subject": {"reference": "Patient/MK-78294", "display": "Sarah Jenkins"},
                        "author": [{"reference": "Practitioner/DOC-1049", "display": "Dr. Rajesh Sharma"}]
                    }
                },
                {
                    "resource": {
                        "resourceType": "Patient",
                        "id": "MK-78294",
                        "name": [{"use": "official", "text": "Sarah Jenkins"}],
                        "gender": "female",
                        "birthDate": "1988-04-12"
                    }
                },
                {
                    "resource": {
                        "resourceType": "AllergyIntolerance",
                        "clinicalStatus": {"coding": [{"code": "active"}]},
                        "verificationStatus": {"coding": [{"code": "confirmed"}]},
                        "criticality": "high",
                        "code": {"text": "Penicillin"},
                        "patient": {"reference": "Patient/MK-78294"}
                    }
                }
            ]
        }

        ConsentArtifact.objects.update_or_create(
            consent_id='consent-001',
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'purpose': 'share_hospital',
                'granted': True,
                'hip_id': 'IN-HOSP-001',
                'hiu_id': 'IN-HIU-MEDIKIOSK',
                'mock_fhir_bundle': mock_fhir,
            }
        )

        self.stdout.write(self.style.SUCCESS("✓ Successfully seeded complete MediKiosk database!"))
