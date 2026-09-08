"""
Pluggable OCR and Document Text Extraction Service
Supports PDF text extraction (via pypdf), Optical Character Recognition,
and client-assisted optical transcripts.
Does NOT fabricate or invent dummy text if OCR fails.
"""

import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class BaseOCRService(ABC):
    """Abstract OCR Provider Interface for future OCR engine replacement."""

    @abstractmethod
    def extract_text(self, file_path: str) -> str:
        """Extract text from the given file path. Returns empty string if unreadable."""
        pass


class PyPDFOCRService(BaseOCRService):
    """Extracts selectable text and page structure from PDF files."""

    def extract_text(self, file_path: str) -> str:
        if not file_path or not os.path.exists(file_path):
            return ""

        extracted_pages = []
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted_pages.append(page_text.strip())
        except Exception as e:
            logger.warning(f"PyPDFOCRService error processing {file_path}: {e}")

        return "\n\n".join(extracted_pages)

    def get_page_count(self, file_path: str) -> int:
        if not file_path or not os.path.exists(file_path):
            return 0
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            return len(reader.pages)
        except Exception:
            return 0


class TesseractOCRService(BaseOCRService):
    """Optical Character Recognition for scanned images via pytesseract."""

    def extract_text(self, file_path: str) -> str:
        if not file_path or not os.path.exists(file_path):
            return ""

        try:
            import pytesseract
            from PIL import Image

            with Image.open(file_path) as img:
                # Verify image integrity
                img.verify()

            with Image.open(file_path) as img:
                if img.mode not in ('L', 'RGB'):
                    img = img.convert('RGB')
                text = pytesseract.image_to_string(img)
                return text.strip() if text else ""
        except Exception as e:
            logger.info(f"Tesseract OCR non-fatal notice on {file_path}: {e}")
            return ""


class OCRService(BaseOCRService):
    """
    Main composite OCR service dispatcher.
    Inspects file extension and dispatches to the appropriate OCR provider.
    Supports client-assisted OCR transcripts (e.g. from Tesseract.js).
    """

    def __init__(self):
        self.pdf_service = PyPDFOCRService()
        self.image_service = TesseractOCRService()

    def validate_image_integrity(self, file_path: str) -> bool:
        """Validates image can be opened and is not corrupted."""
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                img.verify()
            return True
        except Exception:
            return False

    def extract_text(self, file_path: str, client_text: Optional[str] = None) -> str:
        if client_text and len(client_text.strip()) >= 5:
            return client_text.strip()

        if not file_path or not os.path.exists(file_path):
            return ""

        lower_path = file_path.lower()
        if lower_path.endswith('.pdf'):
            text = self.pdf_service.extract_text(file_path)
            if text and len(text.strip()) >= 5:
                return text.strip()

        # Image extraction via Tesseract
        return self.image_service.extract_text(file_path)

    def process(self, file_path: str, client_text: Optional[str] = None) -> dict:
        """
        Executes OCR pipeline on the file and returns structured extraction metadata.
        """
        if not file_path or not os.path.exists(file_path):
            return {
                "success": False,
                "raw_text": "",
                "page_count": 0,
                "error": "File not found or inaccessible."
            }

        is_pdf = file_path.lower().endswith('.pdf')
        page_count = self.pdf_service.get_page_count(file_path) if is_pdf else 1

        # Check image corruption if image
        if not is_pdf:
            if not self.validate_image_integrity(file_path):
                return {
                    "success": False,
                    "raw_text": "",
                    "page_count": 1,
                    "error": "The uploaded image appears corrupted or invalid. Please upload a clear JPG or PNG image."
                }

        extracted_text = self.extract_text(file_path, client_text=client_text)

        if not extracted_text or len(extracted_text.strip()) < 5:
            return {
                "success": False,
                "raw_text": "",
                "page_count": page_count,
                "error": "We couldn't read this document. Try uploading a clearer scan or photo."
            }

        return {
            "success": True,
            "raw_text": extracted_text.strip(),
            "text": extracted_text.strip(),
            "page_count": page_count,
            "error": None
        }
