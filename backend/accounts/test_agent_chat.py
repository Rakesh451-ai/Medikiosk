"""
Unit and Integration Tests for MediKiosk AI Health Assistant & Conversation Engine
Tests EHR grounding, deterministic safety guardrails, object-level authorization,
and conversation isolation.
"""

from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, PatientProfile, PatientMedication, VitalReading, ChatMessage, Conversation


class AgentChatTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Patient A (Allergic to Penicillin)
        self.patient_a = User.objects.create_user(
            username='patient_alice',
            password='TestPassword123!',
            role=User.Role.PATIENT
        )
        self.profile_a = PatientProfile.objects.create(
            user=self.patient_a,
            name='Alice Smith',
            age=32,
            gender='FEMALE',
            phone='9876543210',
            blood_group='O+',
            allergies=['Penicillin', 'Peanuts'],
            chronic_conditions=['Mild Asthma'],
            primary_doctor='Dr. Sarah Jenkins',
            hospital_name='City Care Hospital',
            latest_vitals={
                'heart_rate': 74,
                'blood_pressure': '118/76',
                'spo2': 99,
                'temperature': 98.4
            }
        )
        # Active Medication for Patient A
        self.med_a = PatientMedication.objects.create(
            patient=self.patient_a,
            name='Metformin',
            dosage='500mg',
            frequency='Twice daily',
            timing='Morning and Evening',
            instruction='Take with meals'
        )

        # Patient B
        self.patient_b = User.objects.create_user(
            username='patient_bob',
            password='TestPassword123!',
            role=User.Role.PATIENT
        )
        self.profile_b = PatientProfile.objects.create(
            user=self.patient_b,
            name='Bob Jones',
            age=45,
            gender='MALE',
            phone='9876543211',
            blood_group='A+'
        )

    def test_unauthenticated_request_rejected(self):
        """Unauthenticated requests to agent chat must return 401 Unauthorized."""
        res = self.client.get('/api/agent/chat/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.post('/api/agent/chat/', {'text': 'Hello'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_initial_chat_greeting(self):
        """Authenticated patient gets initial personalized greeting."""
        self.client.force_authenticate(user=self.patient_a)
        res = self.client.get('/api/agent/chat/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertTrue(len(res.data) > 0)
        self.assertEqual(res.data[0]['sender'], 'agent')
        self.assertIn('Alice', res.data[0]['text'])
        self.assertTrue(len(res.data[0]['quick_replies']) >= 2)

    def test_emergency_red_flag_critical_alert(self):
        """Emergency symptoms immediately trigger deterministic critical alert."""
        self.client.force_authenticate(user=self.patient_a)
        res = self.client.post('/api/agent/chat/', {
            'text': 'I am having severe chest pain and difficulty breathing'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data['sender'], 'agent')
        self.assertEqual(data['urgency'], 'critical')
        self.assertTrue(data.get('is_emergency'))
        self.assertIn('CRITICAL EMERGENCY ALERT', data['text'])
        self.assertIn('112', data['text'])

    def test_allergy_warning_detection(self):
        """Query mentioning penicillin class for a penicillin-allergic patient flags warning."""
        self.client.force_authenticate(user=self.patient_a)
        res = self.client.post('/api/agent/chat/', {
            'text': 'Can I take amoxicillin for my throat infection?'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data['sender'], 'agent')
        self.assertEqual(data['urgency'], 'warning')
        self.assertTrue('allergy' in data['text'].lower() or 'penicillin' in data['text'].lower())

    def test_patient_isolation_cannot_access_other_patient_chat(self):
        """Patient A cannot view or send messages on Patient B's behalf."""
        self.client.force_authenticate(user=self.patient_a)
        res = self.client.get(f'/api/agent/chat/?patient_id={self.patient_b.username}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.post('/api/agent/chat/', {
            'patient_id': self.patient_b.username,
            'text': 'Steal Patient B data'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_conversation_creation_and_listing(self):
        """Patient can create and list multi-thread conversations."""
        self.client.force_authenticate(user=self.patient_a)
        
        # Create conversation
        res = self.client.post('/api/agent/conversations/', {'title': 'Medication Questions'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        conv_id = res.data['conversation']['id']

        # List conversations
        list_res = self.client.get('/api/agent/conversations/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(c['id'] == conv_id for c in list_res.data))

    def test_conversation_isolation_between_patients(self):
        """Patient A cannot access Patient B's conversation."""
        # Create conversation for Patient B
        conv_b = Conversation.objects.create(patient=self.patient_b, title="Bob's Private Notes")

        # Patient A attempts to view Patient B's conversation
        self.client.force_authenticate(user=self.patient_a)
        res = self.client.get(f'/api/agent/chat/?conversation_id={conv_b.id}')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_ai_fallback_when_api_fails(self):
        """When external AI API call fails or times out, system returns safe clinical fallback."""
        self.client.force_authenticate(user=self.patient_a)
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=None):
            res = self.client.post('/api/agent/chat/', {
                'text': 'When should I take my medicines?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['sender'], 'agent')
            self.assertIn('prescriptions', res.data['text'].lower())
            self.assertFalse(res.data.get('is_emergency'))
