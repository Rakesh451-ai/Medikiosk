import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { HomePage } from './pages/HomePage';
import { ScannerPage } from './pages/ScannerPage';
import { SummaryPage } from './pages/SummaryPage';
import { AgentPage } from './pages/AgentPage';
import { RecordsPage } from './pages/RecordsPage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorLogin from './pages/doctor/DoctorLogin';
import KioskView from './pages/kiosk/KioskView';
import { api } from './services/api';
import { Stethoscope } from 'lucide-react';

export default function App() {
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [apiStatus, setApiStatus] = useState('online');

  const location = useLocation();
  const isDoctorRoute = location.pathname.startsWith('/doctor');
  const isKioskIntakeRoute = location.pathname.startsWith('/kiosk');

  // Sync data with Django REST API
  const refreshData = async (patientId = 'MK-78294') => {
    try {
      const p = await api.getPatient(patientId);
      setPatient(p);
      setVitals(p.latest_vitals);

      const [meds, docs] = await Promise.all([
        api.getMedications(p.patient_id),
        api.getDocuments(p.patient_id)
      ]);

      setMedications(meds);
      setDocuments(docs);
      setApiStatus('online');
    } catch (err) {
      console.warn('API error, working in offline fallback:', err);
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    refreshData('MK-78294');
  }, []);

  const handlePatientUpdated = (updatedPatient) => {
    setPatient(updatedPatient);
    refreshData(updatedPatient.patient_id);
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f7f4] text-slate-800 font-sans flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* Floating Doctor Access Switcher (only on main kiosk pages) */}
      {!isDoctorRoute && !isKioskIntakeRoute && (
        <div className="fixed top-3 right-3 z-40">
          <Link
            to="/doctor"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur shadow-md transition-all border border-slate-700/30 group"
            title="Switch to Clinical Doctor Portal"
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Doctor Portal</span>
          </Link>
        </div>
      )}

      {/* Multi-Page Routes */}
      <main className={`flex-1 w-full flex flex-col ${!isDoctorRoute && !isKioskIntakeRoute ? 'pb-28 md:pb-32' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                patient={patient}
                vitals={vitals}
                medications={medications}
                documents={documents}
                onPatientUpdated={handlePatientUpdated}
              />
            }
          />
          <Route
            path="/scanner"
            element={
              <ScannerPage
                patient={patient}
                onDocumentAdded={() => refreshData(patient?.patient_id)}
              />
            }
          />
          <Route
            path="/summary"
            element={
              <SummaryPage
                patient={patient}
                vitals={vitals}
                medications={medications}
                documents={documents}
                onDataUpdated={() => refreshData(patient?.patient_id)}
              />
            }
          />
          <Route
            path="/agent"
            element={
              <AgentPage
                patient={patient}
                vitals={vitals}
                medications={medications}
              />
            }
          />
          <Route
            path="/records"
            element={
              <RecordsPage
                documents={documents}
              />
            }
          />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/kiosk" element={<KioskView />} />
          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Universal Bottom Navigation Dock for PC, Tablets & Mobile (hidden on doctor & intake flows) */}
      {!isDoctorRoute && !isKioskIntakeRoute && (
        <BottomNav documentsCount={documents.length} />
      )}
    </div>
  );
}
