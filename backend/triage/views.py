from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import TriageAlert
from .serializers import TriageAlertSerializer

class ActiveAlertsView(APIView):
    """
    Triage: Retrieve queue of patient red-flag alerts for staff dashboards.
    CLINICAL SAFETY: Flags information for human review only — does NOT diagnose.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status_filter = request.query_params.get('status')
        alerts = TriageAlert.objects.all().order_by('-created_at')
        if status_filter:
            alerts = alerts.filter(status=status_filter)
        serializer = TriageAlertSerializer(alerts, many=True)
        return Response({
            "disclaimer": "CLINICAL SAFETY: Flags information for human attention — does not diagnose.",
            "total": alerts.count(),
            "alerts": serializer.data
        }, status=status.HTTP_200_OK)


class AcknowledgeAlertView(APIView):
    """
    Triage Staff marks an alert as acknowledged.
    """
    permission_classes = [AllowAny]

    def post(self, request, alert_id):
        alert = get_object_or_404(TriageAlert, alert_id=alert_id)
        alert.status = TriageAlert.Status.ACKNOWLEDGED
        if request.user.is_authenticated:
            alert.acknowledged_by = request.user
        alert.save(update_fields=['status', 'acknowledged_by'])
        return Response({
            "message": f"Alert {alert_id} acknowledged by staff.",
            "status": alert.status
        }, status=status.HTTP_200_OK)


class ResolveAlertView(APIView):
    """
    Doctor / Triage Officer marks an alert as clinically resolved.
    """
    permission_classes = [AllowAny]

    def post(self, request, alert_id):
        alert = get_object_or_404(TriageAlert, alert_id=alert_id)
        alert.status = TriageAlert.Status.RESOLVED
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        if request.user.is_authenticated:
            alert.resolved_by = request.user
        alert.save(update_fields=['status', 'is_resolved', 'resolved_at', 'resolved_by'])
        return Response({
            "message": f"Alert {alert_id} resolved by clinician.",
            "status": alert.status
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def evaluate_triage(request):
    """
    Triage scoring: Evaluates vitals and returns urgency level for queue ordering.
    Does NOT diagnose.
    """
    patient_id = request.data.get('patient_id', 'MK-78294')
    vitals = request.data.get('vitals', {})

    red_flags = []
    urgency_level = "GREEN"

    spo2 = vitals.get('spo2', 99)
    if isinstance(spo2, (int, float)) and spo2 < 92:
        red_flags.append("Hypoxemia: SpO2 < 92% detected on room air")
        urgency_level = "RED"

    pulse = vitals.get('pulse', 75)
    if isinstance(pulse, (int, float)) and (pulse > 120 or pulse < 50):
        red_flags.append(f"Heart rate instability: {pulse} bpm")
        if urgency_level != "RED":
            urgency_level = "YELLOW"

    return Response({
        "disclaimer": "CLINICAL SAFETY: Flags information for human attention — does not diagnose.",
        "patient_id": patient_id,
        "urgency_level": urgency_level,
        "red_flags": red_flags,
        "requires_immediate_nurse": urgency_level == "RED"
    })

# Backward compatibility alias
@api_view(['GET'])
@permission_classes([AllowAny])
def active_alerts(request):
    return ActiveAlertsView().get(request)
