from django.urls import path
from .views import (
    DocumentUploadView,
    DocumentStatusView,
    PatientDocumentTimelineView,
    list_documents,
)

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('status/<str:doc_id>/', DocumentStatusView.as_view(), name='document-status'),
    path('timeline/<str:patient_id>/', PatientDocumentTimelineView.as_view(), name='document-timeline'),
    path('list/', list_documents, name='document-list'),
]
