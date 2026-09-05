export const initialPatientData = {
  id: "MK-78294",
  name: "Sarah Jenkins",
  age: 38,
  gender: "Female",
  bloodGroup: "A+",
  allergies: ["Penicillin", "Sulfa Drugs"],
  emergencyContact: "+1 (555) 382-9912 (Spouse)",
  vitals: {
    heartRate: 74,
    bpSystolic: 118,
    bpDiastolic: 78,
    spO2: 99,
    temperature: 98.4,
    glucose: 92,
    weightKg: 64,
    heightCm: 168
  },
  lastVisit: "May 14, 2026",
  primaryDoctor: "Dr. Michael Chen, MD (Cardiology)"
};

export const samplePrescriptionDocs = [
  {
    id: "doc-1",
    title: "Clinical Prescription - Dr. Michael Chen",
    type: "Prescription",
    date: "Sep 04, 2026",
    facility: "Metro General Hospital",
    doctor: "Dr. Michael Chen, MD",
    diagnosis: "Seasonal Respiratory Tract Infection & Mild Bronchospasm",
    extractedText: `METRO GENERAL HOSPITAL - CLINICAL PRESCRIPTION
Date: Sep 04, 2026 | Ref: #RX-99214
Patient: Sarah Jenkins (Age: 38)
Rx:
1. Amoxicillin 500mg - 1 capsule oral, every 8 hours x 7 days
2. Levocetirizine 5mg - 1 tablet oral, bedtime x 5 days
3. Fluticasone Nasal Spray - 2 sprays each nostril daily
Notes: Hydrate adequately. Return if fever persists beyond 72 hours.`,
    medications: [
      { name: "Amoxicillin", dose: "500 mg", frequency: "3 times daily", duration: "7 days", instruction: "After meals with full glass of water", time: "Morning, Noon, Night", status: "Active" },
      { name: "Levocetirizine", dose: "5 mg", frequency: "Once daily", duration: "5 days", instruction: "At bedtime", time: "Night", status: "Active" },
      { name: "Fluticasone Spray", dose: "50 mcg", frequency: "2 sprays/nostril", duration: "10 days", instruction: "Morning after cleansing", time: "Morning", status: "Active" }
    ],
    confidence: "99.4%"
  },
  {
    id: "doc-2",
    title: "Comprehensive Metabolic Panel & CBC",
    type: "Lab Report",
    date: "Aug 28, 2026",
    facility: "BioPath Diagnostic Laboratories",
    doctor: "Dr. Rachel Adams, Pathologist",
    diagnosis: "Routine Wellness & Fasting Lipid Panel",
    extractedText: `BIOPATH DIAGNOSTIC LABORATORIES
Patient: Sarah Jenkins | Date of Collection: 28-Aug-2026
Test: Comprehensive Lipid Profile & CBC
- Hemoglobin: 13.8 g/dL (Normal: 12.0 - 15.5)
- White Blood Cells (WBC): 6,800 /mcL (Normal: 4,500 - 11,000)
- Fasting Blood Sugar: 92 mg/dL (Normal: 70 - 99)
- Total Cholesterol: 198 mg/dL (Desirable: <200)
- HDL (Good): 58 mg/dL (Optimal: >50)
- LDL (Calculated): 112 mg/dL (Near optimal: 100 - 129)
Impression: All hematologic and metabolic markers within healthy target boundaries.`,
    medications: [
      { name: "Omega-3 Fish Oil", dose: "1000 mg", frequency: "Daily", duration: "Ongoing", instruction: "With breakfast", time: "Morning", status: "Supplement" }
    ],
    confidence: "98.9%"
  },
  {
    id: "doc-3",
    title: "Digital Chest Radiography (PA View)",
    type: "Radiology",
    date: "Aug 10, 2026",
    facility: "Advanced Imaging Center",
    doctor: "Dr. K. Vance, Radiologist",
    diagnosis: "Chest X-Ray Post-Viral Clearance",
    extractedText: `ADVANCED RADIOLOGY & DIAGNOSTICS
Examination: Chest X-Ray PA & Lateral View
Indication: Follow-up post-cough
Findings:
1. Lungs are clear without focal alveolar consolidation, pneumothorax, or pleural effusion.
2. Cardiothoracic ratio is normal (0.45).
3. Mediastinal and hilar contours are unremarkable.
4. Bony thorax and soft tissues intact.
Impression: Normal radiographic study of the chest.`,
    medications: [],
    confidence: "99.8%"
  }
];

export const initialAgentMessages = [
  {
    id: "msg-1",
    sender: "agent",
    time: "10:14 AM",
    text: "Hello! Welcome to MediKiosk AI Health Agent. I am here to assist you with your health records, medications, symptoms, and scan analysis. How can I help you today?",
    quickReplies: [
      "Explain my latest scan",
      "Check medication schedule",
      "Are there any drug interactions?",
      "Need a doctor appointment"
    ]
  }
];
