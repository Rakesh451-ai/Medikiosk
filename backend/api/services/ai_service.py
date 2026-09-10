"""
MediKiosk AI Health Assistant Service
Connects to Groq / OpenAI-compatible API to provide personalized,
clinically grounded responses with patient EHR context, general health education,
and deterministic safety rails.
"""

import json
import logging
import urllib.request
import urllib.error
import re
from typing import Dict, Any, List, Optional
from django.conf import settings
from api.services.query_context_service import QueryContextService

logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
]

DEFAULT_QUICK_REPLIES = [
    "💧 Signs of dehydration",
    "🥗 Healthy diet tips",
    "😴 Sleep advice",
    "💊 When should I take my medicines?",
    "🩺 Are my vitals normal today?",
    "🩺 What does high BP mean?"
]

LANGUAGE_NAMES = {
    'en': 'English',
    'en-IN': 'Indian English',
    'hi': 'Hindi (हिन्दी)',
    'hi-IN': 'Hindi (हिन्दी)',
    'bn': 'Bengali (বাংলা)',
    'bn-IN': 'Bengali (বাংলা)',
    'mr': 'Marathi (मराठी)',
    'mr-IN': 'Marathi (मराठी)',
    'gu': 'Gujarati (ગુજરાતી)',
    'gu-IN': 'Gujarati (ગુજરાતી)',
    'ta': 'Tamil (தமிழ்)',
    'ta-IN': 'Tamil (தமிழ்)',
    'te': 'Telugu (తెలుగు)',
    'te-IN': 'Telugu (తెలుగు)',
    'kn': 'Kannada (ಕನ್ನಡ)',
    'kn-IN': 'Kannada (ಕನ್ನಡ)',
    'pa': 'Punjabi (ਪੰਜਾਬੀ)',
    'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
    'ml': 'Malayalam (മലയാളം)',
    'ml-IN': 'Malayalam (മലയാളം)',
}


class AIService:
    """Orchestrates AI chat completions with general health knowledge, patient context, and safety guardrails."""

    def __init__(self):
        self.api_key = getattr(settings, 'AI_API_KEY', '')
        self.base_url = getattr(settings, 'AI_API_BASE_URL', 'https://api.groq.com/openai/v1').rstrip('/')
        self.primary_model = getattr(settings, 'AI_MODEL', 'openai/gpt-oss-120b')
        self.query_context_service = QueryContextService()

    def generate_response(
        self,
        user_query: str,
        patient_context_str: str,
        safety_assessment: Dict[str, Any],
        recent_messages: Optional[List[Dict[str, str]]] = None,
        language: str = 'en',
        query_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates an assistant response for the patient query in the requested language.
        Supports 'general', 'personal', and 'mixed' query modes.
        """
        # Determine query mode if not explicitly provided
        if not query_mode:
            classified = self.query_context_service.determine_context(user_query)
            query_mode = classified.get('type', 'general')

        # 1. Deterministic Emergency Red-Flag Bypass
        if safety_assessment.get('is_emergency'):
            return {
                "text": safety_assessment.get('override_response'),
                "urgency": "critical",
                "quick_replies": [
                    "🚨 Alert Nurse / Staff",
                    "📞 Call Emergency (112)",
                    "📍 Where is the triage desk?"
                ],
                "is_emergency": True,
                "query_mode": query_mode
            }

        # 2. Build System Prompt with mode-specific instructions
        system_prompt = self._build_system_prompt(
            patient_context_str=patient_context_str,
            safety_assessment=safety_assessment,
            language=language,
            query_mode=query_mode
        )

        # 3. Build Conversation Messages Payload
        messages = [{"role": "system", "content": system_prompt}]

        if recent_messages:
            for msg in recent_messages[-8:]:
                role = "assistant" if msg.get("sender") == "agent" else "user"
                messages.append({"role": role, "content": msg.get("text", "")})

        # Add current user prompt
        messages.append({"role": "user", "content": user_query})

        # 4. Attempt AI Generation via LLM API
        urgency = safety_assessment.get('urgency', 'normal')
        ai_reply = None

        if self.api_key:
            ai_reply = self._call_llm_api(messages)

        # 5. If AI service succeeds, parse and format response
        if ai_reply:
            cleaned_text, quick_replies = self._extract_quick_replies(ai_reply, user_query, query_mode=query_mode)

            # Ensure unobtrusive medical educational disclaimer is present
            if "disclaimer" not in cleaned_text.lower() and "consult" not in cleaned_text.lower() and "अस्वीकरण" not in cleaned_text:
                if language.startswith('hi'):
                    cleaned_text += "\n\n⚠️ अस्वीकरण: यह स्वास्थ्य जानकारी केवल शैक्षिक उद्देश्यों के लिए है और डॉक्टर के परामर्श का विकल्प नहीं है।"
                else:
                    cleaned_text += "\n\n⚠️ Disclaimer: Health information is for educational purposes and does not replace professional medical advice."

            return {
                "text": cleaned_text,
                "urgency": urgency,
                "quick_replies": quick_replies,
                "is_emergency": False,
                "query_mode": query_mode
            }

        # 6. Fallback when AI provider is unavailable (strictly no fake medical answers)
        return self._build_clinical_fallback(
            query=user_query,
            patient_context_str=patient_context_str,
            safety_assessment=safety_assessment,
            language=language,
            query_mode=query_mode
        )

    def _build_system_prompt(
        self,
        patient_context_str: str,
        safety_assessment: Dict[str, Any],
        language: str = 'en',
        query_mode: str = 'general'
    ) -> str:
        lang_name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES.get(language.split('-')[0], 'English'))

        prompt_parts = [
            "You are the MediKiosk AI Health Assistant, a friendly, empathetic, and medically accurate virtual assistant located on a hospital touch-screen kiosk.",
            "",
            "CORE CLINICAL & SAFETY PRINCIPLES:",
            "1. Keep answers concise, clear, and reassuring (2-3 short paragraphs or bullet points). Patients may read on a kiosk screen or listen via text-to-speech.",
            "2. Explain medical concepts in simple, everyday words. If asked to 'explain it simply' or 'in simple words', break it down clearly without heavy jargon.",
            "3. Never claim to diagnose the user or claim to physically examine them.",
            "4. Never present yourself as a licensed physician; you are an AI Health Assistant.",
            "5. Clearly state uncertainty when appropriate and recommend consulting a qualified healthcare professional when necessary.",
            "6. Recognize potentially urgent symptoms (e.g., severe chest pain, shortness of breath, sudden numbness, severe trauma) and advise immediate emergency medical care.",
            "7. Suggest 3 short relevant follow-up questions at the very end formatted strictly as: 'SUGGESTED_QUESTIONS: [Question 1 | Question 2 | Question 3]'.",
            "8. Always maintain an encouraging, calm, professional tone.",
            "",
            "MULTILINGUAL & LOCALIZATION GUIDELINES:",
            f"• Target Language: Respond primarily in {lang_name} ({language}).",
            "• If the patient speaks or asks in Hindi, or mixes Hindi and English (Hinglish, e.g. 'Dehydration kya hota hai?', 'BP kya hota hai?', 'sir dard kyun hota hai?'), understand their query naturally and respond in clean, empathetic Hindi or Hinglish as appropriate.",
            "• If the patient selects or types in an Indian regional language (Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada, Punjabi, Malayalam), formulate your entire answer in that language.",
            "• DO NOT mistranslate medicine names, dosages, or measurements. Keep drug names (e.g. Paracetamol 650mg, Amoxicillin 250mg), test names, and vital numbers (e.g. 120/80 mmHg, 72 bpm, 98%) medically accurate and standard.",
            "",
        ]

        if query_mode == 'general':
            prompt_parts.extend([
                "CURRENT MODE: GENERAL HEALTH EDUCATION",
                "• The user is asking a general health, lifestyle, symptom, nutrition, or medical knowledge question.",
                "• Begin your answer naturally by framing it with 'In general...' (or in Hindi: 'सामान्यतः...') unless it is a simple conversational greeting.",
                "• Provide educational health information in simple, clear language.",
                "• Do NOT require patient medical records. Never say 'No patient data available' or ask for medical records.",
                "• Patient EHR data is intentionally omitted for privacy in general health mode.",
            ])
        elif query_mode == 'personal':
            prompt_parts.extend([
                "CURRENT MODE: PERSONAL HEALTH RECORDS",
                "• The user is asking about their personal medical records, active medications, recorded vitals, or test reports.",
                "• Frame your answer starting with 'Based on your records...' (or in Hindi: 'आपके मेडिकल रिकॉर्ड के अनुसार...').",
                "• Ground all answers strictly in the patient's verified EHR context provided below.",
                "• Never invent test values, medications, or doctor names that are not in the EHR context.",
                "• If the patient asks about vitals or medications and none are recorded, explain clearly that no readings or prescriptions are currently on file in their chart.",
                "",
                patient_context_str
            ])
        elif query_mode == 'mixed':
            prompt_parts.extend([
                "CURRENT MODE: MIXED (GENERAL HEALTH + PERSONAL RECORDS)",
                "• The user is asking both a general health question AND inquiring about their own recorded data or status.",
                "• Structure your response into two distinct, clearly distinguished parts:",
                "  1. General Explanation: Explain the general concept in simple terms starting with 'In general...' (or in Hindi: 'सामान्यतः...').",
                "  2. Personal Comparison: Compare with or reference the patient's actual recorded data starting with 'Based on your records...' (or in Hindi: 'आपके मेडिकल रिकॉर्ड के अनुसार...'). If the patient has no recorded values for this metric on file, state that clearly.",
                "• Clearly distinguish general health knowledge from patient-specific data.",
                "• Ground personal answers strictly in the verified EHR context below. Never invent personal data.",
                "",
                patient_context_str
            ])

        if safety_assessment.get('urgency') == 'warning' and safety_assessment.get('warning_message'):
            prompt_parts.extend([
                "",
                "SAFETY WARNING FOR THIS QUERY:",
                safety_assessment.get('warning_message'),
                "You MUST explicitly warn the patient about this documented allergy conflict and instruct them to verify with their doctor or pharmacist before taking."
            ])

        return "\n".join(prompt_parts)

    def _call_llm_api(self, messages: List[Dict[str, str]], timeout: float = 12.0, try_fallbacks: bool = True) -> Optional[str]:
        """Calls Groq/OpenAI compatible API with model fallback and configurable timeout."""
        models_to_try = [self.primary_model]
        if try_fallbacks:
            models_to_try += [m for m in FALLBACK_MODELS if m != self.primary_model]

        for model_name in models_to_try:
            try:
                url = f"{self.base_url}/chat/completions"
                payload = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 700
                }
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) MediKiosk/1.0"
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers=headers,
                    method='POST'
                )

                with urllib.request.urlopen(req, timeout=timeout) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode('utf-8'))
                        choices = data.get('choices', [])
                        if choices and 'message' in choices[0]:
                            content = choices[0]['message'].get('content', '').strip()
                            if content:
                                return content

            except urllib.error.HTTPError as e:
                try:
                    err_msg = e.read().decode('utf-8')
                except Exception:
                    err_msg = str(e)
                logger.warning(f"AI Service HTTP {e.code} for model {model_name}: {err_msg[:200]}")
            except Exception as e:
                logger.warning(f"AI Service error for model {model_name}: {str(e)}")

        return None

    def _extract_quick_replies(self, text: str, user_query: str, query_mode: str = 'general') -> (str, List[str]):
        """Extracts SUGGESTED_QUESTIONS marker or provides contextual quick replies."""
        quick_replies = []
        clean_text = text

        match = re.search(r'(?:\*\*|__)?SUGGESTED_QUESTIONS(?::\*\*|\*\*:|:)?\s*\[(.*?)\]', text, re.IGNORECASE | re.DOTALL)
        if match:
            raw_qs = match.group(1)
            parts = [q.strip() for q in raw_qs.split('|') if q.strip()]
            quick_replies = [q.strip(' *_\'"') for q in parts[:4] if len(q.strip(' *_\'"')) > 4]
            clean_text = text[:match.start()].strip()
        else:
            # Look for bullet-point suggested questions at end
            match_lines = re.search(r'(?:Suggested questions|Follow-up questions|You might ask):\s*\n((?:[•\-\*]\s*.*\n?)+)', text, re.IGNORECASE)
            if match_lines:
                lines = [line.strip('•-* ').strip() for line in match_lines.group(1).split('\n') if line.strip('•-* ').strip()]
                quick_replies = lines[:4]
                clean_text = text[:match_lines.start()].strip()

        if not quick_replies or len(quick_replies) < 2:
            quick_replies = self._generate_contextual_replies(user_query, query_mode=query_mode)

        return clean_text, quick_replies

    def _generate_contextual_replies(self, query: str, query_mode: str = 'general') -> List[str]:
        q_lower = (query or "").lower()

        if query_mode == 'personal':
            if any(w in q_lower for w in ['vital', 'heart', 'bp', 'blood pressure']):
                return [
                    "💊 When should I take my medicines?",
                    "⚠️ Are my medicines safe with my allergies?",
                    "🩺 How often should I check my BP?",
                    "🏥 How do I consult my doctor?"
                ]
            elif any(w in q_lower for w in ['med', 'pill', 'dose', 'drug']):
                return [
                    "🩺 Are my latest vitals normal?",
                    "⚠️ Do any medicines conflict with my allergies?",
                    "💧 Should I take my medicine before or after meals?",
                    "🏥 How do I speak with a pharmacist?"
                ]
            elif any(w in q_lower for w in ['allergy', 'allergic']):
                return [
                    "💊 Review all my current medications",
                    "🩺 Check my latest health numbers",
                    "📝 How do I add a new allergy?",
                    "🏥 Call triage staff for advice"
                ]
            return [
                "💊 When should I take my medicines?",
                "🩺 Are my vitals normal today?",
                "⚠️ Are my medicines safe with my allergies?",
                "🏥 How do I see a doctor or nurse?"
            ]

        # General Health or Mixed mode
        if any(w in q_lower for w in ['dehydration', 'water', 'drink', 'fluid']):
            return [
                "💧 How much water should I drink daily?",
                "🥗 Healthy diet tips",
                "😴 Better sleep advice",
                "🩺 What is normal blood pressure?"
            ]
        elif any(w in q_lower for w in ['sleep', 'insomnia', 'tired', 'fatigue']):
            return [
                "😴 Tips for better sleep quality",
                "🥗 Healthy evening foods",
                "💧 Signs of dehydration",
                "🩺 Normal resting pulse range"
            ]
        elif any(w in q_lower for w in ['diet', 'food', 'nutrition', 'eat', 'weight']):
            return [
                "🥗 Balanced daily meal tips",
                "💧 Importance of hydration",
                "😴 Sleep and metabolism",
                "🩺 Understanding blood sugar"
            ]
        elif any(w in q_lower for w in ['bp', 'blood pressure', 'hypertension']):
            return [
                "🩺 What causes high blood pressure?",
                "🥗 Dietary changes for blood pressure",
                "💧 Signs of dehydration",
                "🏥 When should I see a doctor?"
            ]
        elif any(w in q_lower for w in ['diabetes', 'sugar', 'glucose']):
            return [
                "🩺 Explain diabetes in simple words",
                "🥗 Healthy foods for blood sugar",
                "😴 How sleep affects sugar levels",
                "💧 Signs of dehydration"
            ]

        return DEFAULT_QUICK_REPLIES

    def _build_clinical_fallback(
        self,
        query: str,
        patient_context_str: str,
        safety_assessment: Dict[str, Any],
        language: str = 'en',
        query_mode: str = 'general'
    ) -> Dict[str, Any]:
        """
        When external AI is unavailable:
        Do not generate fake answers.
        Return 'The health assistant is temporarily unavailable.' with [Retry].
        """
        urgency = safety_assessment.get('urgency', 'normal')
        is_hindi = language.startswith('hi') or any('\u0900' <= char <= '\u097F' for char in query)

        # Allergy warning guardrail (always maintain patient safety)
        if urgency == 'warning' and safety_assessment.get('warning_message'):
            if is_hindi:
                text = (
                    f"⚠️ एलर्जी चेतावनी: {safety_assessment.get('warning_message')}\n\n"
                    "कृपया अपने डॉक्टर या फार्मासिस्ट की अनुमति के बिना यह दवा बिल्कुल न लें।\n\n"
                    "⚠️ अस्वीकरण: यह स्वास्थ्य जानकारी केवल शैक्षिक उद्देश्यों के लिए है और डॉक्टर के परामर्श का विकल्प नहीं है।"
                )
            else:
                text = (
                    f"{safety_assessment.get('warning_message')}\n\n"
                    "Please do NOT take this medication without explicit clearance from your prescribing doctor or pharmacist.\n\n"
                    "⚠️ Disclaimer: Health information is for educational purposes and does not replace professional medical advice."
                )
            return {
                "text": text,
                "urgency": "warning",
                "quick_replies": ["Retry"],
                "is_emergency": False,
                "query_mode": query_mode
            }

        # Requirement 16: NO FAKE FALLBACK
        if is_hindi:
            text = "हेल्थ असिस्टेंट अस्थायी रूप से अनुपलब्ध है। कृपया पुनः प्रयास करने के लिए 'Retry' पर टैप करें या अस्पताल कर्मियों से संपर्क करें।"
        else:
            text = "The health assistant is temporarily unavailable. Please tap 'Retry' to try again."

        return {
            "text": text,
            "urgency": "normal",
            "quick_replies": ["Retry"],
            "is_emergency": False,
            "is_unavailable": True,
            "query_mode": query_mode
        }
