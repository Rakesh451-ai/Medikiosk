import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { HomePage } from './pages/HomePage';
import { ScannerPage } from './pages/ScannerPage';
import { SummaryPage } from './pages/SummaryPage';
import { AgentPage } from './pages/AgentPage';
import { RecordsPage } from './pages/RecordsPage';
import KioskView from './pages/kiosk/KioskView';
import AuthPage from './pages/auth/AuthPage';
import AdminPanel from './pages/admin/AdminPanel';
import { api } from './services/api';
import { ShieldCheck, LogOut, Loader2, HeartPulse } from 'lucide-react';

function getStoredPatient() {
  try {
    const raw = localStorage.getItem('medikiosk_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    const profile = user.patient_profile || user.profile || {};
    return {
      patient_id: profile.mock_abha_id || profile.mock_aadhaar_id || user.username || String(user.id || ''),
      name: profile.name || user.name || user.first_name || user.username || 'Patient',
      gender: profile.gender || '',
      age: profile.age || null,
      phone: profile.phone || '',
      mock_abha_id: profile.mock_abha_id || '',
      mock_aadhaar_id: profile.mock_aadhaar_id || '',
      blood_group: profile.blood_group || '',
      allergies: profile.allergies || [],
      chronic_conditions: profile.chronic_conditions || [],
      primary_doctor: profile.primary_doctor || '',
      hospital_name: profile.hospital_name || '',
      emergency_contact: profile.emergency_contact || '',
      has_scanned_documents: profile.has_scanned_documents || false,
      latest_vitals: profile.latest_vitals || null
    };
  } catch (_) {
    return null;
  }
}

export default function App() {
  const [patient, setPatient] = useState(() => getStoredPatient());
  const [authStatus, setAuthStatus] = useState(() => {
    const token = localStorage.getItem('medikiosk_token');
    return token ? 'authenticated' : 'unauthenticated';
  });
  const [vitals, setVitals] = useState(() => patient?.latest_vitals || null);
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [apiStatus, setApiStatus] = useState('online');

  const location = useLocation();
  const navigate = useNavigate();

  const isKioskIntakeRoute = location.pathname.startsWith('/kiosk');
  const isAuthRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/auth');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHomeRoute = location.pathname === '/';

  // Sync data with Django REST API
  const refreshData = useCallback(async (patientId = '') => {
    try {
      const pid = patientId || patient?.patient_id;
      const [p, vitalsRes, meds, docs, sumRes] = await Promise.all([
        api.getPatient(pid || '').catch(() => null),
        api.getVitals(pid || '').catch(() => null),
        api.getMedications(pid || '').catch(() => []),
        api.getDocuments(pid || '').catch(() => []),
        api.getPatientSummary(pid || '').catch(() => null)
      ]);

      if (p) {
        setPatient(prev => ({
          ...(prev || {}),
          ...p,
          name: p.name || prev?.name || 'Patient'
        }));
      }

      const mergedVitals = (vitalsRes?.latest && Object.keys(vitalsRes.latest).length > 0)
        ? vitalsRes.latest
        : (p?.latest_vitals && Object.keys(p.latest_vitals).length > 0 ? p.latest_vitals : null);

      if (mergedVitals) {
        setVitals(mergedVitals);
      }

      setMedications(Array.isArray(meds) ? meds : []);
      setDocuments(Array.isArray(docs) ? docs : []);
      if (sumRes) {
        setSummary(sumRes);
      } else if (p?.summary) {
        setSummary(p.summary);
      }
      setApiStatus('online');
    } catch (err) {
      console.warn('API refresh error:', err);
      setApiStatus('offline');
    }
  }, [patient?.patient_id]);

  // Session verification on initial load
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem('medikiosk_token');
      if (!token) {
        if (isMounted) {
          setAuthStatus('unauthenticated');
          setPatient(null);
        }
        return;
      }

      try {
        const user = await api.getCurrentUser();
        if (!isMounted) return;

        if (user) {
          const profile = user.patient_profile || user.profile || {};
          const loadedPatient = {
            patient_id: profile.mock_abha_id || profile.mock_aadhaar_id || user.username || String(user.id),
            name: profile.name || user.name || user.first_name || user.username || 'Patient',
            gender: profile.gender || '',
            age: profile.age || null,
            phone: profile.phone || '',
            mock_abha_id: profile.mock_abha_id || '',
            mock_aadhaar_id: profile.mock_aadhaar_id || '',
            blood_group: profile.blood_group || '',
            allergies: profile.allergies || [],
            chronic_conditions: profile.chronic_conditions || [],
            primary_doctor: profile.primary_doctor || '',
            hospital_name: profile.hospital_name || '',
            emergency_contact: profile.emergency_contact || '',
            has_scanned_documents: profile.has_scanned_documents || false,
            latest_vitals: profile.latest_vitals || null
          };

          localStorage.setItem('medikiosk_user', JSON.stringify(user));
          setPatient(loadedPatient);
          if (loadedPatient.latest_vitals) {
            setVitals(loadedPatient.latest_vitals);
          }
          setAuthStatus('authenticated');
          refreshData(loadedPatient.patient_id).catch(() => {});
        } else {
          setAuthStatus('unauthenticated');
        }
      } catch (err) {
        console.warn('Session verification error:', err);
        // Only log out on confirmed 401 Unauthorized
        if (err?.status === 401 || err?.message?.includes('401')) {
          if (isMounted) {
            api.logout();
            setAuthStatus('unauthenticated');
            setPatient(null);
          }
        }
      }
    };

    verifySession();

    const handleUnauthorized = () => {
      setAuthStatus('unauthenticated');
      setPatient(null);
      setVitals(null);
      setMedications([]);
      setDocuments([]);
    };

    window.addEventListener('medikiosk:unauthorized', handleUnauthorized);
    window.addEventListener('medikiosk:logout', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('medikiosk:unauthorized', handleUnauthorized);
      window.removeEventListener('medikiosk:logout', handleUnauthorized);
    };
  }, []);

  const handlePatientUpdated = (updatedPatient) => {
    setPatient(updatedPatient);
    refreshData(updatedPatient?.patient_id);
  };

  const handleAuthSuccess = (userData) => {
    const profile = userData?.patient_profile || userData?.profile || {};
    const targetId = profile?.mock_abha_id || profile?.mock_aadhaar_id || userData?.username || String(userData?.id || '');
    const newPatient = {
      patient_id: targetId || 'Patient',
      name: profile?.name || userData?.name || userData?.first_name || userData?.username || 'Patient',
      gender: profile?.gender || '',
      age: profile?.age || null,
      phone: profile?.phone || '',
      mock_abha_id: profile?.mock_abha_id || '',
      mock_aadhaar_id: profile?.mock_aadhaar_id || '',
      blood_group: profile?.blood_group || '',
      allergies: profile?.allergies || [],
      chronic_conditions: profile?.chronic_conditions || [],
      primary_doctor: profile?.primary_doctor || '',
      hospital_name: profile?.hospital_name || '',
      emergency_contact: profile?.emergency_contact || '',
      has_scanned_documents: profile?.has_scanned_documents || false,
      latest_vitals: profile?.latest_vitals || null
    };
    setPatient(newPatient);
    if (newPatient.latest_vitals) {
      setVitals(newPatient.latest_vitals);
    }
    setAuthStatus('authenticated');
    refreshData(targetId);
  };

  const handleLogout = () => {
    api.logout();
    setAuthStatus('unauthenticated');
    setPatient(null);
    setVitals(null);
    setMedications([]);
    setDocuments([]);
    navigate('/login');
  };

  // Themed splash while checking session
  if (authStatus === 'checking_session') {
    return (
      <div className="min-h-screen w-full bg-[#f0f7f4] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-700/20 animate-pulse">
            <HeartPulse className="w-9 h-9" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">MediKiosk Health Station</h2>
            <p className="text-xs text-slate-500 mt-1">Connecting to clinical records...</p>
          </div>
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        </div>
      </div>
    );
  }

  const isAuthenticated = authStatus === 'authenticated';

  return (
    <div className="min-h-screen w-full bg-[#f0f7f4] text-slate-800 font-sans flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* Floating Header Switcher (Visible on subpages like /scanner, /summary, /agent, etc.) */}
      {!isKioskIntakeRoute && !isAuthRoute && !isHomeRoute && !isAdminRoute && (
        <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 bg-white/95 rounded-full p-1 shadow-md border border-emerald-300">
              <span className="flex items-center gap-1.5 px-3 py-1 text-emerald-950 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{patient?.name ? patient.name.split(' ')[0] : 'Patient'}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-full hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-emerald-950 text-xs font-bold backdrop-blur shadow-md transition-all border border-emerald-300 group"
              title="Sign In"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      )}

      {/* Multi-Page Routes */}
      <main className={`flex-1 w-full flex flex-col ${!isKioskIntakeRoute && !isAuthRoute && !isAdminRoute ? 'pb-28 md:pb-32' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <HomePage
                  patient={patient}
                  vitals={vitals}
                  medications={medications}
                  documents={documents}
                  onPatientUpdated={handlePatientUpdated}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/scanner"
            element={
              isAuthenticated ? (
                <ScannerPage
                  patient={patient}
                  onDocumentAdded={(newProfile) => {
                    if (newProfile) {
                      setPatient(prev => ({
                        ...(prev || {}),
                        ...newProfile,
                        has_scanned_documents: true
                      }));
                      if (newProfile.latest_vitals) {
                        setVitals(newProfile.latest_vitals);
                      }
                    }
                    refreshData(patient?.patient_id);
                  }}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/summary"
            element={
              isAuthenticated ? (
                <SummaryPage
                  patient={patient}
                  vitals={vitals}
                  medications={medications}
                  documents={documents}
                  summary={summary}
                  onDataUpdated={() => refreshData(patient?.patient_id)}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/vitals" element={<Navigate to="/summary" replace />} />
          <Route path="/doctor" element={<Navigate to="/summary" replace />} />
          <Route
            path="/agent"
            element={
              isAuthenticated ? (
                <AgentPage
                  patient={patient}
                  vitals={vitals}
                  medications={medications}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/records"
            element={
              isAuthenticated ? (
                <RecordsPage
                  patient={patient}
                  documents={documents}
                  onDataUpdated={() => refreshData(patient?.patient_id)}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/kiosk" element={<KioskView />} />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AuthPage onLoginSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/auth"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AuthPage onLoginSuccess={handleAuthSuccess} />
              )
            }
          />
          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Universal Bottom Navigation Dock for PC, Tablets & Mobile (hidden on intake, auth & admin flows) */}
      {!isKioskIntakeRoute && !isAuthRoute && !isAdminRoute && (
        <BottomNav documentsCount={documents.length} />
      )}
    </div>
  );
}
