from django.urls import path
from .views import (
    CreateIntakeSessionView,
    IntakeSessionDetailView,
    IntakeSessionMessageView,
    ClinicalDraftDetailView,
    start_intake_session,
    intake_message,
    intake_history,
)

urlpatterns = [
    # RESTful Session Routes
    path('sessions/', CreateIntakeSessionView.as_view(), name='intake-session-create'),
    path('sessions/<str:session_id>/', IntakeSessionDetailView.as_view(), name='intake-session-detail'),
    path('sessions/<str:session_id>/message/', IntakeSessionMessageView.as_view(), name='intake-session-message'),
    path('sessions/<str:session_id>/draft/', ClinicalDraftDetailView.as_view(), name='intake-session-draft'),

    # Backward compatibility routes
    path('start/', start_intake_session, name='intake-start'),
    path('message/', intake_message, name='intake-message'),
    path('history/<str:session_id>/', intake_history, name='intake-history'),
]
