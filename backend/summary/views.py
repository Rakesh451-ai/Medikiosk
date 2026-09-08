from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from intake.models import IntakeSession
from .models import PhysicianSummary, SummaryRevision
from .serializers import PhysicianSummarySerializer
from .services.summary_generator import generate_physician_summary_from_intake

class GenerateSessionSummaryView(APIView):
    """
    Module C: Generate structured bilingual clinical summary from Module A + B.
    Saves as status=DRAFT.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        session = get_object_or_404(IntakeSession, session_id=session_id)
        summary = generate_physician_summary_from_intake(session)
        serializer = PhysicianSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PhysicianSummaryDetailView(APIView):
    """
    Module C: Retrieve or amend/confirm clinical summary with audit logging.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, summary_id=None):
        summary = None
        cleaned_id = (summary_id or '').strip()
        is_placeholder = cleaned_id.lower() in {'', 'null', 'undefined', 'ehr profile', 'patient', 'self', 'me', 'none'}
        if cleaned_id and not is_placeholder:
            summary = PhysicianSummary.objects.filter(
                summary_id=cleaned_id
            ).first() or PhysicianSummary.objects.filter(
                patient_identifier=cleaned_id
            ).first()

        if not summary and request.user.is_authenticated:
            summary = PhysicianSummary.objects.filter(patient=request.user).first()

        profile = getattr(request.user, 'patient_profile', None)
        pid = profile.mock_abha_id if profile else request.user.username

        # If still not found, synthesize on demand from existing MedicalDocuments
        if not summary and request.user.is_authenticated:
            from documents.models import MedicalDocument
            docs = MedicalDocument.objects.filter(patient=request.user)
            if docs.exists():
                latest_doc = docs.first()
                hpi_parts = [f"Summary compiled from verified health records ({docs.count()} document(s) on file)."]
                if latest_doc.title:
                    hpi_parts.append(f"Most recent record: {latest_doc.title} ({latest_doc.doc_type}).")
                summary = PhysicianSummary.objects.create(
                    patient=request.user,
                    patient_identifier=pid,
                    status=PhysicianSummary.Status.CONFIRMED,
                    chief_complaint=latest_doc.title or "General Health Record Summary",
                    hpi=" ".join(hpi_parts),
                    past_medical_surgical_history="No previous surgeries recorded.",
                    allergies=profile.allergies if profile else [],
                    bilingual_summary={
                        "hi": {
                            "chief_complaint": latest_doc.title or "स्वास्थ्य सारांश",
                            "hpi": "मरीज़ के मेडिकल रिकॉर्ड के आधार पर सारांश तैयार किया गया है।",
                            "doctor_action": "नियमित रूप से स्वास्थ्य की निगरानी करें।"
                        }
                    },
                    doctor_notes=f"Synthesized from {docs.count()} clinical records."
                )

        if not summary:
            return Response({
                "summary_id": None,
                "patient_identifier": pid,
                "status": "DRAFT",
                "chief_complaint": "No recent clinical summary recorded.",
                "hpi": "No medical documents or consultation notes have been uploaded yet.",
                "past_medical_surgical_history": "",
                "drug_history": [],
                "allergies": profile.allergies if profile else [],
                "investigations": [],
                "doctor_notes": "",
                "bilingual_summary": {},
                "created_at": timezone.now().isoformat()
            }, status=status.HTTP_200_OK)

        if summary.patient and summary.patient != request.user and not getattr(request.user, 'is_clinical_staff', False):
            return Response(
                {"error": "Forbidden: You cannot access another patient's clinical summary."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PhysicianSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, summary_id):
        summary = get_object_or_404(PhysicianSummary, summary_id=summary_id)
        if summary.patient and summary.patient != request.user and not getattr(request.user, 'is_clinical_staff', False):
            return Response(
                {"error": "Forbidden: You cannot modify another patient's clinical summary."},
                status=status.HTTP_403_FORBIDDEN
            )
        changes = {}

        # Log fields modified
        for field in ['chief_complaint', 'hpi', 'doctor_notes', 'past_medical_surgical_history', 'status']:
            if field in request.data and getattr(summary, field) != request.data[field]:
                changes[field] = {
                    'before': getattr(summary, field),
                    'after': request.data[field]
                }
                setattr(summary, field, request.data[field])

        # If confirming
        if request.data.get('status') == PhysicianSummary.Status.CONFIRMED:
            summary.status = PhysicianSummary.Status.CONFIRMED
            summary.confirmed_at = timezone.now()
            if request.user.is_authenticated:
                summary.confirmed_by = request.user

        summary.save()

        # Create audit revision log
        if changes:
            SummaryRevision.objects.create(
                summary=summary,
                edited_by=request.user if request.user.is_authenticated else None,
                changes=changes,
                revision_notes=request.data.get('revision_notes', 'Doctor amendments saved')
            )

        serializer = PhysicianSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)


# Backward-compatible view wrappers
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_summary(request):
    session_id = request.data.get('session_id', 'intake-session-001')
    session = IntakeSession.objects.filter(session_id=session_id).first()
    if not session:
        session = IntakeSession.objects.create(session_id=session_id)
    summary = generate_physician_summary_from_intake(session)
    return Response(PhysicianSummarySerializer(summary).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_summary(request, patient_id):
    cleaned = (patient_id or '').strip()
    is_placeholder = cleaned.lower() in {'', 'null', 'undefined', 'ehr profile', 'patient', 'self', 'me', 'none'}
    if getattr(request.user, 'is_patient', False):
        profile = getattr(request.user, 'patient_profile', None)
        allowed = {request.user.username}
        if profile:
            allowed.update([profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone])
        if not is_placeholder and cleaned not in allowed:
            return Response(
                {"error": "Forbidden: You cannot access another patient's summary."},
                status=status.HTTP_403_FORBIDDEN
            )
    return PhysicianSummaryDetailView().get(request, None if is_placeholder else cleaned)

