import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { ScannerPage } from './pages/ScannerPage';
import { SummaryPage } from './pages/SummaryPage';
import { AgentPage } from './pages/AgentPage';
import { RecordsPage } from './pages/RecordsPage';
import { api } from './services/api';

export default function App() {
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [apiStatus, setApiStatus] = useState('online');

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
    <Router>
      <div className="min-h-screen w-full bg-[#f0f7f4] text-slate-800 font-sans flex flex-col selection:bg-emerald-600 selection:text-white">
        
        {/* Universal Header with working URLs in every page */}
        <Navbar
          patient={patient}
          onPatientUpdated={handlePatientUpdated}
          apiStatus={apiStatus}
        />

        {/* Multi-Page Routes with mobile safe padding for bottom nav */}
        <main className="flex-1 w-full flex flex-col pb-20 md:pb-0">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  patient={patient}
                  vitals={vitals}
                  medications={medications}
                  documents={documents}
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
            {/* Fallback to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Universal Footer */}
        <Footer />

        {/* Responsive Mobile Bottom Navigation Bar */}
        <BottomNav documentsCount={documents.length} />
      </div>
    </Router>
  );
}
