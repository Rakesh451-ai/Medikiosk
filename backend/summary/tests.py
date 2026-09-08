from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from intake.models import IntakeSession, ClinicalHistoryDraft
from documents.models import MedicalDocument, ExtractedRecord
from summary.models import PhysicianSummary, SummaryRevision

User = get_user_model()

class ModuleCSummaryEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.doctor = User.objects.create_user(username='dr_sharma', password='password123', role=User.Role.DOCTOR)
        self.client.force_authenticate(user=self.doctor)

        # 1. Setup Intake Session & Draft
        self.session = IntakeSession.objects.create(
            patient_identifier='MK-78294',
            department='General Medicine',
            language='en'
        )
        self.draft = ClinicalHistoryDraft.objects.create(
            session=self.session,
            chief_complaint='Severe cough and fever x 5 days',
            hpi={'duration': '5 days', 'character': 'productive'},
            allergies=['Penicillin (Severe)'],
            past_medical_history=['Childhood Asthma']
        )

        # 2. Setup Document & Extracted Record
        self.doc = MedicalDocument.objects.create(
            doc_id='doc-test-rx-01',
            patient_identifier='MK-78294',
            title='Prescription',
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=self.doc,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={'test_name': 'WBC', 'value': 14200.0, 'unit': '/mcL'},
            is_abnormal=True,
            abnormal_flag_reason='Leukocytosis'
        )

    def test_generate_clinical_summary_endpoint(self):
        url = reverse('summary-generate-session', kwargs={'session_id': self.session.session_id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], PhysicianSummary.Status.DRAFT)
        self.assertIn('Severe cough', response.data['chief_complaint'])
        self.assertIn('bilingual_summary', response.data)
        self.assertIn('hi', response.data['bilingual_summary'])

        # Check DB
        summary = PhysicianSummary.objects.get(summary_id=response.data['summary_id'])
        self.assertEqual(summary.status, PhysicianSummary.Status.DRAFT)
        # Verify abnormal investigation captured
        self.assertTrue(any(inv.get('is_abnormal') for inv in summary.investigations))

    def test_doctor_amend_and_confirm_with_audit_log(self):
        summary = PhysicianSummary.objects.create(
            session=self.session,
            patient_identifier='MK-78294',
            status=PhysicianSummary.Status.DRAFT,
            chief_complaint='Original cough',
            hpi='Original HPI'
        )

        url = reverse('summary-detail', kwargs={'summary_id': summary.summary_id})
        payload = {
            'hpi': 'Amended by Dr. Sharma: Patient exhibits bilateral rhonchi on auscultation.',
            'doctor_notes': 'Prescribe Azithromycin. Discontinue beta-lactams.',
            'status': PhysicianSummary.Status.CONFIRMED,
            'revision_notes': 'Confirmed post-examination'
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], PhysicianSummary.Status.CONFIRMED)

        # Verify audit revision created
        summary.refresh_from_db()
        self.assertEqual(summary.status, PhysicianSummary.Status.CONFIRMED)
        self.assertIsNotNone(summary.confirmed_at)
        self.assertEqual(summary.revisions.count(), 1)
        self.assertIn('hpi', summary.revisions.first().changes)
