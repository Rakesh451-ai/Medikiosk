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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health, name='api_health'),
    
    # App Routing Stubs
    path('api/auth/', include('accounts.urls')),
    path('api/intake/', include('intake.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/summary/', include('summary.urls')),
    path('api/consent/', include('consent.urls')),
    path('api/triage/', include('triage.urls')),
]
