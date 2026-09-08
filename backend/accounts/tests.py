from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, PatientProfile, DoctorProfile, TriageStaffProfile, VitalReading

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

        # Create Admin
        self.admin_user = User.objects.create_superuser(
            username='test_admin',
            email='admin@medikiosk.test',
            password='AdminPassword123!',
            role=User.Role.ADMIN
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

    def test_multi_identifier_lookup(self):
        # Set Aadhaar and Email for test patient
        self.patient_profile.mock_aadhaar_id = '5521 8934 1284'
        self.patient_profile.save()
        self.patient_user.email = 'test.patient@example.com'
        self.patient_user.save()

        # Lookup by Aadhaar
        res = self.client.get(reverse('auth-lookup') + '?identifier=552189341284')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['exists'])
        self.assertEqual(res.data['identifier_type'], 'aadhaar')

        # Lookup by ABHA
        res = self.client.get(reverse('auth-lookup') + '?identifier=14-1111-2222-3333')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['exists'])
        self.assertEqual(res.data['identifier_type'], 'abha')

        # Lookup by Mobile Phone
        res = self.client.get(reverse('auth-lookup') + '?identifier=9876543210')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['exists'])
        self.assertEqual(res.data['identifier_type'], 'mobile')

        # Lookup by Email
        res = self.client.get(reverse('auth-lookup') + '?identifier=test.patient@example.com')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['exists'])
        self.assertEqual(res.data['identifier_type'], 'email')

    def test_otp_send_and_verify_aadhaar(self):
        self.patient_profile.mock_aadhaar_id = '5521 8934 1284'
        self.patient_profile.save()

        # 1. Send OTP
        send_res = self.client.post(reverse('auth-otp-send'), {'identifier': '5521 8934 1284'}, format='json')
        self.assertEqual(send_res.status_code, status.HTTP_200_OK)
        self.assertEqual(send_res.data['identifier_type'], 'aadhaar')
        self.assertIn('demo_otp', send_res.data)
        otp_code = send_res.data['demo_otp']

        # 2. Verify OTP
        verify_res = self.client.post(reverse('auth-otp-verify'), {
            'identifier': '552189341284',
            'otp': otp_code
        }, format='json')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', verify_res.data)
        self.assertEqual(verify_res.data['user']['username'], 'test_patient')

    def test_unified_login_mobile_and_password(self):
        res = self.client.post(reverse('auth-unified-login'), {
            'identifier': '9876543210',
            'auth_mode': 'password',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', res.data)
        self.assertEqual(res.data['user']['username'], 'test_patient')

    def test_new_user_otp_auto_registration(self):
        # 1. Send OTP to create verification record
        send_res = self.client.post(reverse('auth-otp-send'), {'identifier': '9988 7766 5544'}, format='json')
        self.assertEqual(send_res.status_code, status.HTTP_200_OK)
        otp_code = send_res.data['demo_otp']

        # 2. Authenticate with an entirely new 12-digit Aadhaar number
        res = self.client.post(reverse('auth-otp-verify'), {
            'identifier': '9988 7766 5544',
            'otp': otp_code,
            'name': 'Pooja Verma',
            'preferred_language': 'hi'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['created'])
        self.assertEqual(res.data['user']['role'], User.Role.PATIENT)
        self.assertEqual(res.data['user']['patient_profile']['name'], 'Pooja Verma')
        self.assertTrue(res.data['user']['patient_profile']['mock_aadhaar_id'].startswith('9988'))

    def test_admin_stats_and_users_list(self):
        # 1. Unauthenticated request denied
        stats_res_anon = self.client.get(reverse('admin-stats'))
        self.assertEqual(stats_res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Normal patient request denied
        self.client.force_authenticate(user=self.patient_user)
        stats_res_patient = self.client.get(reverse('admin-stats'))
        self.assertEqual(stats_res_patient.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Authenticated admin request succeeds
        self.client.force_authenticate(user=self.admin_user)
        stats_res = self.client.get(reverse('admin-stats'))
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', stats_res.data)
        self.assertIn('flagged_spammers_count', stats_res.data)

        users_res = self.client.get(reverse('admin-users-list'))
        self.assertEqual(users_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(users_res.data['count'], 4)

    def test_spammer_blocking_and_blacklist_enforcement(self):
        from accounts.models import BlockedIdentifier

        # Admin authenticates to block
        self.client.force_authenticate(user=self.admin_user)

        # Block phone
        block_res = self.client.post(reverse('admin-security-block'), {
            'identifier': '9999888877',
            'identifier_type': 'PHONE',
            'reason': 'Excessive abusive requests'
        }, format='json')
        self.assertEqual(block_res.status_code, status.HTTP_201_CREATED)

        # Attempt to send OTP to blocked number -> must return 403 Forbidden
        self.client.force_authenticate(user=None)
        send_res = self.client.post(reverse('auth-otp-send'), {
            'identifier': '9999888877'
        }, format='json')
        self.assertEqual(send_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Access Denied', send_res.data['error'])

        # Unblock identifier by admin
        self.client.force_authenticate(user=self.admin_user)
        unblock_res = self.client.post(reverse('admin-security-unblock'), {
            'identifier': '9999888877'
        }, format='json')
        self.assertEqual(unblock_res.status_code, status.HTTP_200_OK)

        # Now OTP can be requested
        self.client.force_authenticate(user=None)
        send_res2 = self.client.post(reverse('auth-otp-send'), {
            'identifier': '9999888877'
        }, format='json')
        self.assertEqual(send_res2.status_code, status.HTTP_200_OK)

    def test_toggle_spammer_status(self):
        user_id = self.patient_user.id

        # Admin toggles spammer status
        self.client.force_authenticate(user=self.admin_user)
        toggle_res = self.client.post(reverse('admin-user-detail', kwargs={'user_id': user_id}), {
            'action': 'toggle_spammer',
            'notes': 'Suspicious bot activity detected'
        }, format='json')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertTrue(toggle_res.data['user']['is_flagged_spammer'])

        # Flagged spammer account cannot login
        self.client.force_authenticate(user=None)
        login_res = self.client.post(reverse('auth-otp-send'), {
            'identifier': 'test_patient'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_login_endpoint(self):
        url = reverse('admin-auth-login')

        # 1. Patient attempt -> 403 Forbidden
        res_patient = self.client.post(url, {'username': 'test_patient', 'password': 'Password123!'}, format='json')
        self.assertEqual(res_patient.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Doctor attempt -> 403 Forbidden
        res_doc = self.client.post(url, {'username': 'test_doctor', 'password': 'Password123!'}, format='json')
        self.assertEqual(res_doc.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Admin attempt -> 200 OK with admin tokens
        res_admin = self.client.post(url, {'username': 'test_admin', 'password': 'AdminPassword123!'}, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', res_admin.data)
        self.assertEqual(res_admin.data['user']['role'], User.Role.ADMIN)

    def test_vitals_recording_preservation_and_history(self):
        # 1. Record BP, Heart Rate, SpO2, and Temperature
        self.client.force_authenticate(user=self.patient_user)
        res1 = self.client.post(
            reverse('api-patient-vitals'),
            {
                'heart_rate': 72,
                'bp_systolic': 120,
                'bp_diastolic': 80,
                'spo2': 98,
                'temperature': 98.6,
            },
            format='json'
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertIn('latest_vitals', res1.data)
        self.assertEqual(res1.data['latest_vitals']['heart_rate'], 72)
        self.assertEqual(res1.data['latest_vitals']['bp_systolic'], 120)
        self.assertEqual(res1.data['latest_vitals']['bp_diastolic'], 80)
        self.assertEqual(res1.data['latest_vitals']['spo2'], 98)

        # 2. Record only Glucose - ensure previous non-null vitals are preserved
        res2 = self.client.post(
            reverse('api-patient-vitals'),
            {
                'glucose': 95,
            },
            format='json'
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        latest = res2.data['latest_vitals']
        self.assertEqual(latest['glucose'], 95)
        self.assertEqual(latest['heart_rate'], 72)
        self.assertEqual(latest['bp_systolic'], 120)
        self.assertEqual(latest['spo2'], 98)

        # 3. Query vitals with history=true
        res3 = self.client.get(reverse('api-patient-vitals') + '?history=true')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertIn('history', res3.data)
        self.assertIn('readings', res3.data)
        self.assertIn('latest', res3.data)
        self.assertIn('latest_vitals', res3.data)
        self.assertEqual(len(res3.data['history']), 2)
        self.assertEqual(res3.data['latest']['glucose'], 95)

        # 4. Patient detail API returns merged latest vitals
        res4 = self.client.get(reverse('api-patient-detail'))
        self.assertEqual(res4.status_code, status.HTTP_200_OK)
        self.assertIn('latest_vitals', res4.data)
        self.assertEqual(res4.data['latest_vitals']['glucose'], 95)
        self.assertEqual(res4.data['latest_vitals']['heart_rate'], 72)



