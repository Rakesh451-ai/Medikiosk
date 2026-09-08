import io
import datetime
from PIL import Image
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from documents.models import MedicalDocument, ExtractedRecord
from accounts.models import PatientProfile, PatientMedication
from api.services.medical_parser import MedicalParser
from api.services.ocr_service import OCRService
from api.services.document_service import DocumentService

User = get_user_model()


class DocumentPipelineAndPersistenceTests(TestCase):
    """
    Validates end-to-end bug fixes:
    1. Real PDF parsing & entity extraction without dummy pills or fake doctors.
    2. Image validation, client-assisted OCR, and structured entity extraction.
    3. User persistence across restart / clean_demo_users execution.
    4. Database committing of real medications only.
    """

    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            username='persisted_patient_01',
            email='persisted@example.health',
            password='SecurePassword123!',
            role=User.Role.PATIENT
        )
        self.profile = PatientProfile.objects.create(
            user=self.patient_user,
            name='Persisted Patient',
            age=34,
            allergies=['Penicillin']
        )
        self.client.force_authenticate(user=self.patient_user)

    def test_medical_parser_extracts_real_fields_without_fake_defaults(self):
        parser = MedicalParser()
        clinical_text = (
            "CITY MULTISPECIALITY CLINIC\n"
            "Consultant: Dr. Rajesh Sharma, MBBS MD\n"
            "Date: 2026-09-08\n"
            "Patient: John Doe | Age: 42M\n"
            "Diagnosis: Type 2 Diabetes Mellitus with Hypertension\n"
            "Rx:\n"
            "1. Tab Metformin 500mg - 1 tab BD x 30 days (Take after meals)\n"
            "2. Tab Telmisartan 40mg - 1 tab OD x 30 days (Morning)\n"
            "Labs:\n"
            "HbA1c: 7.8 %\n"
            "Fasting Blood Sugar: 148 mg/dL\n"
            "Impression: Glycemic control suboptimal. Continue diet control."
        )

        res = parser.parse(clinical_text)
        self.assertEqual(res['doctor'], 'Dr. Rajesh Sharma')
        self.assertEqual(res['facility'], 'CITY MULTISPECIALITY CLINIC')
        self.assertEqual(res['doc_type'], 'Prescription')
        self.assertIn('Diabetes', res['diagnosis'])
        self.assertEqual(len(res['medications']), 2)

        med_names = [m['name'] for m in res['medications']]
        self.assertIn('Metformin', med_names)
        self.assertIn('Telmisartan', med_names)

        # Check labs
        self.assertEqual(len(res['lab_results']), 2)
        hba1c = next(l for l in res['lab_results'] if 'hba1c' in l['test_name'].lower())
        self.assertEqual(hba1c['value'], 7.8)
        self.assertTrue(hba1c['is_abnormal'])

    def test_medical_parser_zero_fake_defaults_when_empty(self):
        parser = MedicalParser()
        res = parser.parse("General fitness certificate. Patient is physically active and fit.")
        self.assertEqual(res['medications'], [])
        self.assertEqual(res['lab_results'], [])
        self.assertEqual(res['doctor'], '')
        self.assertEqual(res['facility'], '')

    def test_scan_api_with_client_assisted_ocr_and_save(self):
        """Tests image scanning with OCR transcript via /documents/scan/ and /documents/confirm/."""
        # Create a valid minimal PNG image
        img_buffer = io.BytesIO()
        img = Image.new('RGB', (100, 100), color='white')
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)

        uploaded_img = SimpleUploadedFile(
            name='doctor_slip.png',
            content=img_buffer.read(),
            content_type='image/png'
        )

        ocr_text = (
            "APOLLO CLINIC HEALTHCARE\n"
            "Dr. Ananya Sen, MD\n"
            "Date: 2026-09-08\n"
            "Diagnosis: Acute Bronchitis\n"
            "Tab Azithromycin 500mg - 1 tab OD x 3 days\n"
            "Tab Paracetamol 650mg - SOS fever"
        )

        scan_url = reverse('document-scan')
        res = self.client.post(scan_url, {
            'file': uploaded_img,
            'extracted_text': ocr_text,
            'title': 'Apollo Prescription'
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['can_extract'])
        parsed = res.data['parsed_data']
        self.assertEqual(parsed['doctor'], 'Dr. Ananya Sen')
        self.assertEqual(parsed['facility'], 'APOLLO CLINIC HEALTHCARE')
        self.assertEqual(len(parsed['medications']), 2)

        # Now test Step 5 Confirm & Save
        confirm_url = reverse('document-confirm')
        confirm_res = self.client.post(confirm_url, parsed, format='json')
        self.assertEqual(confirm_res.status_code, status.HTTP_201_CREATED)
        self.assertIn('document', confirm_res.data)

        # Verify MedicalDocument created in database
        doc = MedicalDocument.objects.filter(patient=self.patient_user).first()
        self.assertIsNotNone(doc)
        self.assertIn('APOLLO CLINIC HEALTHCARE', doc.raw_text)

        # Verify PatientMedication created ONLY for real extracted medications
        meds = PatientMedication.objects.filter(patient=self.patient_user)
        self.assertEqual(meds.count(), 2)
        med_names = set(meds.values_list('name', flat=True))
        self.assertIn('Azithromycin', med_names)
        self.assertIn('Paracetamol', med_names)

        # Verify document list returns real doctor and facility without fake fallbacks
        list_url = reverse('document-list')
        list_res = self.client.get(list_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        doc_entry = list_res.data[0]
        self.assertEqual(doc_entry['doctor'], 'Dr. Ananya Sen')
        self.assertEqual(doc_entry['facility'], 'APOLLO CLINIC HEALTHCARE')

    def test_corrupted_image_is_rejected(self):
        corrupted_file = SimpleUploadedFile(
            name='corrupted.jpg',
            content=b'NOT_A_REAL_IMAGE_DATA_CORRUPT_BYTES',
            content_type='image/jpeg'
        )

        scan_url = reverse('document-scan')
        res = self.client.post(scan_url, {
            'file': corrupted_file
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get('can_extract', True))

    def test_clean_demo_users_never_deletes_registered_patients(self):
        """
        Validates Bug 4 fix: clean_demo_users must delete demo accounts ONLY
        and NEVER delete registered patients.
        """
        # Create a demo user that should be deleted
        demo_user = User.objects.create_user(
            username='sarah_jenkins',
            email='sarah@demo.com',
            password='DemoPassword123!',
            role=User.Role.PATIENT
        )

        # Create a real registered patient user
        real_user = User.objects.create_user(
            username='registered_user_persisted',
            email='persisted@realpatient.com',
            password='RealPassword123!',
            role=User.Role.PATIENT
        )

        # Execute clean_demo_users
        call_command('clean_demo_users')

        # Real user must STILL exist!
        self.assertTrue(User.objects.filter(username='registered_user_persisted').exists())
        self.assertTrue(User.objects.filter(username='persisted_patient_01').exists())

        # Demo user is cleaned
        self.assertFalse(User.objects.filter(username='sarah_jenkins').exists())

    def test_penicillin_allergy_contraindication_detected(self):
        """Tests safety service flags penicillin drugs when patient has documented allergy."""
        ocr_text = (
            "CLINIC RX\n"
            "Dr. Rajesh Sharma\n"
            "Tab Augmentin 625mg - 1 tab TDS x 5 days"
        )
        img_buffer = io.BytesIO()
        img = Image.new('RGB', (100, 100), color='white')
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)

        uploaded_img = SimpleUploadedFile(
            name='rx.png',
            content=img_buffer.read(),
            content_type='image/png'
        )

        scan_url = reverse('document-scan')
        res = self.client.post(scan_url, {
            'file': uploaded_img,
            'extracted_text': ocr_text
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['allergy_warning'])
        self.assertIn('Penicillin', res.data['allergy_message'])

    def test_delete_medical_record_by_owner_and_rejection_by_other_patient(self):
        """
        Tests:
        1. Authenticated patient can delete their own medical record.
        2. Another patient cannot delete or access it (403 Forbidden).
        3. Associated PatientMedication is decoupled (source_document set to None) rather than lost.
        4. Record is permanently removed from the database.
        """
        other_user = User.objects.create_user(
            username='other_patient_delete_test',
            email='other@health.in',
            password='OtherPass123!',
            role=User.Role.PATIENT
        )
        doc = MedicalDocument.objects.create(
            patient=self.patient_user,
            patient_identifier=self.patient_user.username,
            title='Prescription for Deletion',
            doc_type=MedicalDocument.DocType.PRESCRIPTION,
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        med = PatientMedication.objects.create(
            patient=self.patient_user,
            name='Amoxicillin',
            dosage='500mg',
            source_document=doc
        )

        delete_url = reverse('document-detail', kwargs={'doc_id': doc.doc_id})

        # Try deleting with other_user -> must be 403 Forbidden
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        bad_res = other_client.delete(delete_url)
        self.assertEqual(bad_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MedicalDocument.objects.filter(id=doc.id).exists())

        # Now delete with owner patient_user -> must be 200 OK
        ok_res = self.client.delete(delete_url)
        self.assertEqual(ok_res.status_code, status.HTTP_200_OK)
        self.assertFalse(MedicalDocument.objects.filter(id=doc.id).exists())

        # Verify medication still exists, decoupled
        med.refresh_from_db()
        self.assertIsNone(med.source_document)
        self.assertEqual(med.name, 'Amoxicillin')

