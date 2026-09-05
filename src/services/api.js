// Django REST Framework API Client for MediKiosk

const API_BASE = '/api';

export const api = {
  // Health check
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health/`);
      return await res.json();
    } catch (e) {
      console.error('API health error:', e);
      return { status: 'offline' };
    }
  },

  // Auth: Login
  async login(patientId = 'MK-78294', pin = '1234') {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, pin }),
    });
    if (!res.ok) throw new Error('Login failed');
    return await res.json();
  },

  // Auth: Register
  async signup(data) {
    const res = await fetch(`${API_BASE}/auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Signup failed');
    return await res.json();
  },

  // Patient details & vitals
  async getPatient(patientId) {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const res = await fetch(`${API_BASE}/patient/${query}`);
    if (!res.ok) throw new Error('Failed to fetch patient');
    return await res.json();
  },

  // Update vitals
  async updateVitals(vitalsData) {
    const res = await fetch(`${API_BASE}/patient/vitals/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vitalsData),
    });
    return await res.json();
  },

  // Scanned Documents
  async getDocuments(patientId) {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const res = await fetch(`${API_BASE}/documents/${query}`);
    return await res.json();
  },

  // Scan & upload document
  async scanDocument(docData) {
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
    return await res.json();
  },

  // Medications
  async getMedications(patientId) {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const res = await fetch(`${API_BASE}/medications/${query}`);
    return await res.json();
  },

  async toggleMedication(medId) {
    const res = await fetch(`${API_BASE}/medications/${medId}/toggle/`, {
      method: 'POST',
    });
    return await res.json();
  },

  // Conversations (ChatGPT History Section)
  async getConversations(patientId) {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const res = await fetch(`${API_BASE}/agent/conversations/${query}`);
    return await res.json();
  },

  async createConversation(title = 'New Consultation', language = 'en', patientId) {
    const res = await fetch(`${API_BASE}/agent/conversations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, language, patient_id: patientId }),
    });
    return await res.json();
  },

  async getConversationDetail(convId) {
    const res = await fetch(`${API_BASE}/agent/conversations/${convId}/`);
    return await res.json();
  },

  async deleteConversation(convId) {
    const res = await fetch(`${API_BASE}/agent/conversations/${convId}/`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  // AI Agent Chat (supports Hindi, English, Hinglish, & optional user API key)
  async sendChatMessage(text, patientId, conversationId = null, language = 'en', apiKey = '') {
    const res = await fetch(`${API_BASE}/agent/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        patient_id: patientId,
        conversation_id: conversationId,
        language,
        api_key: apiKey
      }),
    });
    return await res.json();
  },
};
