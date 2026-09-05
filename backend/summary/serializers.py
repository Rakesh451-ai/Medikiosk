from rest_framework import serializers
from .models import PhysicianSummary, SummaryRevision

class SummaryRevisionSerializer(serializers.ModelSerializer):
    edited_by_name = serializers.CharField(source='edited_by.get_full_name', read_only=True)

    class Meta:
        model = SummaryRevision
        fields = [
            'id',
            'edited_by',
            'edited_by_name',
            'changes',
            'revision_notes',
            'created_at',
        ]


class PhysicianSummarySerializer(serializers.ModelSerializer):
    revisions = SummaryRevisionSerializer(many=True, read_only=True)

    class Meta:
        model = PhysicianSummary
        fields = [
            'summary_id',
            'patient_identifier',
            'status',
            'chief_complaint',
            'hpi',
            'past_medical_surgical_history',
            'drug_history',
            'allergies',
            'family_history',
            'personal_history',
            'review_of_systems',
            'investigations',
            'previous_procedures',
            'regional_language',
            'bilingual_summary',
            'doctor_notes',
            'confirmed_at',
            'created_at',
            'updated_at',
            'revisions',
        ]
        read_only_fields = ['summary_id', 'created_at', 'updated_at', 'confirmed_at']
