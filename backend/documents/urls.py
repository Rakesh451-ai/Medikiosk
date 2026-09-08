from django.urls import path
from .views import (
    DocumentUploadView,
    DocumentStatusView,
    PatientDocumentTimelineView,
    DocumentScanView,
    DocumentConfirmView,
    list_documents,
)

urlpatterns = [
    path('scan/', DocumentScanView.as_view(), name='document-scan'),
    path('confirm/', DocumentConfirmView.as_view(), name='document-confirm'),
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('status/<str:doc_id>/', DocumentStatusView.as_view(), name='document-status'),
    path('timeline/<str:patient_id>/', PatientDocumentTimelineView.as_view(), name='document-timeline'),
    path('patient/<str:patient_id>/timeline/', PatientDocumentTimelineView.as_view(), name='document-patient-timeline'),
    path('list/', list_documents, name='document-list'),
    path('', list_documents, name='document-root'),
    path('<str:doc_id>/', DocumentStatusView.as_view(), name='document-detail'),
]
