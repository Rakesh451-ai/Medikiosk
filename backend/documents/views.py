"""
Documents API Views
Handles document upload, synchronous and asynchronous optical parsing,
staged confirmation, and timeline views with strict object-level authorization.
"""

import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.db import models
from django.db.models import Q
from django.shortcuts import get_object_or_404

from accounts.models import User, PatientProfile
from accounts.auth_utils import find_user_by_identifier
from api.services.document_service import DocumentService

from .models import MedicalDocument, ExtractedRecord
from .serializers import MedicalDocumentSerializer, ExtractedRecordSerializer
from .tasks import process_document_ocr_task
from .ocr_engine import extract_raw_text_tesseract, parse_and_store_entities


class DocumentScanView(APIView):
    """
    Step 3-4: Processes uploaded medical document via the real DocumentService pipeline.
    Validates file, performs OCR, extracts medical entities, evaluates allergies,
    and returns structured review results WITHOUT finalizing medical records until confirmed.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        client_text = request.data.get('extracted_text', '').strip()
        if not uploaded_file:
            return Response({
                "status": "error",
                "can_extract": False,
                "error": "No file was uploaded. Please select a PDF (.pdf) or image (.png, .jpg, .jpeg) file."
            }, status=status.HTTP_400_BAD_REQUEST)

        doc_service = DocumentService()
        result = doc_service.process_uploaded_file(uploaded_file, user=request.user, client_text=client_text)

        if not result.get('success') or not result.get('can_extract'):
            return Response({
                "status": "error",
                "can_extract": False,
                "error": result.get('error') or "We couldn't read this document. Try uploading a clearer scan or photo."
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "status": "success",
            "can_extract": True,
            "document": result['document'],
            "parsed_data": result['parsed_data'],
            "medications": result['medications'],
            "lab_results": result['lab_results'],
            "allergy_warning": result['allergy_warning'],
            "allergy_message": result['allergy_message'],
            "flagged_drugs": result.get('flagged_drugs', []),
            "message": "Document processed successfully. Please review and confirm to save to your records."
        }, status=status.HTTP_200_OK)


class DocumentConfirmView(APIView):
    """
    Step 5: Confirms reviewed medical data and commits to database.
    Creates MedicalDocument, ExtractedRecords, PatientMedications, and updates profile.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        staged_data = request.data
        if not staged_data:
            return Response({
                "status": "error",
                "error": "Document data is required to confirm."
            }, status=status.HTTP_400_BAD_REQUEST)

        doc_service = DocumentService()
        saved = doc_service.confirm_and_save_document(
            user=request.user,
            staged_data=staged_data,
            file_obj=request.FILES.get('file')
        )

        profile_data = None
        if hasattr(request.user, 'patient_profile'):
            from accounts.serializers import PatientProfileSerializer
            profile_data = PatientProfileSerializer(request.user.patient_profile).data

        return Response({
            "status": "success",
            "message": "Document confirmed and saved to your medical records.",
            "document": saved,
            "updated_profile": profile_data
        }, status=status.HTTP_201_CREATED)


class DocumentUploadView(APIView):
    """
    Upload medical document and enqueue async OCR processing.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        doc_type = request.data.get('doc_type', MedicalDocument.DocType.PRESCRIPTION)
        uploaded_file = request.FILES.get('file')
        title = request.data.get('title', f"Scanned {doc_type.capitalize()}")

        profile = getattr(request.user, 'patient_profile', None)
        pid = profile.mock_abha_id if profile else request.user.username

        doc = MedicalDocument.objects.create(
            patient=request.user,
            patient_identifier=pid,
            doc_type=doc_type,
            title=title,
            file=uploaded_file,
            ocr_status=MedicalDocument.OCRStatus.PROCESSING
        )

        try:
            task = process_document_ocr_task.delay(document_id=doc.doc_id)
            doc.celery_task_id = task.id
            doc.save(update_fields=['celery_task_id'])
        except Exception:
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
            "message": "Document received. OCR processing dispatched."
        }, status=status.HTTP_202_ACCEPTED)


def is_patient_placeholder(pid):
    if not pid:
        return True
    return str(pid).strip().lower() in {'', 'null', 'undefined', 'ehr profile', 'patient', 'self', 'me', 'none'}


def get_document_by_id_or_uuid(doc_id):
    if str(doc_id).isdigit():
        d = MedicalDocument.objects.filter(id=int(doc_id)).first()
        if d:
            return d
    return MedicalDocument.objects.filter(doc_id=doc_id).first()


class DocumentStatusView(APIView):
    """
    Check document OCR status or delete document with strict object-level access control.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        doc = get_document_by_id_or_uuid(doc_id)
        if not doc:
            return Response({"error": "Medical document not found."}, status=status.HTTP_404_NOT_FOUND)

        is_owner = False
        if doc.patient == request.user:
            is_owner = True
        elif doc.patient_identifier:
            allowed = {request.user.username, str(request.user.id)}
            profile = getattr(request.user, 'patient_profile', None)
            if profile:
                allowed.update(filter(None, [profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone]))
            if doc.patient_identifier in allowed:
                is_owner = True

        if not is_owner and not request.user.is_clinical_staff:
            return Response(
                {"error": "Forbidden: You cannot access another patient's document."},
                status=status.HTTP_403_FORBIDDEN
            )

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
            "id": doc.id,
            "document_id": doc.doc_id,
            "ocr_status": doc.ocr_status,
            "title": doc.title,
            "doc_type": doc.get_doc_type_display(),
            "plain_language_summary": plain_summary,
            "raw_text": doc.raw_text,
            "records": ExtractedRecordSerializer(doc.extracted_records.all(), many=True).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, doc_id):
        """
        Deletes a medical record belonging to the authenticated patient.
        Ensures strict ownership verification, file cleanup, and decoupling of unrelated medications.
        """
        doc = get_document_by_id_or_uuid(doc_id)
        if not doc:
            return Response({"error": "Medical document not found."}, status=status.HTTP_404_NOT_FOUND)

        is_owner = False
        if doc.patient == request.user:
            is_owner = True
        elif doc.patient_identifier:
            allowed = {request.user.username, str(request.user.id)}
            profile = getattr(request.user, 'patient_profile', None)
            if profile:
                allowed.update(filter(None, [profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone]))
            if doc.patient_identifier in allowed:
                is_owner = True

        if not is_owner and not request.user.is_clinical_staff:
            return Response(
                {"error": "Forbidden: You cannot delete another patient's medical document."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 1. Clean up file on disk if exists
        if doc.file:
            try:
                import os
                if hasattr(doc.file, 'path') and os.path.isfile(doc.file.path):
                    os.remove(doc.file.path)
            except Exception:
                pass

        # 2. Update any PatientMedications referencing this document
        from accounts.models import PatientMedication
        PatientMedication.objects.filter(source_document=doc).update(source_document=None)

        # 3. Delete document (cascades ExtractedRecords)
        title = doc.title
        patient_user = doc.patient
        doc.delete()

        # 4. Update profile has_scanned_documents status if no documents remain
        if patient_user and hasattr(patient_user, 'patient_profile'):
            profile = patient_user.patient_profile
            has_remaining = MedicalDocument.objects.filter(patient=patient_user).exists()
            if not has_remaining:
                profile.has_scanned_documents = False
                profile.save(update_fields=['has_scanned_documents'])

        # 5. Dynamically refresh patient health summary upon document deletion
        if patient_user:
            try:
                from summary.services.summary_generator import build_patient_health_summary
                build_patient_health_summary(patient_user)
            except Exception as e:
                pass

        return Response({
            "status": "success",
            "message": f"Medical record '{title}' deleted successfully."
        }, status=status.HTTP_200_OK)


class PatientDocumentTimelineView(APIView):
    """
    Fetch patient's full medical document timeline with strict object-level access control.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        target_user = request.user
        cleaned_id = (patient_id or '').strip()
        is_placeholder = is_patient_placeholder(cleaned_id)

        if request.user.is_patient:
            target_user = request.user
            if cleaned_id and not is_placeholder:
                profile = getattr(request.user, 'patient_profile', None)
                allowed = {request.user.username, str(request.user.id)}
                if profile:
                    allowed.update(filter(None, [profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone]))
                if cleaned_id not in allowed:
                    return Response(
                        {"error": "Forbidden: You cannot access another patient's timeline."},
                        status=status.HTTP_403_FORBIDDEN
                    )
        elif request.user.is_clinical_staff and cleaned_id and not is_placeholder:
            found, _, _ = find_user_by_identifier(cleaned_id)
            if found:
                target_user = found

        filter_q = Q(patient=target_user)
        if hasattr(target_user, 'username'):
            filter_q |= Q(patient_identifier=target_user.username)

        docs = MedicalDocument.objects.filter(filter_q).distinct().order_by('-uploaded_at')
        records = ExtractedRecord.objects.filter(document__in=docs).order_by('-document_date', '-created_at')

        return Response({
            "patient_id": patient_id,
            "total_documents": docs.count(),
            "timeline": ExtractedRecordSerializer(records, many=True).data,
            "documents": MedicalDocumentSerializer(docs, many=True).data
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_documents(request):
    """
    Lists medical documents for authenticated patient.
    Object-level authorization prevents access to another patient's documents.
    """
    patient_id = request.query_params.get('patient_id', '').strip()
    target_user = request.user
    is_placeholder = is_patient_placeholder(patient_id)

    if request.user.is_patient:
        target_user = request.user
        if patient_id and not is_placeholder:
            profile = getattr(request.user, 'patient_profile', None)
            allowed = {request.user.username, str(request.user.id)}
            if profile:
                allowed.update(filter(None, [profile.mock_abha_id, profile.mock_aadhaar_id, profile.phone]))
            if patient_id not in allowed:
                return Response(
                    {"error": "Forbidden: You cannot access another patient's documents."},
                    status=status.HTTP_403_FORBIDDEN
                )
    elif request.user.is_clinical_staff and patient_id and not is_placeholder:
        found_user, _, _ = find_user_by_identifier(patient_id)
        if found_user:
            target_user = found_user

    filter_q = Q(patient=target_user)
    if hasattr(target_user, 'username'):
        filter_q |= Q(patient_identifier=target_user.username)
    docs = MedicalDocument.objects.filter(filter_q).distinct().order_by('-uploaded_at')
    profile = getattr(target_user, 'patient_profile', None)

    doc_list = []
    for d in docs:
        meds = list(d.extracted_records.filter(record_type=ExtractedRecord.RecordType.MEDICATION).values_list('structured_data', flat=True))
        labs = list(d.extracted_records.filter(record_type=ExtractedRecord.RecordType.LAB_RESULT).values_list('structured_data', flat=True))
        diag_rec = d.extracted_records.filter(record_type=ExtractedRecord.RecordType.DIAGNOSIS).first()
        diagnosis = diag_rec.structured_data.get('condition', '') if diag_rec else ''
        doc_doctor = diag_rec.structured_data.get('doctor', '') if diag_rec else ''
        doc_facility = diag_rec.structured_data.get('facility', '') if diag_rec else ''

        doctor = doc_doctor or (profile.primary_doctor if profile else '') or ''
        facility = doc_facility or (profile.hospital_name if profile else '') or ''

        doc_list.append({
            "id": d.id,
            "doc_id": d.doc_id,
            "title": d.title,
            "doc_type": d.get_doc_type_display(),
            "doctor": doctor,
            "facility": facility,
            "diagnosis": diagnosis,
            "date": d.uploaded_at.strftime('%Y-%m-%d'),
            "extracted_text": d.raw_text,
            "file_url": d.file.url if d.file else "",
            "medications": meds,
            "lab_results": labs,
            "status": "Verified"
        })

    return Response(doc_list, status=status.HTTP_200_OK)


# Backwards compatibility wrappers
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    return DocumentUploadView().post(request)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_status(request, doc_id):
    return DocumentStatusView().get(request, doc_id)
