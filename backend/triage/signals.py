import uuid
import logging
from django.dispatch import receiver
from intake.signals import red_flag_detected
from triage.models import TriageAlert

logger = logging.getLogger(__name__)

@receiver(red_flag_detected)
def handle_intake_red_flag(sender, session, red_flag_reason, raw_text, **kwargs):
    """
    CLINICAL SAFETY: Flags life-threatening patterns for immediate clinician attention.
    DOES NOT DIAGNOSE. Creates a TriageAlert and broadcasts to connected triage staff.
    """
    try:
        alert_id = f"alert-{session.session_id[-8:]}"
        alert, created = TriageAlert.objects.get_or_create(
            alert_id=alert_id,
            defaults={
                'patient': session.patient,
                'patient_identifier': session.patient_identifier,
                'session': session,
                'severity': TriageAlert.Severity.CRITICAL,
                'status': TriageAlert.Status.OPEN,
                'reason': red_flag_reason,
                'trigger_reason': red_flag_reason,
                'vitals_snapshot': {
                    "source": "conversational_intake",
                    "trigger_phrase": raw_text
                },
                'is_resolved': False,
            }
        )
        if not created and alert.status == TriageAlert.Status.RESOLVED:
            alert.status = TriageAlert.Status.OPEN
            alert.reason = red_flag_reason
            alert.save(update_fields=['status', 'reason'])

        logger.info(f"[Triage Alert Triggered] {alert.alert_id}: {red_flag_reason}")

        # Attempt WebSocket broadcast via Channels if channel layer is configured
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    "triage_staff",
                    {
                        "type": "triage_alert_message",
                        "data": {
                            "alert_id": alert.alert_id,
                            "patient_identifier": alert.patient_identifier,
                            "severity": alert.severity,
                            "reason": alert.reason,
                            "created_at": alert.created_at.isoformat()
                        }
                    }
                )
        except Exception as ws_err:
            logger.debug(f"Channels broadcast skipped or inactive: {ws_err}")

    except Exception as e:
        logger.error(f"Error handling intake red flag: {e}")
