# MediKiosk API Contracts

All endpoints return JSON responses and adhere to RESTful conventions. Protected endpoints require a SimpleJWT token in the header:
`Authorization: Bearer <access_token>`.

---

## 1. Accounts & Authentication (`/api/auth/`)

### `POST /api/auth/login/`
Authenticates a user and returns JWT tokens enriched with role and profile metadata.
- **Request Body:**
```json
{
  "username": "dr_sharma",
  "password": "DoctorPass123!"
}
```
- **Response (200 OK):**
```json
{
  "refresh": "eyJhbGciOi...",
  "access": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "username": "dr_sharma",
    "email": "dr.sharma@medikiosk.health",
    "role": "DOCTOR",
    "name": "Rajesh Sharma",
    "profile": {
      "name": "Rajesh Sharma",
      "department": "General Medicine",
      "specialization": "Consultant Physician",
      "room_number": "OPD Room 3"
    }
  }
}
```

### `POST /api/auth/register/`
Registers a new patient and generates initial JWT tokens.
- **Request Body:**
```json
{
  "name": "Sarah Jenkins",
  "phone": "9123456780",
  "age": 38,
  "gender": "FEMALE",
  "preferred_language": "en",
  "mock_abha_id": "14-8921-3490-1284"
}
```
- **Response (201 Created):**
```json
{
  "message": "Patient registered successfully.",
  "tokens": {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  },
  "user": {
    "id": 4,
    "username": "pt_9123456780_421",
    "role": "PATIENT",
    "patient_profile": {
      "name": "Sarah Jenkins",
      "phone": "9123456780",
      "mock_abha_id": "14-8921-3490-1284"
    }
  }
}
```

### `GET /api/auth/me/`
Retrieves currently authenticated user profile.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** Serialized `UserSerializer`.

### `GET /api/auth/clinical/patients/`
Restricted endpoint protected by `IsClinicalStaff` (only DOCTOR or TRIAGE_STAFF).
- **Response (200 OK):** Returns list of registered patients.
- **Response (403 Forbidden):** If accessed by PATIENT role or anonymous user.

---

## 2. Module A: Intake (`/api/intake/`)

### `POST /api/intake/sessions/`
Initializes a new intake session, creates initial `ClinicalHistoryDraft`, and returns the first AI greeting.
- **Request Body:**
```json
{
  "patient_id": "MK-78294",
  "department": "General Medicine",
  "language": "en",
  "is_ayush_enabled": false
}
```
- **Response (201 Created):**
```json
{
  "status": "success",
  "session_id": "intake-session-001",
  "patient_id": "MK-78294",
  "stage": "CHIEF_COMPLAINT",
  "progress_percent": 10,
  "initial_prompt": "Namaste and welcome to MediKiosk. What primary health issue brings you to the clinic today?",
  "suggested_answers": [
    "Persistent Cough & Fever",
    "Chest or Breathing Trouble",
    "Abdominal Pain",
    "Body Ache / Fatigue"
  ]
}
```

### `POST /api/intake/sessions/{session_id}/message/`
Sends a patient conversational turn to the history engine.
- **Request Body:**
```json
{
  "message": "I have sudden crushing chest pain and shortness of breath",
  "input_mode": "voice"
}
```
- **Response (200 OK):**
```json
{
  "session_id": "intake-session-001",
  "stage": "HPI",
  "progress_percent": 40,
  "status": "IN_PROGRESS",
  "flagged": true,
  "flag_reason": "Cardiovascular Alert: Potential acute coronary syndrome / ischemic chest pain.",
  "ai_message": {
    "id": 14,
    "text": "Understood: 'I have sudden crushing chest pain...'. When did this onset and how long has it persisted?",
    "suggested_answers": ["Started today", "1-2 days ago", "About 5 days ago"],
    "timestamp": "2026-09-05T19:30:00Z"
  },
  "draft": {
    "chief_complaint": "I have sudden crushing chest pain...",
    "hpi": { "duration_onset": "..." },
    "allergies": [],
    "ayush_fields": {}
  }
}
```

### `GET /api/intake/sessions/{session_id}/draft/`
Retrieves the structured `ClinicalHistoryDraft` populated by Module A.

---

## 3. Module B: Documents (`/api/documents/`)

### `POST /api/documents/upload/`
Uploads a scanned document and dispatches async Celery OCR task.
- **Request (Multipart Form):** `file`, `doc_type`
- **Response (202 Accepted):**
```json
{
  "status": "queued",
  "document_id": "DOC-SCAN-8891",
  "task_id": "celery-task-uuid-8891",
  "message": "Document received. OCR processing dispatched to Celery background worker."
}
```

### `GET /api/documents/status/{doc_id}/`
Returns the status of OCR processing and extracted medications.

---

## 4. Module C & Triage (`/api/summary/`, `/api/triage/`)

### `GET /api/summary/{patient_id}/`
Returns structured clinical summary for doctor review.

### `GET /api/triage/alerts/`
Returns active red-flag alerts queue for the doctor review dashboard.
