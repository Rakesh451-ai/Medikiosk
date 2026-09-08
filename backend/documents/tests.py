import datetime
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from documents.models import MedicalDocument, ExtractedRecord
from documents.ocr_engine import check_abnormal_lab, parse_and_store_entities

User = get_user_model()

class ModuleBDocumentsEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='MK-78294', password='password123')
        self.client.force_authenticate(user=self.user)

    def test_reference_range_lookup(self):
        # Normal hemoglobin (14.0)
        is_abn, reason = check_abnormal_lab('Hemoglobin', 14.0)
        self.assertFalse(is_abn)

        # Low hemoglobin (9.5) -> abnormal
        is_abn_low, reason_low = check_abnormal_lab('Hemoglobin', 9.5)
        self.assertTrue(is_abn_low)
        self.assertIn('Low', reason_low)

        # High glucose (190) -> abnormal
        is_abn_high, reason_high = check_abnormal_lab('Glucose', 190.0)
        self.assertTrue(is_abn_high)
        self.assertIn('High', reason_high)

    def test_document_upload_and_extraction(self):
        url = reverse('document-upload')
        payload = {
            'patient_id': 'MK-78294',
            'doc_type': 'prescription',
            'title': 'Prior Clinic Prescription'
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('document_id', response.data)

        doc = MedicalDocument.objects.get(doc_id=response.data['document_id'])
        from documents.tasks import process_document_ocr_task
        process_document_ocr_task(doc.doc_id)
        doc.refresh_from_db()
        self.assertEqual(doc.ocr_status, MedicalDocument.OCRStatus.COMPLETED)
        self.assertGreaterEqual(doc.extracted_records.count(), 1)

        # Verify abnormal lab result was flagged
        abn_record = doc.extracted_records.filter(is_abnormal=True).first()
        self.assertIsNotNone(abn_record)
        self.assertTrue(abn_record.is_abnormal)

    def test_document_status_and_plain_summary(self):
        doc = MedicalDocument.objects.create(
            doc_id='doc-test-101',
            patient_identifier='MK-78294',
            title='Lab CBC Report',
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=doc,
            record_type=ExtractedRecord.RecordType.MEDICATION,
            structured_data={'name': 'Metformin 500mg', 'frequency': '1 BD'},
            document_date=datetime.date(2025, 3, 10),
            is_abnormal=False
        )
        ExtractedRecord.objects.create(
            document=doc,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={'test_name': 'Hemoglobin', 'value': 10.5, 'unit': 'g/dL'},
            document_date=datetime.date(2025, 3, 10),
            is_abnormal=True,
            abnormal_flag_reason='Low'
        )

        url = reverse('document-status', kwargs={'doc_id': 'doc-test-101'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('plain_language_summary', response.data)
        self.assertIn('Metformin', response.data['plain_language_summary'])

    def test_patient_document_timeline(self):
        timeline_user = User.objects.create_user(username='MK-TIMELINE-PT', password='password123')
        self.client.force_authenticate(user=timeline_user)

        doc = MedicalDocument.objects.create(
            doc_id='doc-timeline-01',
            patient_identifier='MK-TIMELINE-PT',
            title='Prescription',
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=doc,
            record_type=ExtractedRecord.RecordType.MEDICATION,
            structured_data={'name': 'Amoxicillin 500mg'},
            document_date=datetime.date(2026, 9, 1),
            is_abnormal=False
        )

        url = reverse('document-timeline', kwargs={'patient_id': 'MK-TIMELINE-PT'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_documents'], 1)
        self.assertEqual(len(response.data['timeline']), 1)
