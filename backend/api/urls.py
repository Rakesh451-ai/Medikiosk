from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/signup/', views.signup_view, name='signup'),
    path('patient/', views.patient_detail, name='patient_detail'),
    path('patient/vitals/', views.update_vitals, name='update_vitals'),
    path('documents/', views.list_documents, name='list_documents'),
    path('documents/scan/', views.scan_document, name='scan_document'),
    path('medications/', views.medications_list, name='medications_list'),
    path('medications/<int:pk>/toggle/', views.toggle_medication_taken, name='toggle_medication'),
    path('agent/chat/', views.agent_chat, name='agent_chat'),
]
