from rest_framework import serializers
from .models import MedicalDocument, ExtractedRecord

class ExtractedRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedRecord
        fields = [
            'id',
            'record_type',
            'structured_data',
            'document_date',
            'is_abnormal',
            'abnormal_flag_reason',
            'created_at',
        ]


class MedicalDocumentSerializer(serializers.ModelSerializer):
    extracted_records = ExtractedRecordSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalDocument
        fields = [
            'doc_id',
            'title',
            'doc_type',
            'ocr_status',
            'uploaded_at',
            'file_url',
            'raw_text',
            'extracted_records',
        ]
