from rest_framework import serializers
from .models import ConsentRecord

class ConsentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentRecord
        fields = [
            'consent_id',
            'patient_identifier',
            'purpose',
            'granted',
            'granted_at',
            'revoked_at',
            'hip_id',
            'hiu_id',
            'mock_fhir_bundle',
        ]
