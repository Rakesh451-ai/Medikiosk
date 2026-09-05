from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import ConsentRecord
from .serializers import ConsentRecordSerializer
from .abdm_service import MockABDMService
from .tasks import purge_temporary_session_data_task

class GrantConsentView(APIView):
    """
    Module D: Record granular, per-purpose patient consent.
    Purposes: 'share_hospital', 'store_documents', 'link_abha', 'ai_transcription'
    """
    permission_classes = [AllowAny]

    def post(self, request):
        patient_id = request.data.get('patient_id', 'MK-78294')
        purposes = request.data.get('purposes', [ConsentRecord.Purpose.SHARE_HOSPITAL])
        
        # If single purpose string provided
        if isinstance(purposes, str):
            purposes = [purposes]

        created_records = []
        for p in purposes:
            rec, _ = ConsentRecord.objects.update_or_create(
                patient_identifier=patient_id,
                purpose=p,
                defaults={
                    'granted': True,
                    'revoked_at': None
                }
            )
            created_records.append(rec)

        serializer = ConsentRecordSerializer(created_records, many=True)
        return Response({
            "message": "Granular patient consent registered successfully.",
            "patient_id": patient_id,
            "consents": serializer.data
        }, status=status.HTTP_201_CREATED)


class PatientConsentRecordsView(APIView):
    """
    Module D: Fetch all active/revoked consent records for a patient.
    """
    permission_classes = [AllowAny]

    def get(self, request, patient_id):
        records = ConsentRecord.objects.filter(patient_identifier=patient_id)
        serializer = ConsentRecordSerializer(records, many=True)
        return Response({
            "patient_id": patient_id,
            "has_active_hospital_consent": MockABDMService.verify_consent(patient_id, ConsentRecord.Purpose.SHARE_HOSPITAL),
            "records": serializer.data
        }, status=status.HTTP_200_OK)


class RevokeConsentView(APIView):
    """
    Module D: Revoke an existing consent record.
    """
    permission_classes = [AllowAny]

    def post(self, request, consent_id):
        rec = get_object_or_404(ConsentRecord, consent_id=consent_id)
        rec.granted = False
        rec.revoked_at = timezone.now()
        rec.save(update_fields=['granted', 'revoked_at'])
        return Response({
            "message": f"Consent for '{rec.purpose}' has been revoked.",
            "consent_id": rec.consent_id,
            "granted": rec.granted
        }, status=status.HTTP_200_OK)


class MockABDMProfileView(APIView):
    """
    Module D: Fetch simulated ABHA KYC profile.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        abha_id = request.data.get('abha_id', '14-8921-3490-1284')
        profile = MockABDMService.fetch_abha_profile(abha_id)
        return Response(profile, status=status.HTTP_200_OK)


class MockABDMPushView(APIView):
    """
    Module D: Push simulated FHIR CareContext Bundle upon doctor consultation completion.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        patient_id = request.data.get('patient_id', 'MK-78294')
        summary = request.data.get('summary', {})
        result = MockABDMService.push_health_record(patient_id, summary)

        # Trigger privacy purge task in background
        session_id = request.data.get('session_id')
        if session_id:
            purge_temporary_session_data_task.delay(session_id=session_id)

        return Response(result, status=status.HTTP_200_OK)


# Backward-compatible view wrappers
@api_view(['POST'])
@permission_classes([AllowAny])
def grant_consent(request):
    return GrantConsentView().post(request)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_consent_status(request, patient_id):
    return PatientConsentRecordsView().get(request, patient_id)

@api_view(['POST'])
@permission_classes([AllowAny])
def mock_abdm_fhir_sync(request):
    return MockABDMPushView().post(request)
