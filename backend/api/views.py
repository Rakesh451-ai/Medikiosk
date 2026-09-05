import os
import json
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Patient, Vitals, MedicalDocument, Medication, Conversation, ChatMessage
from .serializers import (
    PatientSerializer, VitalsSerializer, MedicalDocumentSerializer,
    MedicationSerializer, ConversationSerializer, ChatMessageSerializer
)

def get_or_create_default_patient():
    patient = Patient.objects.filter(patient_id="MK-78294").first()
    if not patient:
        patient = Patient.objects.create(
            patient_id="MK-78294",
            name="Sarah Jenkins",
            age=38,
            gender="Female",
            blood_group="A+",
            allergies=["Penicillin", "Sulfa Drugs"],
            emergency_contact="+1 (555) 382-9912 (Spouse)",
            primary_doctor="Dr. Michael Chen, MD (Cardiology)",
            pin="1234"
        )
        # Create initial baseline vitals
        Vitals.objects.create(
            patient=patient,
            heart_rate=74,
            bp_systolic=118,
            bp_diastolic=78,
            spo2=99,
            temperature=98.4,
            glucose=92,
            weight_kg=64.0,
            height_cm=168.0
        )
        # Create initial clinical documents
        doc1 = MedicalDocument.objects.create(
            patient=patient,
            title="Clinical Prescription - Dr. Michael Chen",
            doc_type="Prescription",
            facility="Metro General Hospital",
            doctor="Dr. Michael Chen, MD",
            diagnosis="Seasonal Upper Respiratory Infection & Mild Bronchospasm",
            extracted_text="METRO GENERAL HOSPITAL - CLINICAL PRESCRIPTION\nPatient: Sarah Jenkins (Age: 38)\nRx:\n1. Amoxicillin 500mg - 1 cap PO q8h x 7d\n2. Levocetirizine 5mg - 1 tab PO qhs x 5d\n3. Fluticasone Nasal Spray - 2 sprays daily",
            confidence="99.4%"
        )
        Medication.objects.create(
            patient=patient,
            document=doc1,
            name="Amoxicillin",
            dose="500 mg",
            frequency="3 times daily",
            duration="7 days",
            instruction="Take with full glass of water after meals",
            timing="Morning, Noon, Night",
            status="Active"
        )
        Medication.objects.create(
            patient=patient,
            document=doc1,
            name="Levocetirizine",
            dose="5 mg",
            frequency="Once daily",
            duration="5 days",
            instruction="Take at bedtime",
            timing="Night",
            status="Active"
        )
        Medication.objects.create(
            patient=patient,
            document=doc1,
            name="Fluticasone Spray",
            dose="50 mcg",
            frequency="2 sprays/nostril",
            duration="10 days",
            instruction="Morning after nasal cleansing",
            timing="Morning",
            status="Active"
        )

        doc2 = MedicalDocument.objects.create(
            patient=patient,
            title="Comprehensive Metabolic Panel & CBC",
            doc_type="Lab Report",
            facility="BioPath Diagnostic Laboratories",
            doctor="Dr. Rachel Adams, Pathologist",
            diagnosis="Routine Fasting Metabolic & Lipid Panel",
            extracted_text="BIOPATH DIAGNOSTICS\nPatient: Sarah Jenkins\n- Hemoglobin: 13.8 g/dL (Normal)\n- WBC: 6,800 /mcL (Normal)\n- Fasting Glucose: 92 mg/dL (Normal)\n- Total Cholesterol: 198 mg/dL (Desirable)\n- HDL: 58 mg/dL (Optimal)\nImpression: All metabolic markers within target boundaries.",
            confidence="98.9%"
        )
        Medication.objects.create(
            patient=patient,
            document=doc2,
            name="Omega-3 Fish Oil",
            dose="1000 mg",
            frequency="Once daily",
            duration="Ongoing",
            instruction="With morning breakfast",
            timing="Morning",
            status="Supplement"
        )

    # Ensure at least one default conversation exists
    default_conv = Conversation.objects.filter(patient=patient).first()
    if not default_conv:
        default_conv = Conversation.objects.create(
            patient=patient,
            title="General Health Consultation",
            language="en"
        )
        ChatMessage.objects.create(
            conversation=default_conv,
            patient=patient,
            sender="agent",
            text="Hello Sarah! I am your MediKiosk AI Clinical Doctor Agent. You can speak or write to me in English, हिंदी (Hindi), or Hinglish. How are you feeling today?",
            language="en",
            urgency="normal",
            quick_replies=[
                "Check drug allergy safety",
                "Explain my latest scan report",
                "Review my daily medications",
                "Book appointment with Dr. Chen"
            ]
        )

    return patient


@api_view(['GET'])
def health_check(request):
    return Response({
        "status": "online",
        "service": "MediKiosk Django REST API",
        "version": "2.1.0",
        "timestamp": timezone.now().isoformat(),
        "database": {
            "patients": Patient.objects.count(),
            "documents": MedicalDocument.objects.count(),
            "conversations": Conversation.objects.count()
        },
        "llm_config": {
            "configured": bool(getattr(settings, 'LLM_API_KEY', '') and getattr(settings, 'LLM_API_KEY', '') != 'your_api_key_here'),
            "provider": getattr(settings, 'LLM_PROVIDER', 'gemini'),
            "model": getattr(settings, 'LLM_MODEL', 'gemini-1.5-flash')
        }
    })


@api_view(['POST'])
def login_view(request):
    patient_id = request.data.get('patient_id', 'MK-78294').strip()
    patient = Patient.objects.filter(patient_id__iexact=patient_id).first()
    if not patient:
        patient = get_or_create_default_patient()

    serializer = PatientSerializer(patient)
    return Response({
        "success": True,
        "message": "Login successful",
        "patient": serializer.data
    })


@api_view(['POST'])
def signup_view(request):
    name = request.data.get('name', '').strip()
    age = request.data.get('age', 32)
    gender = request.data.get('gender', 'Female')
    blood_group = request.data.get('blood_group', 'O+')
    allergies = request.data.get('allergies', [])
    emergency_contact = request.data.get('emergency_contact', '+1 (555) 019-2834')

    if not name:
        return Response({"error": "Patient name is required"}, status=status.HTTP_400_BAD_REQUEST)

    import random
    new_id = f"MK-{random.randint(10000, 99999)}"

    patient = Patient.objects.create(
        patient_id=new_id,
        name=name,
        age=int(age),
        gender=gender,
        blood_group=blood_group,
        allergies=allergies if isinstance(allergies, list) else [a.strip() for a in allergies.split(',') if a.strip()],
        emergency_contact=emergency_contact,
        primary_doctor="Dr. Michael Chen, MD (Cardiology)"
    )

    Vitals.objects.create(
        patient=patient,
        heart_rate=72,
        bp_systolic=120,
        bp_diastolic=80,
        spo2=99,
        temperature=98.6,
        glucose=95
    )

    conv = Conversation.objects.create(
        patient=patient,
        title="Welcome Consultation",
        language="en"
    )

    ChatMessage.objects.create(
        conversation=conv,
        patient=patient,
        sender="agent",
        text=f"Welcome {name}! Your MediKiosk chart has been created with ID {new_id}. You can chat with me in English, हिंदी, or Hinglish.",
        language="en",
        quick_replies=["Scan new prescription", "Check my vitals", "Ask health question"]
    )

    serializer = PatientSerializer(patient)
    return Response({
        "success": True,
        "message": "Patient registered successfully",
        "patient": serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def patient_detail(request):
    pid = request.query_params.get('patient_id')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() if pid else get_or_create_default_patient()
    if not patient:
        patient = get_or_create_default_patient()
    return Response(PatientSerializer(patient).data)


@api_view(['PUT', 'POST'])
def update_vitals(request):
    pid = request.data.get('patient_id', 'MK-78294')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() or get_or_create_default_patient()

    vitals = Vitals.objects.create(
        patient=patient,
        heart_rate=request.data.get('heart_rate', 74),
        bp_systolic=request.data.get('bp_systolic', 118),
        bp_diastolic=request.data.get('bp_diastolic', 78),
        spo2=request.data.get('spo2', 99),
        temperature=request.data.get('temperature', 98.4),
        glucose=request.data.get('glucose', 92)
    )
    return Response(VitalsSerializer(vitals).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def list_documents(request):
    pid = request.query_params.get('patient_id')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() if pid else get_or_create_default_patient()
    docs = MedicalDocument.objects.filter(patient=patient)
    return Response(MedicalDocumentSerializer(docs, many=True).data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def scan_document(request):
    pid = request.data.get('patient_id', 'MK-78294')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() or get_or_create_default_patient()

    doc_type = request.data.get('doc_type', 'Prescription')
    title = request.data.get('title', 'Scanned Clinical Prescription')
    facility = request.data.get('facility', 'Metro General Hospital')
    doctor = request.data.get('doctor', 'Dr. Sarah Jenkins, MD')
    diagnosis = request.data.get('diagnosis', 'Extracted via Optical Document Recognition')
    extracted_text = request.data.get('extracted_text', '')
    confidence = request.data.get('confidence', '99.4%')

    uploaded_file = request.FILES.get('file', None)
    if uploaded_file and not extracted_text:
        extracted_text = f"FILE SCAN: {uploaded_file.name}\nSize: {uploaded_file.size} bytes\nProcessed by Optical OCR Engine."
        title = uploaded_file.name.replace('.pdf', '').replace('.png', '').replace('.jpg', '')

    doc = MedicalDocument.objects.create(
        patient=patient,
        title=title,
        doc_type=doc_type,
        facility=facility,
        doctor=doctor,
        diagnosis=diagnosis,
        extracted_text=extracted_text,
        confidence=confidence,
        file=uploaded_file
    )

    medications_data = request.data.get('medications', [])
    created_meds = []
    if isinstance(medications_data, list) and len(medications_data) > 0:
        for m in medications_data:
            med = Medication.objects.create(
                patient=patient,
                document=doc,
                name=m.get('name', 'Prescribed Item'),
                dose=m.get('dose', 'Standard'),
                frequency=m.get('frequency', 'Daily'),
                duration=m.get('duration', '7 days'),
                instruction=m.get('instruction', 'Take as directed'),
                timing=m.get('timing', 'Morning'),
                status="Active"
            )
            created_meds.append(med)
    else:
        med = Medication.objects.create(
            patient=patient,
            document=doc,
            name="Amoxicillin",
            dose="500 mg",
            frequency="3 times daily",
            duration="7 days",
            instruction="Take after meals with water",
            timing="Morning, Noon, Night",
            status="Active"
        )
        created_meds.append(med)

    return Response({
        "success": True,
        "message": "Document successfully parsed and synced",
        "document": MedicalDocumentSerializer(doc).data,
        "allergy_warning": any("amoxicillin" in m.name.lower() for m in created_meds) or any("penicillin" in m.name.lower() for m in created_meds)
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
def medications_list(request):
    pid = request.query_params.get('patient_id') or request.data.get('patient_id')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() if pid else get_or_create_default_patient()

    if request.method == 'POST':
        med = Medication.objects.create(
            patient=patient,
            name=request.data.get('name', 'Medication'),
            dose=request.data.get('dose', '10 mg'),
            frequency=request.data.get('frequency', 'Once daily'),
            duration=request.data.get('duration', '30 days'),
            instruction=request.data.get('instruction', 'Take with food'),
            timing=request.data.get('timing', 'Morning'),
            status="Active"
        )
        return Response(MedicationSerializer(med).data, status=status.HTTP_201_CREATED)

    meds = Medication.objects.filter(patient=patient)
    return Response(MedicationSerializer(meds, many=True).data)


@api_view(['POST'])
def toggle_medication_taken(request, pk):
    med = Medication.objects.filter(pk=pk).first()
    if not med:
        return Response({"error": "Medication not found"}, status=status.HTTP_404_NOT_FOUND)
    med.taken_today = not med.taken_today
    med.save()
    return Response(MedicationSerializer(med).data)


# ==============================================================================
# 🤖 MULTILINGUAL AI AGENT & CHAT CONVERSATIONS (Hindi, English, Hinglish)
# ==============================================================================

@api_view(['GET', 'POST'])
def conversations_list(request):
    pid = request.query_params.get('patient_id') or request.data.get('patient_id')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() if pid else get_or_create_default_patient()

    if request.method == 'POST':
        title = request.data.get('title', 'New Consultation')
        lang = request.data.get('language', 'en')
        conv = Conversation.objects.create(
            patient=patient,
            title=title,
            language=lang
        )
        # Add welcome message based on language
        if lang == 'hi':
            welcome = "नमस्ते! मैं आपका मेडीकिओस्क एआई डॉक्टर हूँ। मैं आपकी मेडिकल रिपोर्ट्स, दवाइयों और स्वास्थ्य के बारे में मदद कर सकता हूँ। आज आप कैसा महसूस कर रहे हैं?"
            qr = ["दवाइयों की सुरक्षा जांचें", "मेरी स्कैन रिपोर्ट समझाएं", "मेरे वाइटल्स कैसे हैं?", "डॉक्टर से अपॉइंटमेंट"]
        elif lang == 'hinglish':
            welcome = "Namaste! Main aapka MediKiosk AI Doctor hoon. Aap mujhse Hindi ya Hinglish mein apni reports, dawaiyon aur health ke baare mein pooch sakte hain. Aaj aap kaisa feel kar rahe hain?"
            qr = ["Dawai allergy check karein", "Meri scan report samjhayein", "Mere vitals kaise hain?", "Doctor appointment book karein"]
        else:
            welcome = "Hello! I am your MediKiosk AI Clinical Health Assistant. How can I help you with your symptoms, prescriptions, or reports today?"
            qr = ["Check drug allergy safety", "Explain latest scan report", "How are my vitals?", "Book doctor consultation"]

        ChatMessage.objects.create(
            conversation=conv,
            patient=patient,
            sender="agent",
            text=welcome,
            language=lang,
            quick_replies=qr
        )

        return Response(ConversationSerializer(conv).data, status=status.HTTP_201_CREATED)

    convs = Conversation.objects.filter(patient=patient)
    return Response(ConversationSerializer(convs, many=True).data)


@api_view(['GET', 'DELETE'])
def conversation_detail(request, pk):
    conv = Conversation.objects.filter(pk=pk).first()
    if not conv:
        return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        conv.delete()
        return Response({"success": True, "message": "Conversation deleted"})

    # GET messages for this conversation
    messages = conv.messages.all()
    return Response({
        "conversation": ConversationSerializer(conv).data,
        "messages": ChatMessageSerializer(messages, many=True).data
    })


def call_external_llm(user_query, language, patient, api_key=None, provider='gemini', model='gemini-1.5-flash'):
    """
    Calls Google Gemini or OpenAI API if API key is provided.
    Includes patient clinical context and language instructions.
    """
    active_key = api_key or getattr(settings, 'LLM_API_KEY', '')
    if not active_key or active_key == 'your_api_key_here':
        return None

    # Construct clinical system context
    v = patient.vitals_history.first()
    meds = [f"{m.name} ({m.dose}, {m.timing})" for m in patient.medications.filter(status="Active")]
    docs = [f"{d.title} ({d.doc_type})" for d in patient.documents.all()]
    allergies = ", ".join(patient.allergies) if patient.allergies else "None"

    system_instruction = (
        f"You are the MediKiosk AI Clinical Doctor Assistant in a hospital kiosk.\n"
        f"Patient Information:\n"
        f"- Name: {patient.name}, Age: {patient.age}, Gender: {patient.gender}, Blood: {patient.blood_group}\n"
        f"- Documented Allergies: {allergies}\n"
        f"- Active Medications: {', '.join(meds) if meds else 'None'}\n"
        f"- Latest Vitals: Heart Rate {v.heart_rate if v else 74} bpm, BP {v.bp_systolic if v else 118}/{v.bp_diastolic if v else 78} mmHg, SpO2 {v.spo2 if v else 99}%\n"
        f"- Clinical Documents on File: {', '.join(docs) if docs else 'None'}\n\n"
        f"CRITICAL SAFETY RULE:\n"
        f"If the patient asks about taking Amoxicillin, Ampicillin, or Penicillin-class drugs and has a Penicillin allergy, "
        f"YOU MUST IMMEDIATELY ISSUE A CLEAR CONTRAINDICATION WARNING advising them NOT to take it without consulting their doctor Dr. Michael Chen.\n\n"
        f"LANGUAGE INSTRUCTION:\n"
    )

    if language == 'hi':
        system_instruction += "Respond in clear, natural, compassionate HINDI (हिंदी देवनागरी लिपि में). Explain medical terms in simple Hindi."
    elif language == 'hinglish':
        system_instruction += "Respond in natural, conversational HINGLISH (Hindi written in English alphabet, e.g. 'Aapka blood pressure bilkul normal hai. Lekin penicillin allergy ka dhyan rakhein.')."
    else:
        system_instruction += "Respond in clear, compassionate, medically accurate ENGLISH."

    try:
        # 1. Google Gemini API call
        if provider == 'gemini' or 'gemini' in model:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_instruction}\n\nPatient Query: {user_query}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 600
                }
            }
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                text = data['candidates'][0]['content']['parts'][0]['text']
                return text.strip()

        # 2. OpenAI API call
        elif provider == 'openai' or 'gpt' in model:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {active_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model or "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_query}
                ],
                "temperature": 0.3,
                "max_tokens": 600
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                text = data['choices'][0]['message']['content']
                return text.strip()

    except Exception as e:
        print(f"External LLM call failed: {e}")

    return None


@api_view(['GET', 'POST'])
def agent_chat(request):
    pid = request.query_params.get('patient_id') or request.data.get('patient_id')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() if pid else get_or_create_default_patient()

    if request.method == 'POST':
        user_text = request.data.get('text', '').strip()
        conv_id = request.data.get('conversation_id')
        language = request.data.get('language', 'en').lower() # 'en', 'hi', 'hinglish'
        user_api_key = request.data.get('api_key', '').strip()

        if not user_text:
            return Response({"error": "Message text is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create conversation
        conversation = None
        if conv_id:
            conversation = Conversation.objects.filter(pk=conv_id, patient=patient).first()
        if not conversation:
            # Auto-title based on first prompt
            title = user_text[:35] + ('...' if len(user_text) > 35 else '')
            conversation = Conversation.objects.create(
                patient=patient,
                title=title,
                language=language
            )

        # Save patient message
        ChatMessage.objects.create(
            conversation=conversation,
            patient=patient,
            sender="patient",
            text=user_text,
            language=language
        )

        # Auto-update conversation title if default
        if conversation.title in ["New Consultation", "General Health Consultation", "Welcome Consultation"] and conversation.messages.count() <= 3:
            conversation.title = user_text[:35] + ('...' if len(user_text) > 35 else '')
            conversation.save()

        lower_query = user_text.lower()
        urgency = "normal"
        reply_text = ""
        quick_replies = []

        # Check for Penicillin / Amoxicillin contraindication
        has_penicillin_allergy = any("penicillin" in a.lower() for a in patient.allergies)
        is_allergy_query = ("amoxicillin" in lower_query or "allergy" in lower_query or "penicillin" in lower_query or "safe" in lower_query or "surakshit" in lower_query or "nuksan" in lower_query)

        # Attempt to call live LLM API if key is present
        external_reply = call_external_llm(
            user_query=user_text,
            language=language,
            patient=patient,
            api_key=user_api_key
        )

        if external_reply:
            reply_text = external_reply
            if is_allergy_query and has_penicillin_allergy:
                urgency = "alert"
            quick_replies = (
                ["डॉक्टर से बात करें", "दूसरी दवा पूछें", "वाइटल्स चेक करें"] if language == 'hi' else
                ["Doctor se consult karein", "Alternative medicine", "Vitals check karein"] if language == 'hinglish' else
                ["Call Doctor Now", "Request Alternative Medication", "Review All Allergies"]
            )
        else:
            # Built-in Clinical Intelligence Engine (Hindi / English / Hinglish)
            if is_allergy_query and has_penicillin_allergy:
                urgency = "alert"
                if language == 'hi':
                    reply_text = (
                        "⚠️ अत्यंत महत्वपूर्ण एलर्जी चेतावनी (Critical Allergy Alert):\n"
                        f"आपकी मेडिकल फाइल के अनुसार आपको {', '.join(patient.allergies)} से गंभीर एलर्जी है।\n"
                        "Amoxicillin दवा पेनिसिलिन वर्ग (Penicillin-class) की एंटीबायोटिक है। इसे लेने से आपको रिएक्शन हो सकता है।\n"
                        "सलाह: डॉक्टर माइकल चेन (Dr. Michael Chen) या फार्मासिस्ट से परामर्श किए बिना यह दवा बिल्कुल न लें। वे आपको सुरक्षित गैर-पेनिसिलिन विकल्प (जैसे Azithromycin) देंगे।"
                    )
                    quick_replies = ["डॉक्टर से तुरंत संपर्क करें", "वैकल्पिक दवा पूछें", "एलर्जी सूची देखें"]
                elif language == 'hinglish':
                    reply_text = (
                        "⚠️ CRITICAL DRUG ALLERGY WARNING:\n"
                        f"Aapki medical profile ke mutabiq aapko {', '.join(patient.allergies)} se allergy hai.\n"
                        "Amoxicillin ek Penicillin-class antibiotic hai. Isse lene se allergic reaction ho sakta hai.\n"
                        "Doctor ki Sallah: Amoxicillin lene se pehle apne doctor Dr. Michael Chen se zaroor baat karein taaki wo aapko safe non-penicillin dawai (jaise Azithromycin) prescribe kar sakein."
                    )
                    quick_replies = ["Doctor se consult karein", "Alternative dawai poochhein", "Allergies review karein"]
                else:
                    reply_text = (
                        "⚠️ CRITICAL DRUG ALLERGY CONTRAINDICATION ALERT:\n"
                        f"Your chart indicates an allergy to: {', '.join(patient.allergies)}.\n"
                        "Amoxicillin belongs to the penicillin class of antibiotics. Taking it may cause an allergic reaction.\n"
                        "Recommendation: Do NOT start this medication until speaking with Dr. Michael Chen or your attending pharmacist for a safe non-penicillin alternative (such as Azithromycin or Clarithromycin)."
                    )
                    quick_replies = ["Call Doctor Now", "Request Alternative Medication", "Review All Allergies"]

            elif "scan" in lower_query or "x-ray" in lower_query or "xray" in lower_query or "radiology" in lower_query or "report" in lower_query:
                if language == 'hi':
                    reply_text = (
                        "मैंने आपकी एडवांस्ड इमेजिंग सेंटर से आई चेस्ट एक्स-रे (Chest X-Ray) रिपोर्ट देखी है। "
                        "परिणाम बिल्कुल सामान्य (Normal) हैं: फेफड़े पूरी तरह साफ हैं, कोई निमोनिया या संक्रमण नहीं है, "
                        "और हृदय का अनुपात (Cardiothoracic ratio 0.45) स्वस्थ है। चिंता की कोई बात नहीं है।"
                    )
                    quick_replies = ["ब्लड टेस्ट रिपोर्ट समझाएं", "दवाइयों का समय", "प्रिंट समरी"]
                elif language == 'hinglish':
                    reply_text = (
                        "Maine aapka Chest X-Ray report review kiya hai. "
                        "Aapke lungs bilkul clear hain, koi pneumonia ya fluid nahi hai, aur cardiothoracic ratio (0.45) normal hai. "
                        "Overall aapki radiographic study bilkul healthy hai!"
                    )
                    quick_replies = ["Blood test report samjhayein", "Dawai schedule dekhein", "Print summary"]
                else:
                    reply_text = (
                        "I've examined your Chest Radiography report from Advanced Imaging Center. "
                        "The findings are completely normal: clear lung fields, no signs of pneumonia or consolidation, "
                        "and a normal cardiothoracic ratio (0.45). Everything looks clear!"
                    )
                    quick_replies = ["Explain blood test panel", "Check medication schedule", "Print report"]

            elif "vital" in lower_query or "bp" in lower_query or "pressure" in lower_query or "heart" in lower_query or "pulse" in lower_query or "dhadkan" in lower_query:
                v = patient.vitals_history.first()
                if language == 'hi':
                    reply_text = (
                        f"आपके कियोस्क पर लिए गए वाइटल्स बिल्कुल स्वस्थ हैं:\n"
                        f"• पल्स (हार्ट रेट): {v.heart_rate if v else 74} bpm (सामान्य धड़कन)\n"
                        f"• ब्लड प्रेशर (BP): {v.bp_systolic if v else 118}/{v.bp_diastolic if v else 78} mmHg (आदर्श रेंज)\n"
                        f"• ऑक्सीजन (SpO2): {v.spo2 if v else 99}% (उत्कृष्ट)\n"
                        f"• तापमान: {v.temperature if v else 98.4}°F (बुखार नहीं है)"
                    )
                    quick_replies = ["दोबारा वाइटल्स मापें", "दवाइयों का समय", "डॉक्टर से सलाह"]
                elif language == 'hinglish':
                    reply_text = (
                        f"Aapke live kiosk vitals bilkul normal aur healthy hain:\n"
                        f"• Heart Rate: {v.heart_rate if v else 74} bpm (Normal resting rhythm)\n"
                        f"• Blood Pressure (BP): {v.bp_systolic if v else 118}/{v.bp_diastolic if v else 78} mmHg (Optimal standard)\n"
                        f"• Oxygen (SpO2): {v.spo2 if v else 99}% (Well oxygenated)\n"
                        f"• Body Temperature: {v.temperature if v else 98.4}°F (Normal)"
                    )
                    quick_replies = ["Dobara vitals check karein", "Dawai schedule dekhein", "Nurse ko bulayein"]
                else:
                    reply_text = (
                        f"Your live kiosk vitals are optimal:\n"
                        f"• Heart Rate: {v.heart_rate if v else 74} bpm (Normal resting rhythm)\n"
                        f"• Blood Pressure: {v.bp_systolic if v else 118}/{v.bp_diastolic if v else 78} mmHg (Standard target)\n"
                        f"• Oxygen Saturation (SpO2): {v.spo2 if v else 99}%\n"
                        f"• Body Temperature: {v.temperature if v else 98.4}°F (Normothermic)"
                    )
                    quick_replies = ["Re-check vitals", "Medication schedule", "Consult nurse"]

            elif "schedule" in lower_query or "timing" in lower_query or "dawai" in lower_query or "medicine" in lower_query or "kab" in lower_query or "dose" in lower_query:
                active_meds = patient.medications.filter(status="Active")
                if language == 'hi':
                    med_lines = [f"• {m.name} ({m.dose}): {m.timing} - {m.instruction}" for m in active_meds]
                    reply_text = "यहाँ आपकी दैनिक दवाइयों का समय है:\n" + "\n".join(med_lines) + "\n\nदवा लेने के बाद कियोस्क ऐप में चेक-ऑफ (Mark Taken) करना न भूलें।"
                    quick_replies = ["सुबह की खुराक ली", "एलर्जी जांचें", "प्रिंट समरी"]
                elif language == 'hinglish':
                    med_lines = [f"• {m.name} ({m.dose}): {m.timing} - {m.instruction}" for m in active_meds]
                    reply_text = "Yeh raha aapka daily medication schedule:\n" + "\n".join(med_lines) + "\n\nPaanie zyaada piyein aur dawai lene ke baad app mein check-off karein."
                    quick_replies = ["Morning dose mark karein", "Refill alert", "Allergy check"]
                else:
                    med_lines = [f"• {m.name} ({m.dose}): {m.timing} - {m.instruction}" for m in active_meds]
                    reply_text = "Here is your active medication schedule:\n" + "\n".join(med_lines) + "\n\nRemember to stay hydrated and mark doses as taken in your portal."
                    quick_replies = ["Mark morning doses taken", "Set refill alert", "Ask allergy check"]

            elif "doctor" in lower_query or "appointment" in lower_query or "milna" in lower_query:
                if language == 'hi':
                    reply_text = (
                        f"आपके प्राथमिक चिकित्सक {patient.primary_doctor} हैं। "
                        "क्लीनिक के समय सोमवार से शुक्रवार सुबह 8:00 बजे से शाम 5:00 बजे तक हैं। "
                        "क्या आप कल सुबह 11:30 बजे के लिए अपॉइंटमेंट बुक करना चाहते हैं?"
                    )
                    quick_replies = ["हाँ, कल 11:30 AM बुक करें", "टेलीकंसल्टेशन चाहिए", "डॉक्टर को संदेश भेजें"]
                elif language == 'hinglish':
                    reply_text = (
                        f"Aapke primary doctor {patient.primary_doctor} hain. "
                        "Clinic office hours Monday–Friday 8:00 AM se 5:00 PM tak hain. "
                        "Kya aap kal subah 11:30 AM ke liye slot reserve karna chahte hain?"
                    )
                    quick_replies = ["Yes, kal 11:30 AM book karein", "Telehealth call", "Message doctor office"]
                else:
                    reply_text = (
                        f"Your primary physician is {patient.primary_doctor}. "
                        "Office hours are Monday–Friday 8:00 AM - 5:00 PM. "
                        "Would you like me to reserve an in-person follow-up appointment tomorrow at 11:30 AM?"
                    )
                    quick_replies = ["Request Tomorrow 11:30 AM", "Request Telehealth Call", "Message Doctor Office"]

            else:
                first_name = patient.name.split()[0]
                if language == 'hi':
                    reply_text = (
                        f"नमस्ते {first_name}! मैं आपकी मेडिकल रिपोर्ट, स्कैन परिणाम, वाइटल्स (BP, धड़कन) "
                        "और दवाइयों के बारे में सभी सवालों का जवाब दे सकता हूँ। आप मुझसे हिंदी, English या Hinglish में बात कर सकते हैं। आप क्या जानना चाहते हैं?"
                    )
                    quick_replies = ["मेरी स्कैन रिपोर्ट समझाएं", "दवाइयों का समय", "वाइटल्स चेक करें"]
                elif language == 'hinglish':
                    reply_text = (
                        f"Namaste {first_name}! Main aapki reports, lab results, vitals aur prescriptions ke baare mein complete assistance de sakta hoon. "
                        "Aap mujhse English, Hindi ya Hinglish mein baat kar sakte hain. Aap kya poochhna chahenge?"
                    )
                    quick_replies = ["Scan report samjhayein", "Dawai schedule", "Vitals check karein"]
                else:
                    reply_text = (
                        f"Hello {first_name}! I am monitoring your clinical chart. "
                        "I can explain your scans, check drug interactions, review vital signs, or help you book doctor visits. "
                        "How can I assist you right now?"
                    )
                    quick_replies = ["Explain my latest scan", "Check drug interactions", "How are my vitals?"]

        # Save Agent reply
        agent_msg = ChatMessage.objects.create(
            conversation=conversation,
            patient=patient,
            sender="agent",
            text=reply_text,
            language=language,
            urgency=urgency,
            quick_replies=quick_replies
        )

        return Response({
            "message": ChatMessageSerializer(agent_msg).data,
            "conversation_id": conversation.id,
            "conversation_title": conversation.title
        }, status=status.HTTP_201_CREATED)

    # GET: return list of messages for default or specified conversation
    conv_id = request.query_params.get('conversation_id')
    if conv_id:
        messages = ChatMessage.objects.filter(conversation_id=conv_id)
    else:
        messages = ChatMessage.objects.filter(patient=patient)
    return Response(ChatMessageSerializer(messages, many=True).data)
