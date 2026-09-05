from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from consent.models import ConsentRecord
from consent.abdm_service import MockABDMService
from consent.tasks import purge_temporary_session_data_task

class ModuleDConsentEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_grant_granular_consent(self):
        url = reverse('consent-grant')
        payload = {
            'patient_id': 'MK-78294',
            'purposes': ['share_hospital', 'store_documents', 'link_abha']
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['consents']), 3)

        # Check DB
        self.assertTrue(MockABDMService.verify_consent('MK-78294', 'share_hospital'))
        self.assertTrue(MockABDMService.verify_consent('MK-78294', 'store_documents'))

    def test_revoke_consent(self):
        rec = ConsentRecord.objects.create(
            patient_identifier='MK-78294',
            purpose=ConsentRecord.Purpose.LINK_ABHA,
            granted=True
        )
        url = reverse('consent-revoke', kwargs={'consent_id': rec.consent_id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rec.refresh_from_db()
        self.assertFalse(rec.granted)
        self.assertIsNotNone(rec.revoked_at)

    def test_mock_abdm_client_methods(self):
        profile = MockABDMService.fetch_abha_profile('14-8921-3490-1284')
        self.assertEqual(profile['status'], 'active')
        self.assertEqual(profile['name'], 'Sarah Jenkins')

        push_res = MockABDMService.push_health_record('MK-78294', {'chief_complaint': 'Cough'})
        self.assertEqual(push_res['status'], 'SUCCESS')
        self.assertEqual(push_res['fhir_bundle']['resourceType'], 'Bundle')

    def test_privacy_by_design_purge_task(self):
        res = purge_temporary_session_data_task('session-test-purge-99')
        self.assertEqual(res['status'], 'PURGED')
        self.assertIn('raw_audio_buffers', res['purged_items'])
