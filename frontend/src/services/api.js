const API_BASE = '/api';

function getAuthHeaders(extraHeaders = {}, isJson = true) {
  const token = localStorage.getItem('medikiosk_token');
  const headers = { ...extraHeaders };
  if (isJson && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    throw new Error(`Network connection error: ${netErr.message}`);
  }

  if (res.status === 401) {
    localStorage.removeItem('medikiosk_token');
    localStorage.removeItem('medikiosk_user');
    window.dispatchEvent(new Event('medikiosk:unauthorized'));
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || 'Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || errorData.message || `Request failed (${res.status})`);
  }

  return await res.json();
}

export const api = {
  // 1. Health check
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health/`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API health check offline:', e);
    }
    return { status: 'offline' };
  },

  // 2. Auth & Accounts
  login: async (identifier, password) => {
    const payload = {
      identifier,
      auth_mode: 'password',
      password,
    };
    const data = await request('/auth/unified-login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data?.tokens?.access) {
      localStorage.setItem('medikiosk_token', data.tokens.access);
      if (data.tokens.refresh) localStorage.setItem('medikiosk_refresh', data.tokens.refresh);
      if (data.user) localStorage.setItem('medikiosk_user', JSON.stringify(data.user));
    }
    return data;
  },

  registerPatient: async (patientData) => {
    const data = await request('/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });

    if (data?.tokens?.access) {
      localStorage.setItem('medikiosk_token', data.tokens.access);
      if (data.tokens.refresh) localStorage.setItem('medikiosk_refresh', data.tokens.refresh);
      if (data.user) localStorage.setItem('medikiosk_user', JSON.stringify(data.user));
    }
    return data;
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('medikiosk_token');
    if (!token) return null;
    return await request('/auth/me/', {
      headers: getAuthHeaders(),
    });
  },

  lookupPatient: async (identifier) => {
    try {
      return await request(`/auth/lookup/?identifier=${encodeURIComponent(identifier)}`);
    } catch (e) {
      return { exists: false, identifier_type: 'auto' };
    }
  },

  sendOtp: async (identifier) => {
    return await request('/auth/otp/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
  },

  verifyOtp: async (identifier, otp, name = '', preferredLanguage = 'en', age = null) => {
    const payload = {
      identifier,
      otp,
      name,
      preferred_language: preferredLanguage,
    };
    if (age !== null && age !== undefined && age !== '') {
      payload.age = parseInt(age, 10);
    }
    const data = await request('/auth/otp/verify/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data?.tokens?.access) {
      localStorage.setItem('medikiosk_token', data.tokens.access);
      if (data.tokens.refresh) localStorage.setItem('medikiosk_refresh', data.tokens.refresh);
      if (data.user) localStorage.setItem('medikiosk_user', JSON.stringify(data.user));
    }
    return data;
  },

  unifiedLogin: async ({ identifier, authMode = 'password', otp = '', password = '', name = '', preferredLanguage = 'en', age = null }) => {
    const payload = {
      identifier,
      auth_mode: authMode,
      otp,
      password,
      name,
      preferred_language: preferredLanguage,
    };
    if (age !== null && age !== undefined && age !== '') {
      payload.age = parseInt(age, 10);
    }
    const data = await request('/auth/unified-login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data?.tokens?.access) {
      localStorage.setItem('medikiosk_token', data.tokens.access);
      if (data.tokens.refresh) localStorage.setItem('medikiosk_refresh', data.tokens.refresh);
      if (data.user) localStorage.setItem('medikiosk_user', JSON.stringify(data.user));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('medikiosk_token');
    localStorage.removeItem('medikiosk_refresh');
    localStorage.removeItem('medikiosk_user');
    window.dispatchEvent(new Event('medikiosk:logout'));
  },

  updatePatientProfile: async (profileData) => {
    return await request('/patient/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
  },

  // 3. Patient Details & Vitals
  getPatient: async (patientId = '') => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    return await request(`/patient/${query}`, {
      headers: getAuthHeaders(),
    });
  },

  getVitals: async (patientId = '') => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    return await request(`/patient/vitals/${query}`, {
      headers: getAuthHeaders(),
    });
  },

  getVitalsHistory: async (patientId = '') => {
    const base = patientId ? `?patient_id=${encodeURIComponent(patientId)}&history=true` : '?history=true';
    return await request(`/patient/vitals/${base}`, {
      headers: getAuthHeaders(),
    });
  },

  recordVitals: async (vitalsData) => {
    return await request('/patient/vitals/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(vitalsData),
    });
  },

  updateVitals: async (vitalsData) => {
    return await api.recordVitals(vitalsData);
  },

  // 4. Medications
  getMedications: async (patientId = '') => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const res = await request(`/medications/${query}`, {
      headers: getAuthHeaders(),
    });
    return Array.isArray(res) ? res : [];
  },

  markMedicationTaken: async (medId) => {
    return await request(`/medications/${medId}/taken/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  toggleMedication: async (medId) => {
    return await request(`/medications/${medId}/toggle/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // 5. Documents & Optical OCR Pipeline
  getDocuments: async (patientId = '') => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const data = await request(`/documents/${query}`, {
      headers: getAuthHeaders(),
    });
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.documents)) return data.documents;
    return [];
  },

  getDocument: async (docId) => {
    return await request(`/documents/${docId}/`, {
      headers: getAuthHeaders(),
    });
  },

  scanDocument: async (docData) => {
    let body;
    let headers = getAuthHeaders({}, false); // do not set Content-Type for FormData

    if (docData instanceof FormData) {
      body = docData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(docData);
    }

    return await request('/documents/scan/', {
      method: 'POST',
      headers,
      body,
    });
  },

  confirmDocument: async (confirmData) => {
    return await request('/documents/confirm/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(confirmData),
    });
  },

  // 6. AI Agent Chat & Multi-Thread Conversations
  getConversations: async (patientId = '') => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const res = await request(`/agent/conversations/${query}`, {
      headers: getAuthHeaders(),
    });
    return Array.isArray(res) ? res : [];
  },

  createConversation: async (title = '', patientId = '') => {
    return await request('/agent/conversations/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, patient_id: patientId }),
    });
  },

  getChatHistory: async (conversationId = '', patientId = '') => {
    const params = new URLSearchParams();
    if (conversationId) params.append('conversation_id', conversationId);
    if (patientId) params.append('patient_id', patientId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request(`/agent/chat/${qs}`, {
      headers: getAuthHeaders(),
    });
    return Array.isArray(res) ? res : [];
  },

  sendChatMessage: async (text, conversationId = '', patientId = '') => {
    return await request('/agent/chat/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        conversation_id: conversationId || undefined,
        patient_id: patientId || undefined
      }),
    });
  },

  // 7. Clinical Summary & Triage
  getPatientSummary: async (patientId = '') => {
    const query = patientId ? `${encodeURIComponent(patientId)}/` : '';
    return await request(`/summary/${query}`, {
      headers: getAuthHeaders(),
    });
  },

  getActiveAlerts: async () => {
    return await request('/triage/alerts/', {
      headers: getAuthHeaders(),
    });
  },

  grantConsent: async (patientId = '', purpose = 'CARE_CONSULTATION') => {
    return await request('/consent/grant/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ patient_id: patientId, purpose }),
    });
  },

  // 8. Conversational Intake Sessions (Kiosk)
  createIntakeSession: async ({ patientId = '', department = 'General Medicine', language = 'en', isAyush = false } = {}) => {
    return await request('/intake/sessions/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        patient_id: patientId,
        department,
        language,
        is_ayush_enabled: isAyush,
      }),
    });
  },

  sendIntakeSessionMessage: async (sessionId, message, inputMode = 'touch') => {
    return await request(`/intake/sessions/${sessionId}/message/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, input_mode: inputMode }),
    });
  },

  getIntakeSessionDraft: async (sessionId) => {
    return await request(`/intake/sessions/${sessionId}/draft/`, {
      headers: getAuthHeaders(),
    });
  },

  // 9. Admin Panel & Anti-Spam Security APIs (Secured with Admin JWT)
  getAdminHeaders: () => {
    const token = localStorage.getItem('medikiosk_admin_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  adminLogin: async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/admin/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.tokens?.access) {
        localStorage.setItem('medikiosk_admin_token', data.tokens.access);
        localStorage.setItem('medikiosk_admin_refresh', data.tokens.refresh);
        localStorage.setItem('medikiosk_admin_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Invalid administrator credentials.' };
    } catch (e) {
      return { success: false, error: 'Connection to administration service failed.' };
    }
  },

  adminLogout: () => {
    localStorage.removeItem('medikiosk_admin_token');
    localStorage.removeItem('medikiosk_admin_refresh');
    localStorage.removeItem('medikiosk_admin_user');
  },

  isAdminAuthenticated: () => {
    const token = localStorage.getItem('medikiosk_admin_token');
    const userStr = localStorage.getItem('medikiosk_admin_user');
    if (!token || !userStr) return false;
    try {
      const u = JSON.parse(userStr);
      return Boolean(u && (u.role === 'ADMIN' || u.is_superuser));
    } catch (e) {
      return false;
    }
  },

  getAdminStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats/`, {
        headers: api.getAdminHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  getAdminUsers: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/admin/users/${query ? `?${query}` : ''}`, {
        headers: api.getAdminHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { count: 0, users: [] };
  },

  getAdminUser: async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        headers: api.getAdminHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  toggleUserSpammer: async (userId, notes = '') => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ action: 'toggle_spammer', notes }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  toggleUserActive: async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ action: 'toggle_active' }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  updateAdminUser: async (userId, payload) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ action: 'edit_user', ...payload }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  deleteAdminUser: async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        method: 'DELETE',
        headers: api.getAdminHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  resetUserSecurity: async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ action: 'reset_security' }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  getBlockedIdentifiers: async (activeOnly = false) => {
    try {
      const res = await fetch(`${API_BASE}/admin/security/spammers/?active_only=${activeOnly}`, {
        headers: api.getAdminHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { count: 0, blocked_identifiers: [] };
  },

  blockIdentifier: async (identifier, identifierType = 'IP', reason = '') => {
    try {
      const res = await fetch(`${API_BASE}/admin/security/block/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ identifier, identifier_type: identifierType, reason }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  unblockIdentifier: async (id, identifier = '') => {
    try {
      const res = await fetch(`${API_BASE}/admin/security/unblock/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ id, identifier }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  getSecurityLogs: async (risk = 'ALL', event = 'ALL') => {
    try {
      const res = await fetch(`${API_BASE}/admin/security/logs/?risk=${risk}&event=${event}`, {
        headers: api.getAdminHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { count: 0, logs: [] };
  },

  simulateSecurityIncident: async (type = 'otp_flood') => {
    try {
      const res = await fetch(`${API_BASE}/admin/security/simulate/`, {
        method: 'POST',
        headers: api.getAdminHeaders(),
        body: JSON.stringify({ type }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }
};
