"""
Pluggable OCR and Document Text Extraction Service
Supports replaceable OCR providers (PDF text extraction, Tesseract, external OCR APIs).
Does NOT fabricate or invent dummy text if OCR fails.
"""

import os
import logging
from abc import ABC, abstractmethod

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
            for page_idx, page in enumerate(reader.pages):
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
                # Convert RGBA / P mode images if needed
                if img.mode not in ('L', 'RGB'):
                    img = img.convert('RGB')
                text = pytesseract.image_to_string(img)
                return text.strip() if text else ""
        except Exception as e:
            logger.info(f"Tesseract OCR unavailable or encountered non-fatal error on {file_path}: {e}")
            return ""


class OCRService(BaseOCRService):
    """
    Main composite OCR service dispatcher.
    Inspects file extension and dispatches to the appropriate OCR provider.
    """

    def __init__(self):
        self.pdf_service = PyPDFOCRService()
        self.image_service = TesseractOCRService()

    def extract_text(self, file_path: str) -> str:
        if not file_path or not os.path.exists(file_path):
            return ""

        lower_path = file_path.lower()
        if lower_path.endswith('.pdf'):
            text = self.pdf_service.extract_text(file_path)
            if text:
                return text
            # Fallback if PDF has embedded scanned images and pdf2image available
            return ""

        # Default image extensions (.png, .jpg, .jpeg, .webp, etc.)
        return self.image_service.extract_text(file_path)

    def process(self, file_path: str) -> dict:
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

        extracted_text = self.extract_text(file_path)

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
            "page_count": page_count,
            "error": None
        }
