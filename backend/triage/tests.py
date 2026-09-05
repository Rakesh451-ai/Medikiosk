from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from triage.models import TriageAlert

class TriageEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alert = TriageAlert.objects.create(
            alert_id='alert-test-001',
            patient_identifier='MK-78294',
            reason='Acute dyspnea and tachycardia',
            severity=TriageAlert.Severity.CRITICAL,
            status=TriageAlert.Status.OPEN
        )

    def test_active_alerts_list(self):
        url = reverse('triage-alerts')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('disclaimer', response.data)
        self.assertIn('does not diagnose', response.data['disclaimer'])
        self.assertGreaterEqual(response.data['total'], 1)

    def test_acknowledge_alert(self):
        url = reverse('triage-alert-acknowledge', kwargs={'alert_id': self.alert.alert_id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, TriageAlert.Status.ACKNOWLEDGED)

    def test_resolve_alert(self):
        url = reverse('triage-alert-resolve', kwargs={'alert_id': self.alert.alert_id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, TriageAlert.Status.RESOLVED)
        self.assertTrue(self.alert.is_resolved)
        self.assertIsNotNone(self.alert.resolved_at)

    def test_evaluate_triage_vitals(self):
        url = reverse('triage-evaluate')
        # SpO2 < 92 -> RED urgency
        response = self.client.post(url, {'patient_id': 'MK-TEST', 'vitals': {'spo2': 88, 'pulse': 105}}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['urgency_level'], 'RED')
        self.assertTrue(response.data['requires_immediate_nurse'])
        self.assertIn('does not diagnose', response.data['disclaimer'])
