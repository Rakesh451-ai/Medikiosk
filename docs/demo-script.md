# MediKiosk: 3–4 Minute SIH Demonstration Script

## Overview for Judges
**Problem Statement:** Overcrowded hospital outpatient departments (OPDs) force physicians to spend 70% of consultation time on manual administrative inquiry (asking repetitive symptom histories, re-typing past medications, deciphering handwritten paper prescriptions). Crucial drug contraindications and acute red-flags are easily missed in high-volume rushes.
**MediKiosk Solution:** An accessible, multimodal patient kiosk UI (voice/touch, multilingual, low-literacy friendly) that automates pre-consultation intake, performs Celery-isolated OCR digitization, checks biological reference ranges, detects life-threatening red flags, and prepares an ABDM-compliant clinical draft before the patient enters the consultation room.

---

## Act 1: Patient Check-In & Granular Consent (0:00 - 0:45)
- **Screen:** `/kiosk` (Stage 1: Identify)
- **Problem Solved:** Long registration lines and confusing consent forms alienate low-literacy or regional language patients.
- **Presenter Actions:**
  1. Show the calm, high-contrast kiosk interface.
  2. Switch the language pill from **English** to **हिंदी (Hindi)** or **বাংলা (Bengali)**. Notice how all touch targets remain 64px+ high.
  3. Click **"⚡ Instant 1-Tap Demo (Sarah Jenkins)"** or type an ABHA ID (`14-8921-3490-1284`).
  4. Advance to the Consent screen. Tap the **"Read Aloud"** button to show text-to-speech accessibility.
  5. Demonstrate granular consent toggles: *Share with Doctor*, *Digitize Documents*, *ABDM Linkage*, *AI Clinical Transcription*.
  6. Click **"I Agree & Begin Consultation"**.

---

## Act 2: Module A Conversational History Taking (0:45 - 1:45)
- **Screen:** `/kiosk` (Stage 2: Converse)
- **Problem Solved:** Patients forget critical symptoms or cannot articulate medical jargon without guidance.
- **Presenter Actions:**
  1. Point out the conversational progress bar (**"15% Complete — SOCRATES Framework"**).
  2. Demonstrate multimodal input:
     - Click the **Microphone Button** (real Web Speech API in Chrome) and say: *"I have had a bad productive cough and fever for 5 days."*
     - Alternatively, tap the **Touch Quick-Pick** buttons provided by the AI for patients who cannot speak or type.
  3. Show the SOCRATES progression: Character, Duration, Severity, and Allergies.
  4. Toggle the **🌿 AYUSH Branch** button to demonstrate how Ayurvedic departments can evaluate *Agni*, *Koshtha*, and *Prakriti*.
  5. Enter the allergy: *"I am severely allergic to Penicillin."*
  6. Highlight how the system immediately flags the session and triggers a real-time Django signal to the triage dashboard without diagnosing.

---

## Act 3: Module B OCR Prescription & Lab Digitization (1:45 - 2:30)
- **Screen:** `/kiosk` (Stage 3: Scan)
- **Problem Solved:** Doctors waste valuable consultation time deciphering crumpled prior paper prescriptions and missing abnormal blood values.
- **Presenter Actions:**
  1. Click **"📸 Scan Document Now"** to simulate placing a prior clinic prescription under the kiosk scanner.
  2. Explain the **Celery + Redis Asynchronous Task Boundary**: the document is enqueued to a background worker so the kiosk UI remains instantaneous and responsive.
  3. Once processed, show the plain-language patient confirmation:
     - *"We found: Augmentin 625mg, Paracetamol 650mg, and Hemoglobin 10.8 g/dL."*
  4. Complete check-in to receive **Token #42** routed to Room 3.

---

## Act 4: Doctor Review Dashboard & Clinical Decision Support (2:30 - 3:45)
- **Screen:** `/doctor` (Log in with `dr_sharma` / `DoctorPass123!`)
- **Problem Solved:** Physicians need a 30-second dense, trustworthy scan rather than wading through raw AI chat transcripts.
- **Presenter Actions:**
  1. Show the **Prioritized OPD Queue**: Patient Sarah Jenkins is at the top of the queue due to a **CRITICAL RED-FLAG ALERT**.
  2. Point out the glowing Red-Flag Banner:
     - **ALERT:** *Prescribed Augmentin (Amoxicillin) detected with verified PENICILLIN ANAPHYLAXIS allergy.*
  3. Review the **Investigations Table**:
     - *Hemoglobin (10.8 g/dL)* is flagged with a **⚠️ Low** badge.
     - *WBC Count (13,400 /mcL)* is flagged with a **⚠️ High (Leukocytosis)** badge.
  4. Demonstrate the **Quick-Edit Section**: The physician edits the clinical note inline to substitute Azithromycin for Augmentin.
  5. Click **"Confirm & Save to Record"**:
     - Explain that AI summaries are NEVER final without explicit human physician confirmation (logged in `SummaryRevision` audit table).
     - Point out the background privacy purge task that wipes ephemeral voice buffers under privacy-by-design standards.
  6. Conclude by showing the generated HL7 FHIR Release 4 CareContext bundle ready for ABDM gateway transmission.
