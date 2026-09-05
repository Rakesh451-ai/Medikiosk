from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, PatientProfile, DoctorProfile, TriageStaffProfile

class AccountsAuthAndRolePermissionsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Patient
        self.patient_user = User.objects.create_user(
            username='test_patient',
            password='Password123!',
            role=User.Role.PATIENT
        )
        self.patient_profile = PatientProfile.objects.create(
            user=self.patient_user,
            name='Test Patient',
            age=32,
            gender=PatientProfile.Gender.FEMALE,
            phone='9876543210',
            preferred_language='en',
            mock_abha_id='14-1111-2222-3333'
        )

        # Create Doctor
        self.doctor_user = User.objects.create_user(
            username='test_doctor',
            password='Password123!',
            role=User.Role.DOCTOR,
            is_staff=True
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor_user,
            name='Rajesh Sharma',
            department='General Medicine',
            specialization='Consultant Physician',
            room_number='Room 3'
        )

        # Create Triage Staff
        self.staff_user = User.objects.create_user(
            username='test_staff',
            password='Password123!',
            role=User.Role.TRIAGE_STAFF,
            is_staff=True
        )
        self.staff_profile = TriageStaffProfile.objects.create(
            user=self.staff_user,
            name='Priya Nair',
            station_id='Kiosk Station 01'
        )

    def test_custom_user_roles(self):
        self.assertTrue(self.patient_user.is_patient)
        self.assertFalse(self.patient_user.is_doctor)
        self.assertTrue(self.doctor_user.is_doctor)
        self.assertTrue(self.doctor_user.is_clinical_staff)
        self.assertTrue(self.staff_user.is_triage_staff)
        self.assertTrue(self.staff_user.is_clinical_staff)

    def test_patient_registration_endpoint(self):
        url = reverse('auth-register')
        payload = {
            'name': 'Aarav Kumar',
            'phone': '9198765432',
            'age': 28,
            'gender': 'MALE',
            'preferred_language': 'hi',
            'password': 'SecurePassword123!'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['role'], User.Role.PATIENT)

        # Check DB
        new_user = User.objects.get(username=response.data['user']['username'])
        self.assertEqual(new_user.patient_profile.name, 'Aarav Kumar')
        self.assertTrue(new_user.patient_profile.mock_abha_id.startswith('14-'))

    def test_jwt_login_with_enriched_profile(self):
        url = reverse('auth-login')
        payload = {
            'username': 'test_doctor',
            'password': 'Password123!'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'DOCTOR')
        self.assertEqual(response.data['user']['profile']['department'], 'General Medicine')

    def test_get_current_user_me(self):
        # Authenticate with doctor
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse('auth-current-user')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'test_doctor')
        self.assertEqual(response.data['doctor_profile']['specialization'], 'Consultant Physician')

    def test_clinical_data_permission_restriction(self):
        url = reverse('clinical-patients-list')

        # 1. Anonymous user denied
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Patient user denied (HTTP 403 Forbidden)
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Doctor user allowed (HTTP 200 OK)
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['patients']), 1)

        # 4. Triage Staff user allowed (HTTP 200 OK)
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

