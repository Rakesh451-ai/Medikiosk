import React, { useState, useEffect } from 'react';
import { MobileAppContainer } from './components/mobile/MobileAppContainer';
import { MobileLogin } from './components/mobile/MobileLogin';
import { MobileSummary } from './components/mobile/MobileSummary';
import { MobileScanner } from './components/mobile/MobileScanner';
import { MobileAgent } from './components/mobile/MobileAgent';
import { MobileRecords } from './components/mobile/MobileRecords';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'summary' | 'doc' | 'agent' | 'records'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [apiStatus, setApiStatus] = useState('online');

  // Fetch live state from Django REST Framework backend
  const refreshAllData = async (patientId) => {
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
      console.warn('Could not sync with Django backend, fallback in effect:', err);
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    // Initial health check & data load
    api.getHealth()
      .then((h) => {
        if (h.status === 'online') {
          refreshAllData('MK-78294');
        }
      })
      .catch(() => setApiStatus('offline'));
  }, []);

  const handleLoginSuccess = (patientData) => {
    setPatient(patientData);
    setVitals(patientData.latest_vitals || vitals);
    setIsAuthenticated(true);
    setActiveTab('summary');
    refreshAllData(patientData.patient_id);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('login');
  };

  const handleResetDemo = () => {
    setIsAuthenticated(true);
    setActiveTab('summary');
    refreshAllData('MK-78294');
  };

  return (
    <MobileAppContainer
      activeTab={activeTab}
      onSelectTab={(tab) => {
        if (tab === 'login') {
          setIsAuthenticated(false);
        }
        setActiveTab(tab);
      }}
      isAuthenticated={isAuthenticated}
      patient={patient}
      docCount={documents.length}
      onResetDemo={handleResetDemo}
      apiStatus={apiStatus}
    >
      {/* 1. Login & Splash Screen */}
      {activeTab === 'login' && (
        <MobileLogin onLoginSuccess={handleLoginSuccess} />
      )}

      {/* 2. Medical Summary & Vitals */}
      {activeTab === 'summary' && (
        <MobileSummary
          patient={patient}
          vitals={vitals}
          medications={medications}
          documents={documents}
          onNavigateToScanner={() => setActiveTab('doc')}
          onNavigateToAgent={() => setActiveTab('agent')}
          onNavigateToRecords={() => setActiveTab('records')}
          onRefreshData={() => refreshAllData(patient?.patient_id)}
        />
      )}

      {/* 3. Optical Document Scanner */}
      {activeTab === 'doc' && (
        <MobileScanner
          patient={patient}
          onDocumentAdded={() => refreshAllData(patient?.patient_id)}
          onNavigateToSummary={() => setActiveTab('summary')}
          onNavigateToAgent={() => setActiveTab('agent')}
        />
      )}

      {/* 4. AI Health Agent */}
      {activeTab === 'agent' && (
        <MobileAgent
          patient={patient}
          onNavigateToSummary={() => setActiveTab('summary')}
        />
      )}

      {/* 5. Medical Records Timeline */}
      {activeTab === 'records' && (
        <MobileRecords
          documents={documents}
          onNavigateToScanner={() => setActiveTab('doc')}
          onNavigateToAgent={() => setActiveTab('agent')}
        />
      )}
    </MobileAppContainer>
  );
}
