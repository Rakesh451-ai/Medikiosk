from rest_framework import serializers
from .models import TriageAlert

class TriageAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageAlert
        fields = [
            'alert_id',
            'patient_identifier',
            'reason',
            'trigger_reason',
            'severity',
            'status',
            'is_resolved',
            'vitals_snapshot',
            'created_at',
            'resolved_at',
        ]
