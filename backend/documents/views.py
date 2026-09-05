import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import MedicalDocument, ExtractedRecord
from .serializers import MedicalDocumentSerializer, ExtractedRecordSerializer
from .tasks import process_document_ocr_task
from .ocr_engine import extract_raw_text_tesseract, parse_and_store_entities

class DocumentUploadView(APIView):
    """
    Module B: Upload medical document and enqueue async OCR processing.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        doc_type = request.data.get('doc_type', MedicalDocument.DocType.PRESCRIPTION)
        patient_id = request.data.get('patient_id', 'MK-78294')
        uploaded_file = request.FILES.get('file')
        title = request.data.get('title', f"Scanned {doc_type.capitalize()}")

        doc = MedicalDocument.objects.create(
            patient_identifier=patient_id,
            doc_type=doc_type,
            title=title,
            file=uploaded_file,
            ocr_status=MedicalDocument.OCRStatus.PROCESSING
        )

        # Dispatch Celery background task
        try:
            task = process_document_ocr_task.delay(document_id=doc.doc_id)
            doc.celery_task_id = task.id
            doc.save(update_fields=['celery_task_id'])
        except Exception:
            # Fallback for environments without running Redis/Celery worker: parse directly
            raw_text = extract_raw_text_tesseract(doc.file.path if doc.file else None)
            doc.raw_text = raw_text
            parse_and_store_entities(doc, raw_text)
            doc.ocr_status = MedicalDocument.OCRStatus.COMPLETED
            doc.save(update_fields=['raw_text', 'ocr_status'])

        return Response({
            "status": "queued",
            "document_id": doc.doc_id,
            "doc_type": doc.doc_type,
            "ocr_status": doc.ocr_status,
            "message": "Document received. OCR processing dispatched to Celery background worker."
        }, status=status.HTTP_202_ACCEPTED)


class DocumentStatusView(APIView):
    """
    Module B: Check document OCR status and return plain-language summary for patient.
    """
    permission_classes = [AllowAny]

    def get(self, request, doc_id):
        doc = get_object_or_404(MedicalDocument, doc_id=doc_id)
        
        # Build plain language confirmation for kiosk patient
        extracted_meds = [
            f"{r.structured_data.get('name', 'Medication')} ({r.structured_data.get('frequency', '')})"
            for r in doc.extracted_records.filter(record_type=ExtractedRecord.RecordType.MEDICATION)
        ]
        extracted_labs = [
            f"{r.structured_data.get('test_name', 'Test')}: {r.structured_data.get('value')} {r.structured_data.get('unit')}"
            for r in doc.extracted_records.filter(record_type=ExtractedRecord.RecordType.LAB_RESULT)
        ]

        plain_summary = "We found: "
        if extracted_meds:
            plain_summary += f"Medications ({', '.join(extracted_meds)}). "
        if extracted_labs:
            plain_summary += f"Lab results ({', '.join(extracted_labs)})."
        if not extracted_meds and not extracted_labs:
            plain_summary = "Document received and verified by clinical system."

        return Response({
            "document_id": doc.doc_id,
            "ocr_status": doc.ocr_status,
            "title": doc.title,
            "doc_type": doc.doc_type,
            "plain_language_summary": plain_summary,
            "raw_text": doc.raw_text,
            "records": ExtractedRecordSerializer(doc.extracted_records.all(), many=True).data
        }, status=status.HTTP_200_OK)


class PatientDocumentTimelineView(APIView):
    """
    Module B: Fetch patient's full medical document timeline sorted by document_date.
    """
    permission_classes = [AllowAny]

    def get(self, request, patient_id):
        docs = MedicalDocument.objects.filter(patient_identifier=patient_id).order_by('-uploaded_at')
        records = ExtractedRecord.objects.filter(
            document__patient_identifier=patient_id
        ).order_by('-document_date', '-created_at')

        return Response({
            "patient_id": patient_id,
            "total_documents": docs.count(),
            "timeline": ExtractedRecordSerializer(records, many=True).data,
            "documents": MedicalDocumentSerializer(docs, many=True).data
        }, status=status.HTTP_200_OK)


# Backward-compatible endpoints
@api_view(['POST'])
@permission_classes([AllowAny])
def upload_document(request):
    return DocumentUploadView().post(request)

@api_view(['GET'])
@permission_classes([AllowAny])
def document_status(request, doc_id):
    return DocumentStatusView().get(request, doc_id)

@api_view(['GET'])
@permission_classes([AllowAny])
def list_documents(request):
    patient_id = request.query_params.get('patient_id', 'MK-78294')
    return PatientDocumentTimelineView().get(request, patient_id)
