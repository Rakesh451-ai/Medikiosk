# MediKiosk - Smart Mobile Healthcare Kiosk & Patient Portal

MediKiosk is a modern, responsive, mobile-first patient healthcare portal built with **React (Vite + Tailwind CSS)** and a robust **Django + Django REST Framework (DRF)** backend.

Designed from the 4 medical kiosk UI design mockups (`LoginScreen`, `DocScanner`, `MedicalSummary`, and `AgentWindow`), MediKiosk has been modernized for mobile touch interactions with a clean, intuitive interface and real-time backend synchronization.

---

## 🌟 Modern Architecture Overview

```
                          ┌──────────────────────────┐
                          │   React (Vite + Tailwind)│
                          │   Mobile & Kiosk UI      │
                          │   Port 5173              │
                          └─────────────┬────────────┘
                                        │  /api proxy
                                        ▼
                          ┌──────────────────────────┐
                          │  Django REST Framework   │
                          │  RESTful API             │
                          │  Port 8000               │
                          └─────────────┬────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 SQLite3 Database             Clinical AI & OCR Engine
```

---

## 📱 Mobile-First Screens & Features

### 1. 🔐 Modernized Mobile Login (`LoginScreen`)
- Clean, tactile login screen honoring `#cbf5d6` mint green and `#297006` pill badge styling.
- **1-Tap Demo Check-In** (Sarah Jenkins, MK-78294).
- Patient ID login and new patient registration form connected to Django `/api/auth/signup/`.

### 2. 📊 Medical Summary & Patient Dashboard (`MedicalSummary`)
- Prominent **"Medical Summary"** green badge matching the design mockup.
- **Live Kiosk Vitals:** Pulse, BP, SpO2, Temperature, Blood Sugar (synchronized with Django `/api/patient/vitals/`).
- **Interactive Daily Prescription Tracker:** Toggle medications as taken with instant backend persistence (`/api/medications/<id>/toggle/`).
- **Clinical AI Assistant Insights:** Summarizes active conditions, recent tests, and pending follow-ups.
- Print Patient Chart & Export summary report.

### 3. 📄 Optical Document Scanner (`DocScanner`)
- Indigo blue (`#3f51b5`) optical camera viewfinder with animated laser scanning beam (`.laser-line`).
- **Dual Mode:** Live optical scan viewfinder + drag-and-drop file upload.
- **Preset Clinical Test Documents:**
  1. *Clinical Prescription (Dr. Michael Chen, Amoxicillin 500mg, Levocetirizine)*
  2. *Metabolic & Lipid Blood Panel (BioPath Labs)*
  3. *Digital Chest Radiography PA View (Clear lung fields)*
- **Live OCR Extraction:** Sends document payloads to Django `/api/documents/scan/` which automatically parses diagnoses, medications, and runs allergy contraindication checks!

### 4. 🤖 AI Clinical Health Agent (`AgentWindow`)
- Top royal blue header (`#3f51b5`) with orange status icons.
- Bottom royal blue input pill bar with Speech Recognition microphone (Web Speech API) and text input.
- **Intelligent Clinical Evaluation Engine:** Powered by Django `/api/agent/chat/`.
  - **Allergy Contraindication Alert:** Automatically flags that Sarah has a Penicillin allergy and warns against taking Amoxicillin!
  - Lab test interpretation (cholesterol, glucose, hemoglobin).
  - Resting vitals triage.
  - Text-to-Speech (TTS) voice readouts.

### 5. 📁 Medical Records Timeline (`MobileRecords`)
- Chronological timeline of scanned prescriptions and lab reports fetched from Django `/api/documents/`.
- Category filtering: Prescriptions, Lab Reports, Radiology.
- Clinical OCR inspection modal.

---

## 🚀 Running the Full Stack

### 1. Start the Django REST Framework Backend
```bash
# From repository root
python3 backend/manage.py migrate
python3 backend/manage.py runserver 0.0.0.0:8000
```
API endpoints available at `http://localhost:8000/api/`

### 2. Start the React Frontend
```bash
npm install
npm run dev
```
Frontend available at `http://localhost:5173/` (proxies `/api` directly to Django)

---

## 📡 Django REST API Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health/` | `GET` | Health check, server uptime, database records count |
| `/api/auth/login/` | `POST` | Authenticate patient session |
| `/api/auth/signup/` | `POST` | Register new patient & create digital chart |
| `/api/patient/` | `GET` | Fetch active patient profile, allergies & latest vitals |
| `/api/patient/vitals/` | `POST/PUT` | Record new vital sign measurements |
| `/api/documents/` | `GET` | List all scanned documents & prescriptions |
| `/api/documents/scan/` | `POST` | Optical scan / upload document with automated OCR extraction |
| `/api/medications/` | `GET/POST` | List active prescriptions or add new medication |
| `/api/medications/<id>/toggle/` | `POST` | Mark dose as taken today |
| `/api/agent/chat/` | `GET/POST` | Conversational Medical AI Agent with allergy & triage evaluation |

---

## 📁 Project Directory Structure
```
Medikiosk/
├── backend/
│   ├── api/
│   │   ├── migrations/
│   │   ├── models.py         # Patient, Vitals, MedicalDocument, Medication, ChatMessage
│   │   ├── serializers.py    # DRF Serializers
│   │   ├── views.py          # REST endpoints & AI Clinical Logic
│   │   └── urls.py           # API Route mappings
│   ├── medikiosk_backend/
│   │   ├── settings.py       # Django configuration (CORS, DRF, Apps)
│   │   └── urls.py           # Root URL configuration
│   └── manage.py
├── src/
│   ├── components/
│   │   └── mobile/
│   │       ├── MobileStatusBar.jsx    # iOS/Android dynamic status bar
│   │       ├── MobileNavBar.jsx       # Bottom tab bar (Summary, Scan, Agent, Records)
│   │       ├── MobileLogin.jsx        # Screen 1: Modern Mobile Login
│   │       ├── MobileSummary.jsx      # Screen 3: Medical Summary & Vitals
│   │       ├── MobileScanner.jsx      # Screen 2: Optical Doc Scanner & OCR
│   │       ├── MobileAgent.jsx        # Screen 4: AI Doctor Voice & Chat
│   │       ├── MobileRecords.jsx      # Records timeline & OCR detail modal
│   │       └── MobileAppContainer.jsx # Smartphone hardware frame & mode switcher
│   ├── services/
│   │   └── api.js                     # Django API client service
│   ├── App.jsx                        # Root React application
│   ├── index.css                      # Tailwind & animations
│   └── main.jsx
├── public/reference/                  # 4 original mockup PNGs for 1:1 comparison
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js                     # Configured with Django /api proxy
```
