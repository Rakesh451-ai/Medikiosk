"""
Mock ABDM (Ayushman Bharat Digital Mission) Client

STAND-IN DOCUMENTATION:
This class mirrors the exact method signatures, request structures, and FHIR response payloads
specified by the National Health Authority (NHA) ABDM Milestone 1-3 Sandbox specifications.
In production, this class connects to:
  - ABDM Gateway: https://dev.abdm.gov.in/gateway/v0.5/
  - ABDM Consent Manager / Bridge: /v0.5/consents/hip/notify
  - FHIR Bundle Repository: CareContext linking
"""

import uuid
import datetime
import logging

logger = logging.getLogger(__name__)

class MockABDMService:
    @staticmethod
    def fetch_abha_profile(abha_id: str):
        """
        Simulates fetching authenticated demographic profile from ABDM ABHA Registry.
        """
        logger.info(f"[Mock ABDM] Fetching profile for ABHA: {abha_id}")
        return {
            "status": "active",
            "abha_number": abha_id,
            "abha_address": f"{abha_id.replace('-', '').lower()}@abdm",
            "name": "Sarah Jenkins",
            "gender": "F",
            "dob": "1988-04-12",
            "mobile": "9123456780",
            "address": {
                "line": "74 Civil Lines",
                "district": "Central",
                "state": "Delhi",
                "pincode": "110054"
            },
            "auth_methods": ["OTP", "BIOMETRICS"]
        }

    @staticmethod
    def push_health_record(patient_identifier: str, summary_data: dict):
        """
        Simulates FHIR CareContext push to ABDM Gateway upon physician consultation closure.
        Generates HL7 FHIR Release 4 document bundle.
        """
        bundle_id = f"bundle-mk-{uuid.uuid4().hex[:12]}"
        logger.info(f"[Mock ABDM] Pushing FHIR CareContext Bundle {bundle_id} for {patient_identifier}")

        fhir_bundle = {
            "resourceType": "Bundle",
            "id": bundle_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.datetime.utcnow().isoformat() + "Z"
            },
            "identifier": {
                "system": "https://abdm.gov.in/facilities/IN-HOSP-001/records",
                "value": bundle_id
            },
            "type": "document",
            "entry": [
                {
                    "fullUrl": f"Composition/comp-{bundle_id}",
                    "resource": {
                        "resourceType": "Composition",
                        "status": "final",
                        "type": {
                            "coding": [{
                                "system": "http://loinc.org",
                                "code": "34117-2",
                                "display": "Outpatient Consultation Note"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_identifier}"
                        },
                        "date": datetime.datetime.utcnow().isoformat() + "Z",
                        "title": "MediKiosk Outpatient Consultation Note"
                    }
                },
                {
                    "fullUrl": f"Condition/cond-{bundle_id}",
                    "resource": {
                        "resourceType": "Condition",
                        "clinicalStatus": {"coding": [{"code": "active"}]},
                        "code": {"text": summary_data.get('chief_complaint', 'Cough and fever')}
                    }
                }
            ]
        }
        return {
            "status": "SUCCESS",
            "bundle_id": bundle_id,
            "care_context_reference": f"CC-{patient_identifier}-2026",
            "fhir_bundle": fhir_bundle
        }

    @staticmethod
    def verify_consent(patient_identifier: str, purpose: str = 'share_hospital') -> bool:
        """
        Checks local database if active ConsentRecord is granted.
        """
        from consent.models import ConsentRecord
        record = ConsentRecord.objects.filter(
            patient_identifier=patient_identifier,
            purpose=purpose,
            granted=True
        ).first()
        return bool(record)
