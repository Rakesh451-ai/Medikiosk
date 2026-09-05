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
    permission_classes = [AllowAny]

    def get(self, request, summary_id):
        summary = PhysicianSummary.objects.filter(
            summary_id=summary_id
        ).first() or PhysicianSummary.objects.filter(
            patient_identifier=summary_id
        ).first()

        if not summary:
            return Response({"error": "Summary not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = PhysicianSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, summary_id):
        summary = get_object_or_404(PhysicianSummary, summary_id=summary_id)
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
@permission_classes([AllowAny])
def generate_summary(request):
    session_id = request.data.get('session_id', 'intake-session-001')
    session = IntakeSession.objects.filter(session_id=session_id).first()
    if not session:
        session = IntakeSession.objects.create(session_id=session_id)
    summary = generate_physician_summary_from_intake(session)
    return Response(PhysicianSummarySerializer(summary).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_summary(request, patient_id):
    return PhysicianSummaryDetailView().get(request, patient_id)
