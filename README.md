# MediKiosk Monorepo

> **Next-Generation AI Clinical Outpatient Check-In & Decision Support Monorepo**

MediKiosk automates outpatient intake through an accessible, multimodal patient kiosk UI (voice/touch, low-literacy friendly, multilingual) paired with an asynchronous backend pipeline and a dense, scannable physician review dashboard.

---

## Architecture & Clinical Journey

```
[ 1. Patient ] ──► [ 2. Identify ] ──► [ 3. Converse ] ──► [ 4. Scan ] ──► [ 5. Summarize ] ──► [ 6. Consult ]
  Arrival at       ABHA Scan /         Module A: AI         Module B:        Module C: AI          Doctor Review
  Hospital         Phone Number        History Engine       OCR Pipeline     Structured Draft      & Final Care
  OPD Kiosk        & Consent           (SOCRATES + AYUSH)   (Celery/Async)   (HPI, Meds, Vitals)   Dashboard
```

For in-depth architectural and design documentation, see:
- [Architecture & Workflow Pipeline](docs/architecture.md)
- [API Contracts & Schemas](docs/api-contracts.md)
- [Data Model & Entity Relationships](docs/data-model.md)

---

## Monorepo Layout

```
MediKiosk/
├── backend/                  # Django project (medikiosk_core) with DRF & SimpleJWT
│   ├── accounts/             # Custom User (PATIENT, DOCTOR, TRIAGE_STAFF, ADMIN), Profiles & Auth
│   ├── intake/               # Module A: Multimodal conversational history engine (SOCRATES + AYUSH)
│   ├── documents/            # Module B: OCR processing & prescription digitization (Celery async)
│   ├── summary/              # Module C: Structured clinical history generator
│   ├── consent/              # Module D: ABDM privacy consent & mock FHIR bundles
│   ├── triage/               # Red-flag detection & clinical alerts queue
│   └── medikiosk_core/       # Settings, Celery app config, root URLs, fixtures
├── frontend/                 # Vite + React 18 + Tailwind CSS
│   ├── src/
│   │   ├── pages/kiosk/      # /kiosk: IdentifyScreen, ConverseScreen, KioskView
│   │   ├── services/api.js   # Centralized API service layer
│   │   └── styles/           # design-tokens.js (shared design system)
├── docs/                     # Specifications: architecture.md, api-contracts.md, data-model.md
├── docker-compose.yml        # Multi-container orchestration (Postgres, Redis, Backend, Worker, Frontend)
├── .env.example              # Environment template
└── README.md
```

---

## Quickstart Guide

### Option 1: Run with Docker Compose (Recommended)

Spins up PostgreSQL 16, Redis 7, Django REST Framework, Celery Background Worker, and Vite React Dev Server:

```bash
# 1. Clone & copy environment
cp .env.example .env

# 2. Build and launch all 5 containers
docker compose up --build
```

- **Frontend (Kiosk & Doctor UI):** `http://localhost:5173`
- **Backend DRF API:** `http://localhost:8000/api/`
- **Health Check:** `http://localhost:8000/api/health/`

---

### Option 2: Run Bare-Metal Locally

#### Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations & seed data (with SQLite fallback if Postgres is not running)
USE_SQLITE=True python manage.py migrate
USE_SQLITE=True python manage.py seed_data

# Run Django development server
USE_SQLITE=True python manage.py runserver 0.0.0.0:8000
```

#### Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```

---

## Pre-Loaded Demo Accounts & Test Credentials

| Role | Username | Password | Full Name / Profile |
| :--- | :--- | :--- | :--- |
| **Doctor** | `dr_sharma` | `DoctorPass123!` | Dr. Rajesh Sharma, MD (General Medicine, Room 3) |
| **Doctor** | `dr_sen` | `DoctorPass123!` | Dr. Ananya Sen (Pulmonology, Room 7) |
| **Triage Staff**| `nurse_priya`| `StaffPass123!` | Nurse Priya Nair (Kiosk Station 01) |
| **Patient** | `sarah_jenkins`| `PatientPass123!` | Sarah Jenkins (ABHA: `14-8921-3490-1284`) |
| **Patient** | `ramesh_patel` | `PatientPass123!` | Ramesh Patel (ABHA: `14-4512-8809-3321`) |
| **Admin** | `admin` | `AdminPass123!` | System Administrator |

---

## Running Test Suites

Run the comprehensive Django REST Framework test suites for accounts and Module A intake:

```bash
cd backend

# Test accounts app (User roles, JWT auth, profile models, clinical permission classes)
USE_SQLITE=True python manage.py test accounts

# Test intake app (Module A SOCRATES engine, red-flag signals, AYUSH branch)
USE_SQLITE=True python manage.py test intake
```
