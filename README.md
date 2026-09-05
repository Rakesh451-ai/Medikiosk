# MediKiosk - Smart Healthcare Patient Kiosk

MediKiosk is an interactive, responsive healthcare patient kiosk web application built with **React**, **Vite**, and **Tailwind CSS**. It was created by analyzing the 4 medical kiosk UI design mockups (`LoginScreen`, `DocScanner`, `MedicalSummary`, and `AgentWindow`).

---

## 🌟 Key Features

### 1. 🔐 Patient Login & Authentication (`LoginScreen`)
- Pixel-accurate implementation of the splash and welcome screen matching `#cbf5d6` mint green and `#297006` pill badge styling.
- Patient ID Check-In modal and new patient registration.
- Quick 1-Click Kiosk Demo access and RFID/QR card scan simulation.

### 2. 📄 Optical Document Scanner (`DocScanner`)
- Features **Scan** & **Upload** buttons with an indigo blue (`#3f51b5`) viewfinder.
- Animated laser scan line (`.laser-line`) simulating live medical optical character recognition (OCR).
- Drag-and-drop file upload for prescriptions and lab reports.
- Pre-loaded clinical test documents (Clinical Prescription, CBC & Metabolic Panel, Digital Chest X-Ray).
- Automated medical data extraction that syncs directly into the patient's summary.

### 3. 📊 Clinical Medical Summary (`MedicalSummary`)
- Cyan navigation bar (`#00bcd4`) with tabs for Agent, Scanner, and Summary.
- Prominent **"Medical Summary"** green badge.
- Live kiosk patient vitals: Pulse, Blood Pressure, SpO2, Temperature.
- Active prescription schedule tracker with morning, noon, and night dosage badges.
- Scanned diagnostic history with full clinical text modal.
- Printable summary report export.

### 4. 🤖 AI Clinical Health Agent (`AgentWindow`)
- Top royal blue header (`#3f51b5`) with orange square and circle status badges.
- Royal blue bottom prompt & voice input pill bar.
- Interactive conversational AI Medical Agent with intelligent triage responses.
- Automatic drug-allergy contraindication checks (e.g. alerts when Amoxicillin is prescribed to a patient with a Penicillin allergy).
- Web Speech Recognition for voice input and Text-to-Speech voice readout.

### 5. 🖥️ Interactive Kiosk Terminal Hardware Frame
- **Kiosk Terminal Mode:** Simulates a touchscreen kiosk terminal matching the 636×1042 portrait aspect ratio of the mockups.
- **Compare Design Mode:** Side-by-side view with the 4 original mockup PDFs/images to verify 1:1 visual match.
- **Full Display Mode:** Expands to desktop or widescreen kiosk terminals.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or v20+)
- npm

### Installation
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
The application will be accessible at:
- Local: `http://localhost:5173/`

### Build for Production
```bash
npm run build
npm run preview
```

---

## 📁 Project Structure
```
Medikiosk/
├── public/
│   └── reference/         # Original design mockup screenshots
├── src/
│   ├── components/
│   │   ├── LoginScreen.jsx     # Screen 1: Welcome & Patient Check-In
│   │   ├── DocScanner.jsx      # Screen 2: OCR Scanner & Document Upload
│   │   ├── MedicalSummary.jsx  # Screen 3: Patient Chart & Vitals Summary
│   │   ├── AgentWindow.jsx     # Screen 4: AI Medical Assistant & Voice Input
│   │   ├── TopNav.jsx          # Dynamic Header & Tab Navigation
│   │   └── KioskFrame.jsx      # Hardware Kiosk Chassis & Mode Switcher
│   ├── data/
│   │   └── mockData.js         # Patient records, sample reports & prescriptions
│   ├── App.jsx                 # Main state & screen coordinator
│   ├── index.css               # Tailwind & custom scan animations
│   └── main.jsx                # React root
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🎨 Color Palette Reference
- **Mint Green Background:** `#cbf5d6`
- **Medical Badge Green:** `#297006`
- **Dark Forest Green (Buttons/Text):** `#052e0a`
- **Indigo / Royal Blue (Scanner & Agent):** `#3f51b5`
- **Cyan (Summary Header):** `#00bcd4`
- **Orange / Amber (Accents & Badges):** `#ff9800`
