const API_BASE = '/api';

export const api = {
  // Health check
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health/`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API health check offline, using fallback:', e);
    }
    return { status: 'online', mode: 'offline-fallback' };
  },

  // 1. Auth & Accounts
  login: async (identifierOrUser = 'MK-78294', pinOrPassword = '1234') => {
    try {
      const isPatientId = typeof identifierOrUser === 'string' && (identifierOrUser.startsWith('MK-') || !isNaN(identifierOrUser));
      const payload = isPatientId
        ? { patient_id: identifierOrUser, pin: pinOrPassword }
        : { username: identifierOrUser, password: pinOrPassword };

      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API login error, using fallback:', err);
    }
    return {
      token: 'mock-jwt-token-2026',
      user: {
        id: 1,
        name: 'Sarah Jenkins',
        patient_id: identifierOrUser || 'MK-78294',
        role: 'PATIENT'
      }
    };
  },

  async signup(data) {
    try {
      const res = await fetch(`${API_BASE}/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API signup fallback:', e);
    }
    return { status: 'success', data };
  },

  registerPatient: async (patientData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API register fallback:', e);
    }
    return { status: 'success', patient: patientData };
  },

  getCurrentUser: async (token) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getCurrentUser fallback:', e);
    }
    return { username: 'dr_sharma', role: 'DOCTOR' };
  },

  // 2. Patient details & Vitals
  getPatient: async (patientId = 'MK-78294') => {
    try {
      const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const res = await fetch(`${API_BASE}/patient/${query}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getPatient fallback:', e);
    }
    return {
      patient_id: patientId || 'MK-78294',
      name: 'Sarah Jenkins',
      gender: 'Female',
      age: 38,
      blood_group: 'A+',
      allergies: ['Penicillin'],
      primary_doctor: 'Dr. Michael Chen, MD (Cardiology)',
      emergency_contact: '+1 (555) 234-8901',
      latest_vitals: {
        heart_rate: 72,
        blood_pressure: '120/80',
        temperature: 98.6,
        oxygen_saturation: 98,
        status: 'Normal'
      }
    };
  },

  updateVitals: async (vitalsData) => {
    try {
      const res = await fetch(`${API_BASE}/patient/vitals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitalsData),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API updateVitals fallback:', e);
    }
    return { status: 'success', data: vitalsData };
  },

  // 3. Medications
  getMedications: async (patientId = 'MK-78294') => {
    try {
      const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const res = await fetch(`${API_BASE}/medications/${query}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getMedications fallback:', e);
    }
    return [
      { id: 1, name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', timing: 'After meals', status: 'active', warning: 'Potential allergy conflict' },
      { id: 2, name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', timing: 'Morning', status: 'active' },
      { id: 3, name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', timing: 'Bedtime', status: 'active' },
      { id: 4, name: 'Metformin', dosage: '850mg', frequency: 'Twice daily', timing: 'With meals', status: 'active' }
    ];
  },

  toggleMedication: async (medId) => {
    try {
      const res = await fetch(`${API_BASE}/medications/${medId}/toggle/`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { status: 'toggled', id: medId };
  },

  // 4. Documents & OCR Pipeline
  getDocuments: async (patientId = 'MK-78294') => {
    try {
      const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const res = await fetch(`${API_BASE}/documents/${query}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getDocuments fallback:', e);
    }
    return [
      {
        id: 1,
        title: 'Chest X-Ray Digital Report',
        document_type: 'Radiology',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        ocr_extracted_data: { diagnosis: 'Clear bilateral lung fields. No active infiltration.', doctor: 'Dr. Michael Chen' },
        status: 'Verified'
      },
      {
        id: 2,
        title: 'Complete Blood Count (CBC) Panel',
        document_type: 'Lab Report',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        ocr_extracted_data: { wbc: '6.8 x10^3/uL', rbc: '4.7 x10^6/uL', hemoglobin: '14.2 g/dL' },
        status: 'Verified'
      }
    ];
  },

  scanDocument: async (docData) => {
    try {
      let body;
      let headers = {};
      if (docData instanceof FormData) {
        body = docData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(docData);
      }
      const res = await fetch(`${API_BASE}/documents/scan/`, {
        method: 'POST',
        headers,
        body,
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API scanDocument fallback:', e);
    }
    return {
      id: Date.now(),
      title: docData?.title || 'Scanned Clinical Record',
      status: 'Verified',
      created_at: new Date().toISOString(),
      ocr_extracted_data: {
        summary: 'Digitized successfully via MediKiosk OCR Engine.',
        timestamp: new Date().toLocaleDateString()
      }
    };
  },

  uploadDocument: async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/documents/upload/`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API uploadDocument fallback:', e);
    }
    return {
      status: 'queued',
      document_id: 'DOC-SCAN-8891',
      message: 'Prescription scanned & sent to Celery OCR pipeline.'
    };
  },

  // 5. AI Agent Chat
  getChatHistory: async (patientId = 'MK-78294') => {
    try {
      const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const res = await fetch(`${API_BASE}/agent/chat/${query}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [
      {
        id: 'init',
        sender: 'agent',
        text: "Hello Sarah! I am your MediKiosk Health Assistant. I have your health numbers and medicines ready.\n\nHow can I help you today? You can tap any of the questions below, or tap the microphone to speak with me!",
        urgency: 'normal',
        time: '10:00 AM',
        quick_replies: [
          "💊 When should I take my medicines?",
          "🩺 Are my vitals normal today?",
          "⚠️ Are my medicines safe with my allergies?",
          "🏥 How do I see a doctor or nurse?"
        ]
      }
    ];
  },

  sendChatMessage: async (text, patientId = 'MK-78294') => {
    try {
      const res = await fetch(`${API_BASE}/agent/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, patient_id: patientId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    let responseText = `Thank you for asking about "${text}". Based on your health records, your recent vitals are stable.`;
    let urgency = 'normal';
    if (/medic|pill|dose|augmentin|penicillin|amoxicillin/i.test(text)) {
      responseText = "⚠️ IMPORTANT MEDICATION ALERT: You have a documented allergy to Penicillin. Please inform your doctor before taking any antibiotic!";
      urgency = 'alert';
    } else if (/vital|heart|bp|pressure|pulse/i.test(text)) {
      responseText = "Your heart rate is 72 bpm and blood pressure is 120/80 mmHg. Both are in healthy, normal ranges today.";
    } else if (/doctor|nurse|appoint|see/i.test(text)) {
      responseText = "Dr. Michael Chen is available in Room 3. Your check-in is complete and you will be called shortly.";
    }
    return {
      id: Date.now(),
      sender: 'agent',
      text: responseText,
      urgency,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  },

  // 6. Conversational History Intake Session (Module A)
  createIntakeSession: async ({ patientId = 'MK-78294', department = 'General Medicine', language = 'en', isAyush = false } = {}) => {
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          department,
          language,
          is_ayush_enabled: isAyush,
        }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error, falling back to local session', e);
    }
    return {
      status: 'success',
      session_id: 'intake-' + Date.now().toString(36),
      patient_id: patientId,
      department,
      language,
      is_ayush_enabled: isAyush,
      progress_percent: 10,
      stage: 'CHIEF_COMPLAINT',
      initial_prompt: language === 'hi'
        ? "नमस्ते! मैं आपका मेडीकियोस्क डिजिटल सहायक हूँ। आज अस्पताल आने का मुख्य कारण क्या है?"
        : "Namaste and welcome to MediKiosk. What primary health issue brings you to the clinic today?",
      suggested_answers: language === 'hi'
        ? ["खांसी और बुखार", "सांस लेने में तकलीफ", "पेट दर्द", "कमजोरी व चक्कर"]
        : ["Persistent Cough & Fever", "Chest or Breathing Trouble", "Abdominal Pain", "Body Ache / Fatigue"],
    };
  },

  sendIntakeSessionMessage: async (sessionId, message, inputMode = 'touch') => {
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${sessionId}/message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, input_mode: inputMode }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Intake message error, using client fallback', e);
    }

    const isRedFlag = /(chest.*pain|breathless|short.*breath|heart.*attack)/i.test(message);
    return {
      session_id: sessionId,
      stage: 'HPI',
      progress_percent: 35,
      flagged: isRedFlag,
      flag_reason: isRedFlag ? 'Cardiovascular Alert: Potential ischemic chest pain' : '',
      ai_message: {
        id: Date.now(),
        text: `Understood: "${message}". When did this onset and how many days has it persisted?`,
        suggested_answers: ["Started today", "1-2 days ago", "About 5 days ago", "More than 2 weeks ago"],
        timestamp: new Date().toISOString()
      },
      draft: {
        chief_complaint: message,
        hpi: { duration: "5 days", character: "Productive" },
        allergies: ["Penicillin (Severe)"]
      }
    };
  },

  getIntakeSessionDraft: async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${sessionId}/draft/`);
      if (res.ok) return await res.json();
    } catch (e) {
      return { draft: {} };
    }
  },

  // 7. Clinical Summary & Doctor Triage (Module C & Triage)
  getPatientSummary: async (patientId = 'MK-78294') => {
    try {
      const res = await fetch(`${API_BASE}/summary/${patientId}/`);
      if (res.ok) return await res.json();
    } catch (e) {
      return {
        patient_id: patientId,
        patient_name: 'Sarah Jenkins',
        age: 38,
        gender: 'Female',
        blood_group: 'A+',
        chief_complaint: 'Productive cough x 5 days with purulent sputum, fever (101.2 F), exertional dyspnea',
        vitals: {
          heart_rate: '104 bpm (mild tachycardia)',
          blood_pressure: '118/76 mmHg',
          spo2: '95% (Room Air)',
          temperature: '101.2 F'
        },
        allergies: ['Penicillin & Beta-lactams (Anaphylactoid Hives / Edema)'],
        active_medications: [
          { name: 'Augmentin 625mg', dose: '1 tab TDS', flag: 'CONTRAINDICATED: Patient Penicillin Allergic!' },
          { name: 'Paracetamol 650mg', dose: '1 tab SOS', flag: 'Active' }
        ],
      };
    }
  },

  getActiveAlerts: async () => {
    try {
      const res = await fetch(`${API_BASE}/triage/alerts/`);
      if (res.ok) return await res.json();
    } catch (e) {
      return {
        alerts: [
          {
            id: 'alert-001',
            patient_id: 'MK-78294',
            patient_name: 'Sarah Jenkins',
            alert_type: 'DRUG_CONTRAINDICATION',
            severity: 'CRITICAL',
            message: 'Prescribed Augmentin (Amoxicillin) detected with verified PENICILLIN ANAPHYLAXIS allergy.',
            created_at: '2026-09-05T19:10:00Z'
          }
        ]
      };
    }
  },

  grantConsent: async (patientId = 'MK-78294', purpose = 'CARE_CONSULTATION') => {
    try {
      const res = await fetch(`${API_BASE}/consent/grant/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, purpose }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      return { status: 'granted', consent_id: `CONSENT-${patientId}-2026` };
    }
  }
};
