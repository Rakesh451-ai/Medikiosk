from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from .models import Patient, Vitals, MedicalDocument, Medication, ChatMessage
from .serializers import (
    PatientSerializer, VitalsSerializer, MedicalDocumentSerializer,
    MedicationSerializer, ChatMessageSerializer
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

        # Initial Agent welcome message
        ChatMessage.objects.create(
            patient=patient,
            sender="agent",
            text="Hello Sarah! Welcome to MediKiosk Mobile AI Health Assistant. I have reviewed your latest vitals and medications. How can I assist you today?",
            urgency="normal",
            quick_replies=[
                "Check medication safety",
                "Explain my latest scan",
                "How are my vitals?",
                "Book doctor follow-up"
            ]
        )
    return patient


@api_view(['GET'])
def health_check(request):
    patient_count = Patient.objects.count()
    doc_count = MedicalDocument.objects.count()
    return Response({
        "status": "online",
        "service": "MediKiosk Django REST API",
        "version": "2.0.0",
        "timestamp": timezone.now().isoformat(),
        "database": {
            "patients": patient_count,
            "documents": doc_count
        }
    })


@api_view(['POST'])
def login_view(request):
    patient_id = request.data.get('patient_id', 'MK-78294').strip()
    pin = request.data.get('pin', '1234').strip()

    # If demo or standard ID
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

    # Initial default vitals
    Vitals.objects.create(
        patient=patient,
        heart_rate=72,
        bp_systolic=120,
        bp_diastolic=80,
        spo2=99,
        temperature=98.6,
        glucose=95
    )

    # Welcome message
    ChatMessage.objects.create(
        patient=patient,
        sender="agent",
        text=f"Welcome {name}! Your MediKiosk digital patient chart has been created with ID {new_id}. You can scan documents, monitor vitals, or ask me any health questions.",
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
    if pid:
        patient = Patient.objects.filter(patient_id__iexact=pid).first()
    else:
        patient = get_or_create_default_patient()

    if not patient:
        patient = get_or_create_default_patient()

    serializer = PatientSerializer(patient)
    return Response(serializer.data)


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
    serializer = MedicalDocumentSerializer(docs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def scan_document(request):
    pid = request.data.get('patient_id', 'MK-78294')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() or get_or_create_default_patient()

    # Preset templates or uploaded custom file
    doc_type = request.data.get('doc_type', 'Prescription')
    title = request.data.get('title', 'Scanned Clinical Prescription')
    facility = request.data.get('facility', 'Metro General Hospital')
    doctor = request.data.get('doctor', 'Dr. Sarah Jenkins, MD')
    diagnosis = request.data.get('diagnosis', 'Extracted via Optical Document Recognition')
    extracted_text = request.data.get('extracted_text', '')
    confidence = request.data.get('confidence', '99.4%')

    # Handle file upload if present
    uploaded_file = request.FILES.get('file', None)
    if uploaded_file and not extracted_text:
        extracted_text = f"FILE SCAN: {uploaded_file.name}\nSize: {uploaded_file.size} bytes\nProcessed by Optical Kiosk Engine."
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

    # If medications were parsed in payload
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
        # Default extracted medication for demonstration
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

    serializer = MedicalDocumentSerializer(doc)
    return Response({
        "success": True,
        "message": "Document successfully parsed and synced",
        "document": serializer.data,
        "allergy_warning": "Penicillin" in [m.name for m in created_meds] or any("amoxicillin" in m.name.lower() for m in created_meds)
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


@api_view(['GET', 'POST'])
def agent_chat(request):
    pid = request.query_params.get('patient_id') or request.data.get('patient_id')
    patient = Patient.objects.filter(patient_id__iexact=pid).first() if pid else get_or_create_default_patient()

    if request.method == 'POST':
        user_text = request.data.get('text', '').strip()
        if not user_text:
            return Response({"error": "Message text is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Save user message
        ChatMessage.objects.create(
            patient=patient,
            sender="patient",
            text=user_text
        )

        # Intelligent Clinical Evaluation Engine
        lower_query = user_text.lower()
        urgency = "normal"
        reply_text = ""
        quick_replies = [
            "Check drug interactions",
            "Explain my latest scan",
            "How are my vitals today?",
            "Book clinic consultation"
        ]

        # Clinical Allergy & Drug Safety Check
        has_penicillin_allergy = any("penicillin" in a.lower() for a in patient.allergies)
        if ("amoxicillin" in lower_query or "allergy" in lower_query or "interaction" in lower_query or "safe" in lower_query) and has_penicillin_allergy:
            urgency = "alert"
            reply_text = (
                "⚠️ CRITICAL ALLERGY CONTRAINDICATION ALERT:\n"
                f"Your chart indicates an allergy to: {', '.join(patient.allergies)}.\n"
                "Amoxicillin belongs to the penicillin class of antibiotics. Taking it may cause an allergic reaction.\n"
                "Recommendation: Do NOT start this medication until speaking with Dr. Michael Chen or your attending pharmacist for a non-penicillin alternative (such as Azithromycin or Clarithromycin)."
            )
            quick_replies = ["Call Doctor Now", "Request Alternative Medication", "Review All Allergies"]

        elif "scan" in lower_query or "x-ray" in lower_query or "xray" in lower_query or "radiology" in lower_query:
            reply_text = (
                "I've examined your Chest Radiography report from Advanced Imaging Center. "
                "The findings are completely normal: clear lung fields, no signs of pneumonia, consolidation, "
                "or fluid, and a normal cardiothoracic ratio (0.45). Everything looks clear!"
            )
            quick_replies = ["Explain lab blood panel", "View scan document", "Print summary"]

        elif "lab" in lower_query or "blood" in lower_query or "cholesterol" in lower_query or "glucose" in lower_query:
            reply_text = (
                "Your latest BioPath Comprehensive Metabolic Panel shows healthy metrics:\n"
                "• Fasting Glucose: 92 mg/dL (Normal target: 70-99)\n"
                "• Hemoglobin: 13.8 g/dL (Healthy range)\n"
                "• Total Cholesterol: 198 mg/dL (Desirable <200)\n"
                "• HDL 'Good' Cholesterol: 58 mg/dL (Optimal >50)\n"
                "Your metabolic health markers are in good standing."
            )
            quick_replies = ["Check medication schedule", "Dietary suggestions", "Print lab report"]

        elif "vital" in lower_query or "bp" in lower_query or "pressure" in lower_query or "heart" in lower_query:
            v = patient.vitals_history.first()
            reply_text = (
                f"Your live kiosk vitals are optimal:\n"
                f"• Heart Rate: {v.heart_rate if v else 74} bpm (Normal resting rhythm)\n"
                f"• Blood Pressure: {v.bp_systolic if v else 118}/{v.bp_diastolic if v else 78} mmHg (Standard target)\n"
                f"• Oxygen Saturation (SpO2): {v.spo2 if v else 99}%\n"
                f"• Body Temperature: {v.temperature if v else 98.4}°F (Afebril)"
            )
            quick_replies = ["Re-check vitals", "Medication schedule", "Consult nurse"]

        elif "schedule" in lower_query or "timing" in lower_query or "take" in lower_query or "dose" in lower_query:
            active_meds = patient.medications.filter(status="Active")
            med_lines = [f"• {m.name} ({m.dose}): {m.timing} - {m.instruction}" for m in active_meds]
            reply_text = "Here is your daily medication schedule:\n" + "\n".join(med_lines) + "\n\nRemember to stay hydrated and mark doses as taken in your app!"
            quick_replies = ["Mark morning doses taken", "Set refill alert", "Ask allergy check"]

        elif "doctor" in lower_query or "appointment" in lower_query or "consult" in lower_query:
            reply_text = (
                f"Your primary physician is {patient.primary_doctor}. "
                "Clinic office hours are Monday–Friday 8:00 AM - 5:00 PM. "
                "Would you like me to request an in-person follow-up or a telemedicine consultation?"
            )
            quick_replies = ["Request Tomorrow 11:30 AM", "Request Telehealth Call", "Message Doctor Office"]

        else:
            reply_text = (
                f"Thank you, {patient.name.split()[0]}. I'm actively monitoring your chart. "
                "You can ask me to explain any scan results, review drug interactions, check your vital signs, "
                "or assist with doctor scheduling. How can I best help you right now?"
            )

        agent_msg = ChatMessage.objects.create(
            patient=patient,
            sender="agent",
            text=reply_text,
            urgency=urgency,
            quick_replies=quick_replies
        )

        return Response(ChatMessageSerializer(agent_msg).data, status=status.HTTP_201_CREATED)

    # GET: return list of messages
    messages = ChatMessage.objects.filter(patient=patient)
    return Response(ChatMessageSerializer(messages, many=True).data)
