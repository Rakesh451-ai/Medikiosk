"""
MediKiosk AI Health Assistant Service
Connects to Groq / OpenAI-compatible API to provide personalized,
clinically grounded responses with patient EHR context and deterministic safety rails.
"""

import json
import logging
import urllib.request
import urllib.error
import re
from typing import Dict, Any, List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
]

DEFAULT_QUICK_REPLIES = [
    "💊 When should I take my medicines?",
    "🩺 Are my vitals normal today?",
    "⚠️ Are my medicines safe with my allergies?",
    "🏥 How do I see a doctor or nurse?"
]


class AIService:
    """Orchestrates AI chat completions with patient context and safety guardrails."""

    def __init__(self):
        self.api_key = getattr(settings, 'AI_API_KEY', '')
        self.base_url = getattr(settings, 'AI_API_BASE_URL', 'https://api.groq.com/openai/v1').rstrip('/')
        self.primary_model = getattr(settings, 'AI_MODEL', 'openai/gpt-oss-120b')

    def generate_response(
        self,
        user_query: str,
        patient_context_str: str,
        safety_assessment: Dict[str, Any],
        recent_messages: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generates an assistant response for the patient query.
        Returns:
            {
                "text": str,
                "urgency": "normal" | "warning" | "critical",
                "quick_replies": List[str],
                "is_emergency": bool
            }
        """
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
                "is_emergency": True
            }

        # 2. Build System Prompt with EHR Context & Safety Notes
        system_prompt = self._build_system_prompt(patient_context_str, safety_assessment)

        # 3. Build Conversation Messages Payload
        messages = [{"role": "system", "content": system_prompt}]

        if recent_messages:
            for msg in recent_messages[-8:]:
                role = "assistant" if msg.get("sender") == "agent" else "user"
                messages.append({"role": role, "content": msg.get("text", "")})

        # Add current user prompt
        messages.append({"role": "user", "content": user_query})

        # 4. Attempt AI Generation via Groq API
        urgency = safety_assessment.get('urgency', 'normal')
        ai_reply = None

        if self.api_key:
            ai_reply = self._call_llm_api(messages)

        # 5. If AI service succeeds, parse and format response
        if ai_reply:
            cleaned_text, quick_replies = self._extract_quick_replies(ai_reply, user_query)
            # Ensure safety disclaimer is present if not emergency
            if "disclaimer" not in cleaned_text.lower() and "consult" not in cleaned_text.lower():
                cleaned_text += "\n\n⚠️ Disclaimer: MediKiosk provides health guidance for informational purposes and does not replace consultation with a licensed clinician."

            return {
                "text": cleaned_text,
                "urgency": urgency,
                "quick_replies": quick_replies,
                "is_emergency": False
            }

        # 6. Fallback Deterministic Clinical Guidance (if API unreachable or unconfigured)
        return self._build_clinical_fallback(user_query, patient_context_str, safety_assessment)

    def _build_system_prompt(self, patient_context_str: str, safety_assessment: Dict[str, Any]) -> str:
        prompt_parts = [
            "You are the MediKiosk AI Health Assistant, a friendly, empathetic, and medically accurate virtual assistant located on a hospital touch-screen kiosk.",
            "",
            "CORE PRINCIPLES & CLINICAL GUIDELINES:",
            "1. Ground all answers strictly in the patient's verified EHR context provided below.",
            "2. Keep answers concise, clear, and reassuring (2-3 short paragraphs or bullet points). Patients may be reading on a kiosk screen or listening via text-to-speech.",
            "3. Never invent test values, medications, or doctor names that are not in the EHR context.",
            "4. If patient asks about medications, advise them according to their active prescription list and dosing instructions.",
            "5. If patient asks about vitals, interpret their recorded readings (e.g. normal heart rate 60-100 bpm, normal BP around 120/80 mmHg). If none are recorded, explain clearly that no readings are on file yet and guide them to record a reading.",
            "6. If an allergy warning applies, highlight it clearly with bold caution.",
            "7. Suggest 3 short relevant follow-up questions at the very end formatted as: 'SUGGESTED_QUESTIONS: [Question 1 | Question 2 | Question 3]'.",
            "8. Always maintain an encouraging, calm, professional tone.",
            "",
            patient_context_str
        ]

        if safety_assessment.get('urgency') == 'warning' and safety_assessment.get('warning_message'):
            prompt_parts.extend([
                "",
                "SAFETY WARNING FOR THIS QUERY:",
                safety_assessment.get('warning_message'),
                "You MUST explicitly warn the patient about this documented allergy conflict and instruct them to verify with their doctor or pharmacist before taking."
            ])

        return "\n".join(prompt_parts)

    def _call_llm_api(self, messages: List[Dict[str, str]]) -> Optional[str]:
        """Calls Groq/OpenAI compatible API with model fallback."""
        models_to_try = [self.primary_model] + [m for m in FALLBACK_MODELS if m != self.primary_model]

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

                with urllib.request.urlopen(req, timeout=12) as response:
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

    def _extract_quick_replies(self, text: str, user_query: str) -> (str, List[str]):
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
            quick_replies = self._generate_contextual_replies(user_query)

        return clean_text, quick_replies

    def _generate_contextual_replies(self, query: str) -> List[str]:
        q_lower = (query or "").lower()
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
        return DEFAULT_QUICK_REPLIES

    def _build_clinical_fallback(
        self,
        query: str,
        patient_context_str: str,
        safety_assessment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Provides high-quality, grounded clinical advice when external AI is temporarily offline."""
        q_lower = query.lower()
        urgency = safety_assessment.get('urgency', 'normal')

        # Check allergy warning first
        if urgency == 'warning' and safety_assessment.get('warning_message'):
            text = (
                f"{safety_assessment.get('warning_message')}\n\n"
                "Please do NOT take this medication without explicit clearance from your prescribing doctor or pharmacist.\n\n"
                "⚠️ Medical Disclaimer: MediKiosk provides health information and does not replace consultation with a licensed clinician."
            )
            return {
                "text": text,
                "urgency": "warning",
                "quick_replies": [
                    "💊 Review my active prescriptions",
                    "🩺 Check my vital readings",
                    "🏥 Alert clinic nurse"
                ],
                "is_emergency": False
            }

        # Vitals inquiry
        if any(w in q_lower for w in ['vital', 'bp', 'heart', 'pulse', 'spo2', 'sugar', 'blood pressure']):
            text = (
                "Here is the status of your vital readings recorded in your health chart:\n\n"
                "• Blood pressure targets are typically below 120/80 mmHg.\n"
                "• A resting heart rate between 60 and 100 bpm is standard for most adults.\n"
                "• Oxygen saturation (SpO2) at 95% or higher is normal.\n\n"
                "Check the 'What the Assistant Knows' card on the left for your latest values on file. If you are experiencing lightheadedness or fatigue, please alert kiosk staff."
            )
        # Medication inquiry
        elif any(w in q_lower for w in ['medic', 'pill', 'dose', 'drug', 'prescription', 'when should i take']):
            text = (
                "Regarding your prescriptions:\n\n"
                "• Always follow the timing (morning/evening) and meal instructions indicated by your doctor.\n"
                "• Take medicines with a full glass of water.\n"
                "• You can view and mark your doses as taken on the 'Prescriptions' screen.\n\n"
                "If you experience side effects or miss a dose, please contact your prescribing physician."
            )
        else:
            text = (
                f"Thank you for your question regarding '{query}'. Your personal health record is actively loaded.\n\n"
                "You can ask about your active prescriptions, recorded vitals, documented drug allergies, or instructions from your medical documents."
            )

        text += "\n\n⚠️ Disclaimer: MediKiosk provides health guidance for informational purposes and does not replace consultation with a licensed clinician."

        return {
            "text": text,
            "urgency": urgency,
            "quick_replies": self._generate_contextual_replies(query),
            "is_emergency": False
        }
