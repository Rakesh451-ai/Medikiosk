import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.models import PatientProfile, DoctorProfile, TriageStaffProfile
from intake.models import IntakeSession, IntakeMessage, ClinicalHistoryDraft
from documents.models import MedicalDocument, ExtractedRecord
from summary.models import PhysicianSummary, SummaryRevision
from triage.models import TriageAlert
from consent.models import ConsentRecord
from consent.abdm_service import MockABDMService

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates one full example patient journey end-to-end for SIH Judges (Registration -> Conversation -> 2 Documents -> Summary -> Doctor Review)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== [MediKiosk] Seeding End-to-End Demo Journey for SIH Judges ==="))

        # Step 1: Patient & Doctor Registration
        doc_user, _ = User.objects.get_or_create(
            username='dr_sharma',
            defaults={
                'email': 'dr.sharma@medikiosk.health',
                'first_name': 'Rajesh',
                'last_name': 'Sharma',
                'role': User.Role.DOCTOR,
                'is_staff': True
            }
        )
        doc_user.set_password('DoctorPass123!')
        doc_user.save()
        DoctorProfile.objects.update_or_create(
            user=doc_user,
            defaults={
                'name': 'Rajesh Sharma',
                'department': 'General Medicine',
                'specialization': 'Consultant Physician',
                'room_number': 'OPD Room 3'
            }
        )

        patient_user, _ = User.objects.get_or_create(
            username='sarah_jenkins',
            defaults={
                'email': 'sarah.jenkins@example.com',
                'first_name': 'Sarah',
                'last_name': 'Jenkins',
                'role': User.Role.PATIENT
            }
        )
        patient_user.set_password('PatientPass123!')
        patient_user.save()
        PatientProfile.objects.update_or_create(
            user=patient_user,
            defaults={
                'name': 'Sarah Jenkins',
                'age': 38,
                'gender': PatientProfile.Gender.FEMALE,
                'phone': '9123456780',
                'preferred_language': 'en',
                'mock_abha_id': '14-8921-3490-1284'
            }
        )
        self.stdout.write(self.style.SUCCESS("✓ Step 1: Patient Sarah Jenkins registered (ABHA: 14-8921-3490-1284)."))

        # Step 2: Granular Consent Granted
        purposes = [
            ConsentRecord.Purpose.SHARE_HOSPITAL,
            ConsentRecord.Purpose.STORE_DOCUMENTS,
            ConsentRecord.Purpose.LINK_ABHA,
            ConsentRecord.Purpose.AI_TRANSCRIPTION
        ]
        for p in purposes:
            ConsentRecord.objects.update_or_create(
                patient_identifier='MK-78294',
                purpose=p,
                defaults={'granted': True, 'patient': patient_user}
            )
        self.stdout.write(self.style.SUCCESS("✓ Step 2: 4 Granular ABDM Consent Records granted."))

        # Step 3: Conversational Intake (Module A)
        session, _ = IntakeSession.objects.update_or_create(
            session_id='intake-demo-sih-001',
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'department': 'General Medicine',
                'doctor': doc_user,
                'language': 'en',
                'status': IntakeSession.Status.COMPLETED,
                'current_stage': IntakeSession.Stage.COMPLETE,
                'progress_percent': 100,
                'flagged': True,
                'flag_reason': 'Allergy Contraindication Alert: Severe Penicillin anaphylactoid reaction reported.'
            }
        )
        draft, _ = ClinicalHistoryDraft.objects.update_or_create(
            session=session,
            defaults={
                'chief_complaint': 'Severe productive cough with purulent green sputum, low-grade fever, and exertional breathlessness for 5 days',
                'hpi': {
                    'site': 'Chest and lower respiratory tract',
                    'onset': '5 days ago, worsening progressively',
                    'character': 'Productive purulent cough with thick greenish-yellow phlegm',
                    'radiation': 'No radiation to jaw/back',
                    'associations': ['Intermittent fever (101.2 F)', 'Mild dyspnea on stair climbing'],
                    'severity': '7/10 distress'
                },
                'past_medical_history': ['Childhood bronchial asthma (inactive since age 14)'],
                'drug_history': [{'name': 'Paracetamol 650mg', 'frequency': 'PRN for fever'}],
                'allergies': ['PENICILLIN & BETA-LACTAMS (Severe urticaria, lip swelling & anaphylaxis risk)'],
                'family_history': ['Father had hypertension; no premature CAD'],
                'personal_history': {'diet': 'Vegetarian', 'smoking': 'Non-smoker', 'alcohol': 'None'},
                'ayush_fields': {'agni': 'Mandagni', 'koshtha': 'Krura Koshtha', 'prakriti': 'Vata-Pitta'}
            }
        )
        self.stdout.write(self.style.SUCCESS("✓ Step 3: Conversational Intake session completed (SOCRATES + Allergy history)."))

        # Step 4: Two Uploaded Sample Documents (Module B)
        doc1, _ = MedicalDocument.objects.update_or_create(
            doc_id='DOC-SCAN-8891',
            defaults={
                'session': session,
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'title': 'City Clinic Prior Prescription (Dr. Mehta)',
                'doc_type': MedicalDocument.DocType.PRESCRIPTION,
                'ocr_status': MedicalDocument.OCRStatus.COMPLETED,
                'raw_text': (
                    "CITY CLINIC HEALTHCARE\nPatient: Sarah Jenkins | Age: 38F\n"
                    "Rx:\n1. Tab Augmentin 625mg (Amoxicillin + Clavulanate) - 1 tab TDS x 5 days\n"
                    "2. Tab Paracetamol 650mg - SOS fever\n3. Syp Ascoril-D 10ml TDS"
                )
            }
        )
        doc1.extracted_records.all().delete()
        ExtractedRecord.objects.create(
            document=doc1,
            record_type=ExtractedRecord.RecordType.MEDICATION,
            structured_data={
                "name": "Augmentin 625mg (Amoxicillin+Clav)",
                "frequency": "1 TDS x 5d",
                "alert": "CONTRAINDICATED: Patient Penicillin Allergic!"
            },
            document_date=datetime.date(2026, 9, 4),
            is_abnormal=True,
            abnormal_flag_reason="CONTRAINDICATED: Penicillin Class Allergy"
        )
        ExtractedRecord.objects.create(
            document=doc1,
            record_type=ExtractedRecord.RecordType.MEDICATION,
            structured_data={"name": "Paracetamol 650mg", "frequency": "SOS"},
            document_date=datetime.date(2026, 9, 4),
            is_abnormal=False
        )

        doc2, _ = MedicalDocument.objects.update_or_create(
            doc_id='DOC-LAB-4412',
            defaults={
                'session': session,
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'title': 'Complete Blood Count (CBC) - Apex Pathology',
                'doc_type': MedicalDocument.DocType.LAB_REPORT,
                'ocr_status': MedicalDocument.OCRStatus.COMPLETED,
                'raw_text': "APEX PATHOLOGY LAB\nHemoglobin: 10.8 g/dL (Low)\nWBC Count: 13,400 /mcL (High)\nPlatelets: 240,000 /mcL (Normal)"
            }
        )
        doc2.extracted_records.all().delete()
        ExtractedRecord.objects.create(
            document=doc2,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={"test_name": "Hemoglobin", "value": 10.8, "unit": "g/dL", "reference_range": "12.0 - 17.5 g/dL"},
            document_date=datetime.date(2026, 9, 3),
            is_abnormal=True,
            abnormal_flag_reason="Low (< 12.0 g/dL)"
        )
        ExtractedRecord.objects.create(
            document=doc2,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={"test_name": "WBC Count", "value": 13400.0, "unit": "/mcL", "reference_range": "4,000 - 11,000 /mcL"},
            document_date=datetime.date(2026, 9, 3),
            is_abnormal=True,
            abnormal_flag_reason="High (> 11,000 /mcL - Leukocytosis)"
        )
        ExtractedRecord.objects.create(
            document=doc2,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={"test_name": "Platelets", "value": 240000.0, "unit": "/mcL", "reference_range": "150,000 - 450,000 /mcL"},
            document_date=datetime.date(2026, 9, 3),
            is_abnormal=False
        )
        self.stdout.write(self.style.SUCCESS("✓ Step 4: 2 Sample Documents OCR-processed with abnormal lab flags."))

        # Step 5: Clinical Summary (Module C)
        summary, _ = PhysicianSummary.objects.update_or_create(
            session=session,
            defaults={
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'status': PhysicianSummary.Status.DRAFT,
                'chief_complaint': draft.chief_complaint,
                'hpi': "Patient is a 38-year-old female presenting with a 5-day history of worsening cough productive of thick greenish-yellow phlegm. Associated with fever (101.2 F) and mild exertional dyspnea when climbing stairs.",
                'past_medical_surgical_history': "Childhood asthma (inactive). No past surgeries.",
                'drug_history': [
                    {"name": "Augmentin 625mg", "flag": "CONTRAINDICATION: Active Penicillin allergy"},
                    {"name": "Paracetamol 650mg", "flag": "Safe"}
                ],
                'allergies': ["PENICILLIN & BETA-LACTAMS (Anaphylactoid Hives / Edema)"],
                'family_history': "Father: Essential Hypertension.",
                'personal_history': "Vegetarian, Non-smoker, Denies alcohol.",
                'review_of_systems': "Respiratory: Cough (+), Purulent Sputum (+), Dyspnea (+). CVS: Tachycardia (HR: 104 bpm), Chest pain (-).",
                'investigations': [
                    {"test_name": "Hemoglobin", "value": 10.8, "unit": "g/dL", "is_abnormal": True, "abnormal_flag_reason": "Low"},
                    {"test_name": "WBC Count", "value": 13400.0, "unit": "/mcL", "is_abnormal": True, "abnormal_flag_reason": "High (Leukocytosis)"},
                    {"test_name": "Platelets", "value": 240000.0, "unit": "/mcL", "is_abnormal": False}
                ],
                'previous_procedures': [],
                'regional_language': 'hi',
                'bilingual_summary': {
                    "hi": {
                        "chief_complaint": "बलगम वाली खांसी, बुखार और सांस लेने में तकलीफ (5 दिन से)",
                        "hpi": "मरीज़ को 5 दिनों से गाढ़ा बलगम और बुखार आ रहा है। सीढ़ियां चढ़ने पर सांस फूलती है।",
                        "allergies": "पेनिसिलिन से गंभीर एलर्जी (अर्टिकेरिया और सूजन का खतरा)"
                    }
                },
                'doctor_notes': 'Awaiting auscultation. Action: Discontinue Augmentin immediately. Switch to Azithromycin.'
            }
        )
        self.stdout.write(self.style.SUCCESS("✓ Step 5: Structured PhysicianSummary generated with bilingual translation."))

        # Step 6: Critical Triage Red-Flag Alert
        TriageAlert.objects.update_or_create(
            alert_id='alert-demo-sih-001',
            defaults={
                'session': session,
                'patient': patient_user,
                'patient_identifier': 'MK-78294',
                'severity': TriageAlert.Severity.CRITICAL,
                'status': TriageAlert.Status.OPEN,
                'reason': 'Prescribed Augmentin (Amoxicillin) with documented PENICILLIN ANAPHYLAXIS allergy, accompanied by Leukocytosis (WBC 13,400) and Tachycardia (104 bpm).',
                'trigger_reason': 'Prescribed Augmentin (Amoxicillin) with documented PENICILLIN ANAPHYLAXIS allergy.',
                'vitals_snapshot': {
                    "pulse": "104 bpm",
                    "spo2": "95%",
                    "temp": "101.2 F",
                    "wbc": "13,400 /mcL"
                },
                'is_resolved': False
            }
        )
        self.stdout.write(self.style.SUCCESS("✓ Step 6: Critical TriageAlert created and queued at top of OPD screen."))

        self.stdout.write(self.style.MIGRATE_LABEL("\n=== DEMO JOURNEY SEED COMPLETE ==="))
        self.stdout.write("• Kiosk View: /kiosk -> Ready to review token or run fresh check-in")
        self.stdout.write("• Doctor View: /doctor (Login: dr_sharma / DoctorPass123!)")
        self.stdout.write("• Triage View: /doctor -> Active Red-Flag alert for Sarah Jenkins highlighted at top.")
