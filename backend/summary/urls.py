from django.urls import path
from .views import (
    GenerateSessionSummaryView,
    PhysicianSummaryDetailView,
    generate_summary,
    get_patient_summary,
)

urlpatterns = [
    # RESTful Endpoints
    path('sessions/<str:session_id>/generate/', GenerateSessionSummaryView.as_view(), name='summary-generate-session'),
    path('<str:summary_id>/', PhysicianSummaryDetailView.as_view(), name='summary-detail'),

    # Backward compatibility
    path('generate/', generate_summary, name='summary-generate'),
    path('patient/<str:patient_id>/', get_patient_summary, name='summary-patient'),
    path('patient/<str:patient_id>/aggregate/', get_patient_summary, name='summary-aggregate'),
]
