from celery import shared_task
import logging
from documents.models import MedicalDocument
from documents.ocr_engine import extract_raw_text_tesseract, parse_and_store_entities

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def process_document_ocr_task(self, document_id, file_path=None):
    """
    Celery background job for OCR + medical document digitization (Module B).
    Isolates Tesseract / OCR pipeline from HTTP request-response cycle.
    """
    logger.info(f"[Celery] Starting OCR processing for Document: {document_id}")
    try:
        doc = MedicalDocument.objects.filter(doc_id=document_id).first()
        if not doc:
            logger.error(f"[Celery] Document {document_id} not found.")
            return {"error": "Document not found"}

        doc.ocr_status = MedicalDocument.OCRStatus.PROCESSING
        doc.celery_task_id = self.request.id
        doc.save(update_fields=['ocr_status', 'celery_task_id'])

        # 1. Run OCR (Tesseract / Fallback)
        raw_text = extract_raw_text_tesseract(doc.file.path if doc.file else None)
        doc.raw_text = raw_text

        # 2. Extract and structure clinical records
        parse_and_store_entities(doc, raw_text)

        doc.ocr_status = MedicalDocument.OCRStatus.COMPLETED
        doc.save(update_fields=['ocr_status', 'raw_text'])

        logger.info(f"[Celery] OCR processing successful for Document: {document_id}")
        return {
            "document_id": document_id,
            "status": "completed",
            "extracted_count": doc.extracted_records.count(),
        }
    except Exception as exc:
        logger.error(f"[Celery] Error in OCR task for {document_id}: {exc}")
        if doc:
            doc.ocr_status = MedicalDocument.OCRStatus.FAILED
            doc.error_message = str(exc)
            doc.save(update_fields=['ocr_status', 'error_message'])
        raise exc

