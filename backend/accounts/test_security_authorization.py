from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from accounts.models import PatientProfile, PatientMedication, VitalReading, ChatMessage
from documents.models import MedicalDocument

User = get_user_model()

class PatientSecurityAndAuthorizationTest(TestCase):
    """
    Comprehensive Security & Object-Level Authorization Test Suite.
    Verifies that Patient A cannot view, modify, or tamper with Patient B's data,
    that unauthenticated requests are rejected, and that passwords are secure.
    """

    def setUp(self):
        self.client = APIClient()

        # Create Patient A
        self.patient_a_user = User.objects.create_user(
            username='patient_alice',
            password='AliceSecurePass123!',
            role=User.Role.PATIENT
        )
        self.patient_a_profile = PatientProfile.objects.create(
            user=self.patient_a_user,
            name='Alice Smith',
            phone='9876500001',
            age=30,
            gender=PatientProfile.Gender.FEMALE,
            mock_abha_id='14-1111-2222-3333',
            mock_aadhaar_id='1111 2222 3333',
            blood_group='O+',
            allergies=['Penicillin']
        )

        # Create Patient B
        self.patient_b_user = User.objects.create_user(
            username='patient_bob',
            password='BobSecurePass123!',
            role=User.Role.PATIENT
        )
        self.patient_b_profile = PatientProfile.objects.create(
            user=self.patient_b_user,
            name='Bob Jones',
            phone='9876500002',
            age=45,
            gender=PatientProfile.Gender.MALE,
            mock_abha_id='14-4444-5555-6666',
            mock_aadhaar_id='4444 5555 6666',
            blood_group='A+',
            allergies=['Aspirin']
        )

        # Create Doctor
        self.doctor_user = User.objects.create_user(
            username='dr_sharma',
            password='DoctorPass123!',
            role=User.Role.DOCTOR
        )

        # Patient B's medication
        self.med_b = PatientMedication.objects.create(
            patient=self.patient_b_user,
            name='Metformin',
            dosage='500mg',
            frequency='Twice daily',
            instruction='Take with meals'
        )

        # Patient B's document
        self.doc_b = MedicalDocument.objects.create(
            doc_id='doc-bob-001',
            patient=self.patient_b_user,
            patient_identifier='patient_bob',
            title='Bob Discharge Summary',
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )

        # Patient B's vitals
        self.vital_b = VitalReading.objects.create(
            patient=self.patient_b_user,
            heart_rate=78,
            bp_systolic=120,
            bp_diastolic=80,
            spo2=99,
            temperature=98.6
        )

    # =========================================================================
    # 1. Unauthenticated Access Tests (Must be 401 Unauthorized)
    # =========================================================================
    def test_unauthenticated_requests_denied(self):
        # Patient Profile
        res = self.client.get('/api/patient/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Vitals
        res = self.client.get('/api/patient/vitals/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Medications
        res = self.client.get('/api/medications/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Documents
        res = self.client.get('/api/documents/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Agent Chat
        res = self.client.get('/api/agent/chat/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================================================================
    # 2. Patient A Accessing Own Data (Must be 200 OK)
    # =========================================================================
    def test_patient_a_can_access_own_data(self):
        self.client.force_authenticate(user=self.patient_a_user)

        # Own Profile
        res = self.client.get('/api/patient/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Alice Smith')

        # Own Profile by parameter
        res = self.client.get(f'/api/patient/?patient_id={self.patient_a_user.username}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Alice Smith')

        # Own Profile by ABHA
        res = self.client.get(f'/api/patient/?patient_id={self.patient_a_profile.mock_abha_id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Alice Smith')

    # =========================================================================
    # 3. Patient Isolation: Cross-Patient Access Denied (Must be 403 Forbidden)
    # =========================================================================
    def test_patient_a_cannot_access_patient_b_profile(self):
        self.client.force_authenticate(user=self.patient_a_user)

        # Attempt to access Bob's profile by username
        res = self.client.get(f'/api/patient/?patient_id={self.patient_b_user.username}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', res.data)

        # Attempt to access Bob's profile by Bob's ABHA ID
        res = self.client.get(f'/api/patient/?patient_id={self.patient_b_profile.mock_abha_id}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to access Bob's profile by Bob's phone
        res = self.client.get(f'/api/patient/?patient_id={self.patient_b_profile.phone}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_a_cannot_access_patient_b_vitals(self):
        self.client.force_authenticate(user=self.patient_a_user)

        res = self.client.get(f'/api/patient/vitals/?patient_id={self.patient_b_user.username}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_a_cannot_access_patient_b_medications(self):
        self.client.force_authenticate(user=self.patient_a_user)

        res = self.client.get(f'/api/medications/?patient_id={self.patient_b_user.username}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_a_cannot_tamper_with_patient_b_medication(self):
        self.client.force_authenticate(user=self.patient_a_user)

        # Attempt to mark Bob's medication as taken
        res = self.client.post(f'/api/medications/{self.med_b.id}/taken/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to toggle Bob's medication
        res = self.client.post(f'/api/medications/{self.med_b.id}/toggle/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_a_cannot_access_patient_b_documents(self):
        self.client.force_authenticate(user=self.patient_a_user)

        # Attempt to list Bob's documents
        res = self.client.get(f'/api/documents/?patient_id={self.patient_b_user.username}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to view Bob's specific document status
        res = self.client.get(f'/api/documents/{self.doc_b.doc_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to view Bob's document timeline
        res = self.client.get(f'/api/documents/patient/{self.patient_b_user.username}/timeline/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_a_cannot_access_patient_b_chat_history(self):
        self.client.force_authenticate(user=self.patient_a_user)

        res = self.client.get(f'/api/agent/chat/?patient_id={self.patient_b_user.username}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_a_cannot_impersonate_patient_b_in_chat(self):
        self.client.force_authenticate(user=self.patient_a_user)

        res = self.client.post('/api/agent/chat/', {
            'text': 'What are my medicines?',
            'patient_id': self.patient_b_user.username
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 4. Clinical Staff Authorization Tests (Must be 200 OK)
    # =========================================================================
    def test_doctor_can_access_patient_data_for_consultation(self):
        self.client.force_authenticate(user=self.doctor_user)

        # Doctor accessing Bob's profile
        res = self.client.get(f'/api/patient/?patient_id={self.patient_b_user.username}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Bob Jones')

        # Doctor viewing Bob's document
        res = self.client.get(f'/api/documents/{self.doc_b.doc_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # =========================================================================
    # 5. Password Security & Password Hashing Verification
    # =========================================================================
    def test_passwords_are_properly_hashed(self):
        self.assertNotEqual(self.patient_a_user.password, 'AliceSecurePass123!')
        self.assertTrue(self.patient_a_user.has_usable_password())
        self.assertTrue(self.patient_a_user.password.startswith(('pbkdf2_', 'argon2', 'bcrypt', 'md5')))
        self.assertTrue(self.patient_a_user.check_password('AliceSecurePass123!'))
        self.assertFalse(self.patient_a_user.check_password('WrongPassword!'))

    def test_registration_enforces_password_and_saves_profile(self):
        reg_payload = {
            'username': '9876500099',
            'password': 'StrongPassword99!',
            'name': 'David Banner',
            'age': 40,
            'gender': 'Male',
            'phone': '9876500099',
            'blood_group': 'AB+',
            'allergies': ['Sulfa', 'Cephalosporins'],
            'mock_aadhaar_id': '123456789012',
            'mock_abha_id': '14-1234-5678-9012'
        }
        res = self.client.post('/api/auth/register/', reg_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])

        # Verify created user in DB
        new_user = User.objects.get(username='9876500099')
        self.assertTrue(new_user.check_password('StrongPassword99!'))
        self.assertNotEqual(new_user.password, 'StrongPassword99!')
        self.assertEqual(new_user.patient_profile.blood_group, 'AB+')
        self.assertEqual(new_user.patient_profile.allergies, ['Sulfa', 'Cephalosporins'])
