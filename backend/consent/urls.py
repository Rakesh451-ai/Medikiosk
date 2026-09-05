from django.urls import path
from .views import (
    GrantConsentView,
    PatientConsentRecordsView,
    RevokeConsentView,
    MockABDMProfileView,
    MockABDMPushView,
    grant_consent,
    get_consent_status,
    mock_abdm_fhir_sync,
)

urlpatterns = [
    path('records/', GrantConsentView.as_view(), name='consent-grant'),
    path('records/<str:patient_id>/', PatientConsentRecordsView.as_view(), name='consent-patient-records'),
    path('records/<str:consent_id>/revoke/', RevokeConsentView.as_view(), name='consent-revoke'),
    path('abdm/profile/', MockABDMProfileView.as_view(), name='consent-abdm-profile'),
    path('abdm/push/', MockABDMPushView.as_view(), name='consent-abdm-push'),

    # Backward compatibility
    path('grant/', grant_consent, name='consent-grant-legacy'),
    path('status/<str:patient_id>/', get_consent_status, name='consent-status-legacy'),
    path('abdm/sync/', mock_abdm_fhir_sync, name='consent-abdm-sync-legacy'),
]
