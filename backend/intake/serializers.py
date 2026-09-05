from rest_framework import serializers
from .models import IntakeSession, IntakeMessage, ClinicalHistoryDraft

class IntakeMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntakeMessage
        fields = [
            'id',
            'sender',
            'text',
            'input_mode',
            'suggested_answers',
            'extracted_entities',
            'timestamp',
        ]


class ClinicalHistoryDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalHistoryDraft
        fields = [
            'chief_complaint',
            'hpi',
            'past_medical_history',
            'drug_history',
            'allergies',
            'family_history',
            'personal_history',
            'ayush_fields',
            'updated_at',
        ]


class IntakeSessionSerializer(serializers.ModelSerializer):
    messages = IntakeMessageSerializer(many=True, read_only=True)
    clinical_draft = ClinicalHistoryDraftSerializer(read_only=True)

    class Meta:
        model = IntakeSession
        fields = [
            'session_id',
            'patient_identifier',
            'department',
            'status',
            'language',
            'is_ayush_enabled',
            'flagged',
            'flag_reason',
            'progress_percent',
            'current_stage',
            'started_at',
            'completed_at',
            'messages',
            'clinical_draft',
        ]


class PatientMessageInputSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    input_mode = serializers.ChoiceField(
        choices=IntakeMessage.InputMode.choices,
        default=IntakeMessage.InputMode.TOUCH
    )


class StartIntakeSessionSerializer(serializers.Serializer):
    patient_id = serializers.CharField(max_length=64, required=False, default='MK-78294')
    department = serializers.CharField(max_length=100, required=False, default='General Medicine')
    language = serializers.CharField(max_length=20, required=False, default='en')
    is_ayush_enabled = serializers.BooleanField(required=False, default=False)
