from django.urls import path
from .views import (
    ActiveAlertsView,
    AcknowledgeAlertView,
    ResolveAlertView,
    evaluate_triage,
    active_alerts,
)

urlpatterns = [
    path('alerts/', ActiveAlertsView.as_view(), name='triage-alerts'),
    path('alerts/<str:alert_id>/acknowledge/', AcknowledgeAlertView.as_view(), name='triage-alert-acknowledge'),
    path('alerts/<str:alert_id>/resolve/', ResolveAlertView.as_view(), name='triage-alert-resolve'),
    path('evaluate/', evaluate_triage, name='triage-evaluate'),
]
