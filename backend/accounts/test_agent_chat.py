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
        """When external AI API call fails or times out, system returns 'The health assistant is temporarily unavailable.' with Retry."""
        self.client.force_authenticate(user=self.patient_a)
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=None):
            res = self.client.post('/api/agent/chat/', {
                'text': 'When should I take my medicines?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['sender'], 'agent')
            self.assertIn('temporarily unavailable', res.data['text'].lower())
            self.assertIn('Retry', res.data['quick_replies'])
            self.assertFalse(res.data.get('is_emergency'))

    def test_general_health_chat_without_patient_records(self):
        """Patient with no vitals or medications gets normal general health explanation (no 'no patient data' error)."""
        self.client.force_authenticate(user=self.patient_b)  # Patient B has no records
        mock_reply = "In general, dehydration occurs when your body loses more fluids than you take in. Common signs include feeling thirsty, dark urine, and fatigue.\n\nSUGGESTED_QUESTIONS: [How much water daily? | Signs of dehydration | Healthy drinks]"
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=mock_reply):
            res = self.client.post('/api/agent/chat/', {
                'text': 'What are the signs of dehydration?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['query_mode'], 'general')
            self.assertNotIn('no patient data', res.data['text'].lower())
            self.assertIn('In general', res.data['text'])
            self.assertIn('dehydration', res.data['text'].lower())

    def test_general_health_chat_diabetes_explanation(self):
        """General health question about diabetes returns educational explanation."""
        self.client.force_authenticate(user=self.patient_a)
        mock_reply = "In general, diabetes is a condition where your body has trouble regulating blood sugar (glucose) levels. Glucose comes from the food you eat and is the main source of energy for your body's cells.\n\nSUGGESTED_QUESTIONS: [What are symptoms of diabetes? | How is diabetes diagnosed? | Diet for diabetes]"
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=mock_reply):
            res = self.client.post('/api/agent/chat/', {
                'text': 'What is diabetes?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['query_mode'], 'general')
            self.assertIn('In general', res.data['text'])
            self.assertIn('blood sugar', res.data['text'].lower())

    def test_personal_health_chat_with_patient_medications(self):
        """Personal query grounds in patient's active medications and references 'Based on your records'."""
        self.client.force_authenticate(user=self.patient_a)
        mock_reply = "Based on your records, you are currently prescribed Metformin 500mg, twice daily (Morning and Evening) with meals.\n\nSUGGESTED_QUESTIONS: [When should I take Metformin? | Are there side effects? | What about my vitals?]"
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=mock_reply) as mock_llm:
            res = self.client.post('/api/agent/chat/', {
                'text': 'What medicines am I taking?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['query_mode'], 'personal')
            self.assertIn('Based on your records', res.data['text'])
            self.assertIn('Metformin', res.data['text'])
            # Verify patient EHR data was provided to the system prompt
            call_args = mock_llm.call_args[0][0]
            system_msg = call_args[0]['content']
            self.assertIn('Metformin', system_msg)
            self.assertIn('CURRENT MODE: PERSONAL HEALTH RECORDS', system_msg)

    def test_privacy_general_chat_does_not_inject_ehr_data(self):
        """General query does NOT inject sensitive patient EHR data into LLM system prompt."""
        self.client.force_authenticate(user=self.patient_a)
        with patch('api.services.ai_service.AIService._call_llm_api', return_value="In general, sleep is essential.") as mock_llm:
            res = self.client.post('/api/agent/chat/', {
                'text': 'What is a normal sleep duration?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['query_mode'], 'general')
            # Verify system prompt did NOT contain patient's sensitive medication or allergy details
            call_args = mock_llm.call_args[0][0]
            system_msg = call_args[0]['content']
            self.assertIn('CURRENT MODE: GENERAL HEALTH EDUCATION', system_msg)
            self.assertNotIn('Metformin', system_msg)
            self.assertNotIn('Mild Asthma', system_msg)

    def test_mixed_query_handling(self):
        """Mixed query explains general concept and compares with patient records."""
        self.client.force_authenticate(user=self.patient_a)
        mock_reply = (
            "In general, blood pressure is considered high (hypertension) when readings consistently exceed 130/80 mmHg.\n\n"
            "Based on your records, your latest recorded blood pressure is 118/76 mmHg, which falls comfortably within the normal, healthy range.\n\n"
            "SUGGESTED_QUESTIONS: [How often should I check my BP? | What causes high BP? | Healthy diet tips]"
        )
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=mock_reply) as mock_llm:
            res = self.client.post('/api/agent/chat/', {
                'text': 'What is high blood pressure, and is my BP high?'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['query_mode'], 'mixed')
            self.assertIn('In general', res.data['text'])
            self.assertIn('Based on your records', res.data['text'])
            self.assertIn('118/76', res.data['text'])
            # Verify EHR context was provided
            call_args = mock_llm.call_args[0][0]
            system_msg = call_args[0]['content']
            self.assertIn('CURRENT MODE: MIXED', system_msg)
            self.assertIn('118/76', system_msg)

    def test_multilingual_general_health_chat(self):
        """Multilingual general health question in Hinglish/Hindi returns localized response."""
        self.client.force_authenticate(user=self.patient_a)
        mock_reply = "सामान्यतः डिहाइड्रेशन (पानी की कमी) तब होती है जब शरीर में पानी की मात्रा जरूरत से कम हो जाती है। इसके मुख्य लक्षण अत्यधिक प्यास लगना, थकान और सिरदर्द हैं।\n\nSUGGESTED_QUESTIONS: [रोजाना कितना पानी पीना चाहिए? | स्वस्थ आहार टिप्स | सिरदर्द के कारण]"
        with patch('api.services.ai_service.AIService._call_llm_api', return_value=mock_reply):
            res = self.client.post('/api/agent/chat/', {
                'text': 'Dehydration kya hota hai?',
                'language': 'hi-IN'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['query_mode'], 'general')
            self.assertIn('डिहाइड्रेशन', res.data['text'])
            self.assertIn('अस्वीकरण', res.data['text'])

