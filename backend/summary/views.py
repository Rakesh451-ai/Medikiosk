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
from .services.summary_generator import generate_physician_summary_from_intake, build_patient_health_summary
from accounts.auth_utils import find_user_by_identifier

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
    Dynamically generates patient health summary dashboard data from actual records.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, summary_id=None):
        cleaned_id = (summary_id or '').strip()
        is_placeholder = cleaned_id.lower() in {'', 'null', 'undefined', 'ehr profile', 'patient', 'self', 'me', 'none'}

        # 1. Check if direct query by summary_id on a session without assigned patient
        if cleaned_id and not is_placeholder:
            spec_summary = PhysicianSummary.objects.filter(summary_id=cleaned_id).first()
            if spec_summary and not spec_summary.patient:
                serializer = PhysicianSummarySerializer(spec_summary)
                return Response(serializer.data, status=status.HTTP_200_OK)

        # 2. Determine target user & verify object-level authorization
        target_user = request.user
        if request.user.is_patient:
            target_user = request.user
            if cleaned_id and not is_placeholder:
                profile = getattr(request.user, 'patient_profile', None)
                allowed = {request.user.username, str(request.user.id)}
                if profile:
                    allowed.update(filter(None, [profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone]))
                owns_summary = PhysicianSummary.objects.filter(summary_id=cleaned_id, patient=request.user).exists()
                if cleaned_id not in allowed and not owns_summary:
                    return Response(
                        {"error": "Forbidden: You cannot access another patient's clinical summary."},
                        status=status.HTTP_403_FORBIDDEN
                    )
        elif request.user.is_clinical_staff:
            if cleaned_id and not is_placeholder:
                found_summary = PhysicianSummary.objects.filter(summary_id=cleaned_id).first()
                if found_summary and found_summary.patient:
                    target_user = found_summary.patient
                else:
                    found, _, _ = find_user_by_identifier(cleaned_id)
                    if found:
                        target_user = found
            else:
                from accounts.models import User
                recent_patient = User.objects.filter(role=User.Role.PATIENT).order_by('-last_login', '-id').first()
                if recent_patient:
                    target_user = recent_patient

        # 3. Dynamically build comprehensive summary from actual patient database records
        summary_payload = build_patient_health_summary(target_user)
        return Response(summary_payload, status=status.HTTP_200_OK)

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

