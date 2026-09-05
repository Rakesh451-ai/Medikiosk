from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from intake.models import IntakeSession, IntakeMessage, ClinicalHistoryDraft
from triage.models import TriageAlert

class ModuleAIntakeEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_start_intake_session(self):
        url = reverse('intake-session-create')
        payload = {
            'patient_id': 'MK-TEST-001',
            'department': 'General Medicine',
            'language': 'en',
            'is_ayush_enabled': False
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('session_id', response.data)
        self.assertIn('initial_prompt', response.data)
        self.assertIn('suggested_answers', response.data)

        # Verify DB models created
        session = IntakeSession.objects.get(session_id=response.data['session_id'])
        self.assertEqual(session.patient_identifier, 'MK-TEST-001')
        self.assertEqual(session.current_stage, IntakeSession.Stage.CHIEF_COMPLAINT)
        self.assertTrue(ClinicalHistoryDraft.objects.filter(session=session).exists())
        self.assertEqual(session.messages.count(), 1)
        self.assertEqual(session.messages.first().sender, IntakeMessage.Sender.AI)

    def test_conversational_socrates_progression(self):
        # 1. Create session
        session = IntakeSession.objects.create(
            patient_identifier='MK-78294',
            language='en',
            current_stage=IntakeSession.Stage.CHIEF_COMPLAINT
        )
        ClinicalHistoryDraft.objects.create(session=session)

        # 2. First turn: Chief complaint
        url = reverse('intake-session-message', kwargs={'session_id': session.session_id})
        msg_payload = {'message': 'Persistent cough and mild fever', 'input_mode': 'touch'}
        res = self.client.post(url, msg_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['stage'], IntakeSession.Stage.HPI)
        self.assertIn('Persistent cough', res.data['draft']['chief_complaint'])
        self.assertGreaterEqual(len(res.data['ai_message']['suggested_answers']), 2)

        # 3. Second turn: HPI duration
        msg_payload = {'message': 'Started about 5 days ago, worsening in evenings', 'input_mode': 'touch'}
        res = self.client.post(url, msg_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['stage'], IntakeSession.Stage.PAST_HISTORY)
        self.assertIn('duration_onset', res.data['draft']['hpi'])

        # 4. Third turn: Past history
        msg_payload = {'message': 'Mild childhood asthma', 'input_mode': 'voice'}
        res = self.client.post(url, msg_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['stage'], IntakeSession.Stage.DRUG_ALLERGY)
        self.assertIn('Mild childhood asthma', res.data['draft']['past_medical_history'])

    def test_red_flag_detection_and_triage_signal(self):
        session = IntakeSession.objects.create(
            patient_identifier='MK-RED-FLAG',
            language='en',
            current_stage=IntakeSession.Stage.CHIEF_COMPLAINT
        )
        ClinicalHistoryDraft.objects.create(session=session)

        url = reverse('intake-session-message', kwargs={'session_id': session.session_id})
        # Message with red flag: crushing chest pain + breathless
        payload = {'message': 'I have sudden crushing chest pain and severe shortness of breath', 'input_mode': 'voice'}
        res = self.client.post(url, payload, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['flagged'])
        self.assertIn('Cardiovascular Alert', res.data['flag_reason'])

        # Verify session is flagged in DB
        session.refresh_from_db()
        self.assertTrue(session.flagged)

        # Verify TriageAlert was created via signal
        alert = TriageAlert.objects.filter(session=session).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.severity, 'CRITICAL')
        self.assertIn('Cardiovascular Alert', alert.trigger_reason)

    def test_ayush_department_branch(self):
        session = IntakeSession.objects.create(
            patient_identifier='MK-AYUSH-PATIENT',
            department='AYUSH / Ayurveda Department',
            is_ayush_enabled=True,
            language='en',
            current_stage=IntakeSession.Stage.DRUG_ALLERGY
        )
        ClinicalHistoryDraft.objects.create(session=session)

        url = reverse('intake-session-message', kwargs={'session_id': session.session_id})
        # Complete allergy step
        res = self.client.post(url, {'message': 'No drug allergies', 'input_mode': 'touch'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should branch to AYUSH stage
        self.assertEqual(res.data['stage'], IntakeSession.Stage.AYUSH)
        self.assertIn('AYUSH Clinical Branch', res.data['ai_message']['text'])

        # Answer AYUSH question
        res2 = self.client.post(url, {'message': 'Slow digestion and constipation', 'input_mode': 'touch'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertIn('agni', res2.data['draft']['ayush_fields'])

