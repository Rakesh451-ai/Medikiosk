from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import IntakeSession, IntakeMessage, ClinicalHistoryDraft
from .serializers import (
    IntakeSessionSerializer,
    IntakeMessageSerializer,
    ClinicalHistoryDraftSerializer,
    PatientMessageInputSerializer,
    StartIntakeSessionSerializer,
)
from .services.history_engine import ConversationalHistoryEngine

class CreateIntakeSessionView(APIView):
    """
    Module A: Start a new multimodal intake session.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StartIntakeSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        patient_id = serializer.validated_data.get('patient_id', 'MK-78294')
        department = serializer.validated_data.get('department', 'General Medicine')
        language = serializer.validated_data.get('language', 'en')
        is_ayush = serializer.validated_data.get('is_ayush_enabled', False)

        # Check if department is AYUSH
        if 'ayush' in department.lower() or 'ayurved' in department.lower():
            is_ayush = True

        session = IntakeSession.objects.create(
            patient_identifier=patient_id,
            department=department,
            language=language,
            is_ayush_enabled=is_ayush,
            status=IntakeSession.Status.IN_PROGRESS,
            current_stage=IntakeSession.Stage.CHIEF_COMPLAINT,
            progress_percent=10
        )

        # Create initial clinical draft
        ClinicalHistoryDraft.objects.create(session=session)

        # Generate initial AI greeting
        greeting_prompt, initial_options = ConversationalHistoryEngine.get_initial_greeting(session)
        first_ai_msg = IntakeMessage.objects.create(
            session=session,
            sender=IntakeMessage.Sender.AI,
            text=greeting_prompt,
            input_mode=IntakeMessage.InputMode.TOUCH,
            suggested_answers=initial_options,
        )

        return Response({
            "status": "success",
            "session_id": session.session_id,
            "patient_id": session.patient_identifier,
            "department": session.department,
            "language": session.language,
            "is_ayush_enabled": session.is_ayush_enabled,
            "progress_percent": session.progress_percent,
            "stage": session.current_stage,
            "initial_prompt": first_ai_msg.text,
            "suggested_answers": first_ai_msg.suggested_answers,
        }, status=status.HTTP_201_CREATED)


class IntakeSessionDetailView(APIView):
    """
    Module A: Retrieve an intake session with message trajectory and status.
    """
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_object_or_404(IntakeSession, session_id=session_id)
        serializer = IntakeSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)


class IntakeSessionMessageView(APIView):
    """
    Module A: POST /api/intake/sessions/{id}/message/
    Takes the patient's latest message, triggers history engine + red flag detection,
    updates ClinicalHistoryDraft with strict JSON schema, and returns next question.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        session = get_object_or_404(IntakeSession, session_id=session_id)
        serializer = PatientMessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        patient_text = serializer.validated_data['message']
        input_mode = serializer.validated_data.get('input_mode', IntakeMessage.InputMode.TOUCH)

        # Process turn in ConversationalHistoryEngine
        result = ConversationalHistoryEngine.process_turn(
            session=session,
            patient_text=patient_text,
            input_mode=input_mode,
        )

        return Response(result, status=status.HTTP_200_OK)


class ClinicalDraftDetailView(APIView):
    """
    Module A: Retrieve structured ClinicalHistoryDraft for a session.
    """
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_object_or_404(IntakeSession, session_id=session_id)
        draft = get_object_or_404(ClinicalHistoryDraft, session=session)
        serializer = ClinicalHistoryDraftSerializer(draft)
        return Response({
            "session_id": session.session_id,
            "flagged": session.flagged,
            "flag_reason": session.flag_reason,
            "draft": serializer.data
        }, status=status.HTTP_200_OK)


# Backward-compatible API view wrappers
@api_view(['POST'])
@permission_classes([AllowAny])
def start_intake_session(request):
    return CreateIntakeSessionView().post(request)

@api_view(['POST'])
@permission_classes([AllowAny])
def intake_message(request):
    session_id = request.data.get('session_id', 'intake-session-001')
    session = IntakeSession.objects.filter(session_id=session_id).first()
    if not session:
        session = IntakeSession.objects.create(session_id=session_id)
        ClinicalHistoryDraft.objects.get_or_create(session=session)
    return IntakeSessionMessageView().post(request, session_id=session.session_id)

@api_view(['GET'])
@permission_classes([AllowAny])
def intake_history(request, session_id):
    session = IntakeSession.objects.filter(session_id=session_id).first()
    if not session:
        return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = IntakeSessionSerializer(session)
    return Response(serializer.data)
