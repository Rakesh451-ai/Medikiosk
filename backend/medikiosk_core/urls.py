from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_health(request):
    return JsonResponse({
        "status": "online",
        "service": "MediKiosk Core Backend (DRF)",
        "version": "1.0.0",
        "modules": {
            "accounts": "/api/auth/",
            "intake": "/api/intake/",
            "documents": "/api/documents/",
            "summary": "/api/summary/",
            "consent": "/api/consent/",
            "triage": "/api/triage/"
        }
    })

from accounts.views import (
    patient_detail_api,
    medications_list_api,
    medication_taken_api,
    medication_toggle_api,
    vitals_api,
    agent_chat_api,
    agent_conversations_api
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health, name='api_health'),
    
    # Patient Data, Medications & Vitals
    path('api/patient/', patient_detail_api, name='api-patient-detail'),
    path('api/patient/vitals/', vitals_api, name='api-patient-vitals'),
    path('api/patient/vitals/history/', vitals_api, name='api-patient-vitals-history'),
    path('api/medications/', medications_list_api, name='api-medications-list'),
    path('api/medications/<int:med_id>/taken/', medication_taken_api, name='api-medication-taken'),
    path('api/medications/<int:med_id>/toggle/', medication_toggle_api, name='api-medication-toggle'),
    path('api/agent/conversations/', agent_conversations_api, name='api-agent-conversations'),
    path('api/agent/chat/', agent_chat_api, name='api-agent-chat'),

    # App Routing Stubs
    path('api/auth/', include('accounts.urls')),
    path('api/admin/', include('accounts.admin_urls')),
    path('api/intake/', include('intake.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/summary/', include('summary.urls')),
    path('api/consent/', include('consent.urls')),
    path('api/triage/', include('triage.urls')),
]
