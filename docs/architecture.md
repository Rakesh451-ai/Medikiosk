# MediKiosk System Architecture

## 1. Executive Summary & Clinical Pipeline
MediKiosk is an AI-assisted outpatient check-in and pre-consultation intelligence platform. It bridges the gap between patient arrival and physician consultation by structuring patient symptoms, digitizing past medical records, performing red-flag triage, and drafting clinical summaries before the patient enters the consultation room.

### End-to-End Clinical Flow:
```
[ 1. Patient ] ──► [ 2. Identify ] ──► [ 3. Converse ] ──► [ 4. Scan ] ──► [ 5. Summarize ] ──► [ 6. Consult ]
  Arrival at       ABHA Scan /         Module A: AI         Module B:        Module C: AI          Doctor Review
  Hospital         Phone Number        History Engine       OCR Pipeline     Structured Draft      & Final Care
  OPD Kiosk        & Consent           (SOCRATES + AYUSH)   (Celery/Async)   (HPI, Meds, Vitals)   Dashboard
```

1. **Patient**: Patient approaches physical touchscreen/voice MediKiosk station at outpatient registration.
2. **Identify**: Calm, high-contrast interface allows identification via 14-digit ABHA ID (Ayushman Bharat Health Account) or quick registration, followed by explicit privacy consent.
3. **Converse (Module A)**: Multimodal conversational history engine engages patient in English, Hindi, or regional languages using real Web Speech API (voice-to-text) and large touch quick-pick options. Uses SOCRATES framework and optional AYUSH branch.
4. **Scan (Module B)**: Patient scans previous clinic prescriptions or lab reports; enqueued into Celery + Redis background worker for OCR processing.
5. **Summarize (Module C)**: Clinical synthesis engine aggregates conversational history, vitals, and scanned records into an actionable clinical draft.
6. **Consult**: Consulting physician opens dense `/doctor` review dashboard with highlighted Red-Flag allergy alerts, quick-editable notes, and ABDM FHIR bundle sync.

---

## 2. Monorepo Structural Layout
The monorepo enforces clean separation of concerns:
```
MediKiosk/
├── backend/                  # Django project: medikiosk_core
│   ├── accounts/             # Custom User (Roles: PATIENT, DOCTOR, TRIAGE_STAFF, ADMIN), Profiles & Auth
│   ├── intake/               # Module A: Multimodal conversational history engine (SOCRATES + AYUSH)
│   ├── documents/            # Module B: OCR & medical document digitization
│   ├── summary/              # Module C: Structured clinical history generator
│   ├── consent/              # Module D: ABDM privacy consent & FHIR bundle mock
│   ├── triage/               # Red-flag detection, clinical alerts & triage queue
│   ├── medikiosk_core/       # Settings, Celery app config, root URLs, fixtures
│   └── manage.py
├── frontend/                 # Vite + React 18 + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Shared UI (Navbar, alert banners, steppers)
│   │   ├── pages/kiosk/      # /kiosk entry flow (IdentifyScreen, ConverseScreen, KioskView)
│   │   ├── services/         # API client layer (fetch /api/...)
│   │   └── styles/           # design-tokens.js (shared colors, typography, touch targets)
│   └── index.html
├── docs/                     # Technical specifications
│   ├── architecture.md       # Pipeline, modules, and orchestration
│   ├── api-contracts.md      # Strict request/response DRF schemas
│   └── data-model.md         # Entity-relationship diagrams and field specifications
├── docker-compose.yml        # PostgreSQL, Redis, Django, Celery Worker, React dev server
├── .env.example              # Environment variable template
└── README.md                 # Complete documentation & quickstart guide
```

---

## 3. App Modules Breakdown

### Module A: Intake (`backend/intake`)
- **Responsibility**: Conducts interactive clinical history taking.
- **Protocol**: Implements the SOCRATES clinical pain/symptom schema (Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/relieving factors, Severity).
- **AYUSH Branch**: Department toggle enables specialized Ayurvedic evaluation (Agni, Koshtha, Prakriti, Ahara-Vihara).
- **Red-Flag Interceptor**: Real-time regex and keyword pattern scanner detects cardiopulmonary, neurological, hemorrhage, and anaphylaxis emergencies. Emits a Django `red_flag_detected` signal that automatically enqueues a `TriageAlert` in the triage app.

### Module B: Documents (`backend/documents`)
- **Responsibility**: Digitizes uploaded/scanned prescriptions and reports.
- **Asynchronous Isolation**: Day 1 Celery + Redis background boundary prevents OCR model inference from blocking the HTTP request/response cycle.

### Module C: Summary (`backend/summary`)
- **Responsibility**: Synthesizes the clinical draft from Module A and parsed entities from Module B into a standardized history note.

### Module D: Consent (`backend/consent`)
- **Responsibility**: Manages patient privacy consent artifacts under Ayushman Bharat Digital Mission (ABDM) standards, linking mock FHIR Composition and CareContext bundles.

### Triage (`backend/triage`)
- **Responsibility**: Houses clinical alerts, prioritizing acute patients in the OPD queue based on vital signs and contraindication detection.

### Accounts (`backend/accounts`)
- **Responsibility**: Manages custom `User` with roles: `PATIENT`, `DOCTOR`, `TRIAGE_STAFF`, `ADMIN`. Provides JWT authentication and role-based permissions (`IsClinicalStaff`, `IsDoctor`, `IsPatientOwnerOrClinicalStaff`).

---

## 4. Asynchronous Boundary & Performance
- Heavy computational tasks (OCR text extraction, LLM synthesis) are executed out-of-process using **Celery** workers backed by **Redis**.
- API endpoints acknowledge uploads immediately with `HTTP 202 Accepted` and return a `task_id` for client polling or websocket notifications.
