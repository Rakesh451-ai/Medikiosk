from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from intake.models import IntakeSession, ClinicalHistoryDraft
from documents.models import MedicalDocument, ExtractedRecord
from summary.models import PhysicianSummary, SummaryRevision

User = get_user_model()

class ModuleCSummaryEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.doctor = User.objects.create_user(username='dr_sharma', password='password123', role=User.Role.DOCTOR)
        self.client.force_authenticate(user=self.doctor)

        # 1. Setup Intake Session & Draft
        self.session = IntakeSession.objects.create(
            patient_identifier='MK-78294',
            department='General Medicine',
            language='en'
        )
        self.draft = ClinicalHistoryDraft.objects.create(
            session=self.session,
            chief_complaint='Severe cough and fever x 5 days',
            hpi={'duration': '5 days', 'character': 'productive'},
            allergies=['Penicillin (Severe)'],
            past_medical_history=['Childhood Asthma']
        )

        # 2. Setup Document & Extracted Record
        self.doc = MedicalDocument.objects.create(
            doc_id='doc-test-rx-01',
            patient_identifier='MK-78294',
            title='Prescription',
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=self.doc,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={'test_name': 'WBC', 'value': 14200.0, 'unit': '/mcL'},
            is_abnormal=True,
            abnormal_flag_reason='Leukocytosis'
        )

    def test_generate_clinical_summary_endpoint(self):
        url = reverse('summary-generate-session', kwargs={'session_id': self.session.session_id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], PhysicianSummary.Status.DRAFT)
        self.assertIn('Severe cough', response.data['chief_complaint'])
        self.assertIn('bilingual_summary', response.data)
        self.assertIn('hi', response.data['bilingual_summary'])

        # Check DB
        summary = PhysicianSummary.objects.get(summary_id=response.data['summary_id'])
        self.assertEqual(summary.status, PhysicianSummary.Status.DRAFT)
        # Verify abnormal investigation captured
        self.assertTrue(any(inv.get('is_abnormal') for inv in summary.investigations))

    def test_doctor_amend_and_confirm_with_audit_log(self):
        summary = PhysicianSummary.objects.create(
            session=self.session,
            patient_identifier='MK-78294',
            status=PhysicianSummary.Status.DRAFT,
            chief_complaint='Original cough',
            hpi='Original HPI'
        )

        url = reverse('summary-detail', kwargs={'summary_id': summary.summary_id})
        payload = {
            'hpi': 'Amended by Dr. Sharma: Patient exhibits bilateral rhonchi on auscultation.',
            'doctor_notes': 'Prescribe Azithromycin. Discontinue beta-lactams.',
            'status': PhysicianSummary.Status.CONFIRMED,
            'revision_notes': 'Confirmed post-examination'
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], PhysicianSummary.Status.CONFIRMED)

        # Verify audit revision created
        summary.refresh_from_db()
        self.assertEqual(summary.status, PhysicianSummary.Status.CONFIRMED)
        self.assertIsNotNone(summary.confirmed_at)
        self.assertEqual(summary.revisions.count(), 1)
        self.assertIn('hpi', summary.revisions.first().changes)

    def test_dynamic_patient_health_summary_dashboard_structure(self):
        """
        Validates that GET /api/summary/ returns the complete, structured patient medical summary
        derived dynamically from the authenticated patient's actual database records.
        """
        from accounts.models import PatientProfile, PatientMedication
        patient = User.objects.create_user(
            username='summary_test_patient',
            password='TestPassword123!',
            role=User.Role.PATIENT
        )
        profile = PatientProfile.objects.create(
            user=patient,
            name='Ramesh Kumar',
            age=45,
            gender='MALE',
            blood_group='B+',
            allergies=['Aspirin'],
            chronic_conditions=['Type 2 Diabetes']
        )

        # Add Prescription document
        rx_doc = MedicalDocument.objects.create(
            patient=patient,
            patient_identifier=patient.username,
            title='Cardiology Prescription',
            doc_type=MedicalDocument.DocType.PRESCRIPTION,
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=rx_doc,
            record_type=ExtractedRecord.RecordType.DIAGNOSIS,
            structured_data={'condition': 'Hypertension & CAD', 'doctor': 'Dr. Gupta', 'facility': 'City Hospital'}
        )
        PatientMedication.objects.create(
            patient=patient,
            name='Telmisartan',
            dosage='40mg',
            frequency='Once daily',
            source_document=rx_doc
        )

        # Add Lab document
        lab_doc = MedicalDocument.objects.create(
            patient=patient,
            patient_identifier=patient.username,
            title='Blood Glucose Report',
            doc_type=MedicalDocument.DocType.LAB_REPORT,
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=lab_doc,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={'test_name': 'HbA1c', 'value': 7.6, 'unit': '%', 'reference_range': '4.0 - 5.7 %', 'status': 'High'},
            is_abnormal=True,
            abnormal_flag_reason='High (7.6 % > 5.7 %)'
        )

        # Request summary as patient
        client = APIClient()
        client.force_authenticate(user=patient)
        res = client.get(reverse('summary-current'))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        # 1. Patient basic information
        self.assertEqual(data['patient_info']['name'], 'Ramesh Kumar')
        self.assertEqual(data['patient_info']['age'], 45)
        self.assertEqual(data['patient_info']['blood_group'], 'B+')

        # 2. Allergies & Chronic Conditions
        self.assertIn('Aspirin', data['allergies'])
        self.assertIn('Type 2 Diabetes', data['chronic_conditions'])

        # 3. Current Medications
        self.assertEqual(len(data['current_medications']), 1)
        self.assertEqual(data['current_medications'][0]['name'], 'Telmisartan')

        # 4. Lab Results with abnormal flag
        self.assertEqual(len(data['important_labs']), 1)
        self.assertEqual(data['important_labs'][0]['test_name'], 'HbA1c')
        self.assertTrue(data['important_labs'][0]['is_abnormal'])

        # 5. Diagnoses
        self.assertTrue(any('Hypertension' in d['condition'] for d in data['previous_diagnoses']))

        # 6. Timeline
        self.assertGreaterEqual(len(data['timeline']), 2)

        # 7. Health trends
        self.assertEqual(data['health_trends']['abnormal_labs_count'], 1)
        self.assertEqual(data['health_trends']['active_medications_count'], 1)
        self.assertEqual(data['health_trends']['total_records_count'], 2)

        # 8. Unavailable info (e.g. no surgeries or hospitalizations)
        unavail_fields = [u['field'] for u in data['unavailable_information']]
        self.assertIn('surgeries', unavail_fields)
        self.assertIn('hospitalizations', unavail_fields)

    def test_dynamic_summary_updates_on_document_deletion(self):
        """
        Validates that deleting a document dynamically refreshes the summary.
        """
        patient = User.objects.create_user(
            username='deletion_test_patient',
            password='TestPassword123!',
            role=User.Role.PATIENT
        )
        doc = MedicalDocument.objects.create(
            patient=patient,
            patient_identifier=patient.username,
            title='Temp Lab Report',
            doc_type=MedicalDocument.DocType.LAB_REPORT,
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=doc,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={'test_name': 'Creatinine', 'value': 2.1, 'unit': 'mg/dL'},
            is_abnormal=True
        )

        client = APIClient()
        client.force_authenticate(user=patient)

        # Before deletion: total_records is 1, 1 lab test
        res1 = client.get(reverse('summary-current'))
        self.assertEqual(res1.data['total_records'], 1)
        self.assertEqual(len(res1.data['important_labs']), 1)

        # Delete document via document-detail endpoint
        del_res = client.delete(reverse('document-detail', kwargs={'doc_id': doc.doc_id}))
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)

        # After deletion: summary dynamically updates to 0 records, 0 labs
        res2 = client.get(reverse('summary-current'))
        self.assertEqual(res2.data['total_records'], 0)
        self.assertEqual(len(res2.data['important_labs']), 0)

    def test_patient_summary_isolation(self):
        """
        Validates that a patient cannot access another patient's summary.
        """
        p1 = User.objects.create_user(username='p1_user', password='Password123!', role=User.Role.PATIENT)
        p2 = User.objects.create_user(username='p2_user', password='Password123!', role=User.Role.PATIENT)

        client = APIClient()
        client.force_authenticate(user=p1)

        # p1 tries to query p2's summary -> 403 Forbidden
        bad_res = client.get(reverse('summary-patient', kwargs={'patient_id': p2.username}))
        self.assertEqual(bad_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_ready_patient_summary_all_eight_sections(self):
        """
        Validates all 8 sections of the Doctor-Ready Patient Summary:
        1. PATIENT INFORMATION: Name, Age, Gender, Blood Group, Patient ID, Emergency Contact
        2. KEY SAFETY INFORMATION: Known Allergies, Important Alerts, Medication Safety Warnings
        3. CURRENT HEALTH STATUS: Blood Pressure, Heart Rate, SpO2, Temperature, Glucose, Weight, Height
        4. ACTIVE MEDICATIONS: Name, Dose, Frequency, Timing, Duration, Instructions, Status
        5. RECENT MEDICAL RECORDS: Date, Document Type, Doctor, Facility, Diagnosis, Important Findings, doc_id
        6. LAB / TEST RESULTS: Test name, Result, Unit, Reference range, Status
        7. CLINICAL HISTORY / TIMELINE: Chronological timeline format
        8. AI-GENERATED PATIENT OVERVIEW: Short, evidence-based factual summary
        """
        from accounts.models import PatientProfile, PatientMedication, VitalReading

        patient = User.objects.create_user(
            username='doctor_ready_test_patient',
            password='TestPassword123!',
            role=User.Role.PATIENT
        )
        profile = PatientProfile.objects.create(
            user=patient,
            name='Sunita Devi',
            age=38,
            gender='FEMALE',
            blood_group='O+',
            mock_abha_id='14-9988-7766-5544',
            emergency_contact='+91 9876543210',
            allergies=['Penicillin'],
            chronic_conditions=['Asthma']
        )

        # 1. Vitals reading with weight and height
        VitalReading.objects.create(
            patient=patient,
            heart_rate=76,
            bp_systolic=124,
            bp_diastolic=82,
            spo2=98,
            temperature=98.4,
            glucose=105,
            weight_kg=62.5,
            height_cm=165.0,
            status='Normal'
        )

        # 2. Medical Document
        doc = MedicalDocument.objects.create(
            patient=patient,
            patient_identifier=patient.username,
            title='Pulmonology Clinic Consultation',
            doc_type=MedicalDocument.DocType.PRESCRIPTION,
            ocr_status=MedicalDocument.OCRStatus.COMPLETED
        )
        ExtractedRecord.objects.create(
            document=doc,
            record_type=ExtractedRecord.RecordType.DIAGNOSIS,
            structured_data={
                'condition': 'Mild Bronchial Asthma',
                'doctor': 'Dr. Mehra',
                'facility': 'Apollo Clinic'
            }
        )
        ExtractedRecord.objects.create(
            document=doc,
            record_type=ExtractedRecord.RecordType.LAB_RESULT,
            structured_data={
                'test_name': 'Total IgE',
                'value': 280.0,
                'unit': 'IU/mL',
                'reference_range': '< 100 IU/mL',
                'status': 'High'
            },
            is_abnormal=True,
            abnormal_flag_reason='Elevated'
        )

        # 3. Active Medication (with penicillin-class cross check to test safety warning)
        PatientMedication.objects.create(
            patient=patient,
            name='Amoxicillin',
            dosage='500mg',
            frequency='Twice daily',
            timing='After meals',
            duration='5 days',
            instruction='Complete full antibiotic course',
            is_active=True,
            source_document=doc
        )

        client = APIClient()
        client.force_authenticate(user=patient)
        res = client.get(reverse('summary-current'))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        # Section 1: Patient Information
        p_info = data['patient_info']
        self.assertEqual(p_info['name'], 'Sunita Devi')
        self.assertEqual(p_info['age'], 38)
        self.assertEqual(p_info['gender'], 'Female')
        self.assertEqual(p_info['blood_group'], 'O+')
        self.assertEqual(p_info['patient_id'], '14-9988-7766-5544')
        self.assertEqual(p_info['emergency_contact'], '+91 9876543210')

        # Section 2: Key Safety Information
        safety = data['safety_information']
        self.assertIn('Penicillin', safety['known_allergies'])
        self.assertTrue(any('Asthma' in a['title'] for a in safety['important_alerts']))
        # Amoxicillin is in penicillin class -> safety warning flagged
        self.assertTrue(len(safety['medication_safety_warnings']) > 0)
        self.assertIn('Amoxicillin', safety['medication_safety_warnings'][0]['medication'])

        # Section 3: Current Health Status (Latest Vitals)
        vitals = data['current_health_status']
        self.assertTrue(vitals['has_vitals'])
        self.assertEqual(vitals['blood_pressure'], '124/82 mmHg')
        self.assertEqual(vitals['heart_rate'], '76 bpm')
        self.assertEqual(vitals['spo2'], '98%')
        self.assertEqual(vitals['temperature'], '98.4°F')
        self.assertEqual(vitals['glucose'], '105 mg/dL')
        self.assertEqual(vitals['weight'], '62.5 kg')
        self.assertEqual(vitals['height'], '165.0 cm')

        # Section 4: Active Medications
        meds = data['active_medications']
        self.assertEqual(len(meds), 1)
        m = meds[0]
        self.assertEqual(m['name'], 'Amoxicillin')
        self.assertEqual(m['dose'], '500mg')
        self.assertEqual(m['frequency'], 'Twice daily')
        self.assertEqual(m['timing'], 'After meals')
        self.assertEqual(m['duration'], '5 days')
        self.assertEqual(m['instructions'], 'Complete full antibiotic course')
        self.assertEqual(m['status'], 'Active')

        # Section 5: Recent Medical Records
        records = data['recent_medical_records']
        self.assertEqual(len(records), 1)
        r = records[0]
        self.assertEqual(r['doctor'], 'Dr. Mehra')
        self.assertEqual(r['facility'], 'Apollo Clinic')
        self.assertEqual(r['diagnosis'], 'Mild Bronchial Asthma')
        self.assertEqual(r['doc_id'], str(doc.doc_id))

        # Section 6: Lab / Test Results
        labs = data['lab_test_results']
        self.assertEqual(len(labs), 1)
        self.assertEqual(labs[0]['test_name'], 'Total IgE')
        self.assertEqual(labs[0]['result'], 280.0)
        self.assertEqual(labs[0]['unit'], 'IU/mL')
        self.assertEqual(labs[0]['status'], 'High')

        # Section 7: Clinical History / Timeline
        timeline = data['clinical_history_timeline']
        self.assertGreaterEqual(len(timeline), 1)
        self.assertIn('Prescription', timeline[0]['summary_line'])

        # Section 8: AI-Generated Patient Overview
        overview = data['ai_patient_overview']
        self.assertEqual(overview['title'], 'Patient Overview')
        overview_text = overview['summary_text'].lower()
        self.assertIn('38-year-old', overview_text)
        self.assertIn('penicillin', overview_text)
        self.assertIn('amoxicillin', overview_text)

