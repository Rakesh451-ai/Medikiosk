import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { TopNav } from './components/TopNav';
import { DocScanner } from './components/DocScanner';
import { MedicalSummary } from './components/MedicalSummary';
import { AgentWindow } from './components/AgentWindow';
import { KioskFrame } from './components/KioskFrame';
import { initialPatientData, samplePrescriptionDocs } from './data/mockData';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'doc' | 'summary' | 'agent'
  const [patient, setPatient] = useState(initialPatientData);
  const [scannedDocs, setScannedDocs] = useState(samplePrescriptionDocs);

  const handleLoginSuccess = (userData) => {
    setPatient((prev) => ({
      ...prev,
      ...userData
    }));
    // After login, navigate to Medical Summary or DocScanner
    setCurrentScreen('summary');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleDocumentScanned = (newDoc) => {
    // Add to scanned docs if not already present
    setScannedDocs((prev) => {
      const exists = prev.some((d) => d.id === newDoc.id);
      if (exists) return prev;
      return [newDoc, ...prev];
    });
  };

  const handleResetDemo = () => {
    setPatient(initialPatientData);
    setScannedDocs(samplePrescriptionDocs);
    setCurrentScreen('login');
  };

  return (
    <KioskFrame
      currentScreen={currentScreen}
      onSelectScreen={(screen) => setCurrentScreen(screen)}
      onResetDemo={handleResetDemo}
    >
      {/* If not on the login splash screen, render the authenticated Top Navigation */}
      {currentScreen !== 'login' && (
        <TopNav
          activeTab={currentScreen}
          onSelectTab={(tab) => setCurrentScreen(tab)}
          patient={patient}
          onLogout={handleLogout}
        />
      )}

      {/* Screen Views */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col bg-[#cbf5d6]">
        {currentScreen === 'login' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {currentScreen === 'doc' && (
          <DocScanner
            onDocumentScanned={handleDocumentScanned}
            onNavigateToSummary={() => setCurrentScreen('summary')}
            onNavigateToAgent={() => setCurrentScreen('agent')}
          />
        )}

        {currentScreen === 'summary' && (
          <MedicalSummary
            patient={patient}
            scannedDocs={scannedDocs}
            onNavigateToScanner={() => setCurrentScreen('doc')}
            onNavigateToAgent={() => setCurrentScreen('agent')}
          />
        )}

        {currentScreen === 'agent' && (
          <AgentWindow
            patient={patient}
            scannedDocs={scannedDocs}
            onNavigateToSummary={() => setCurrentScreen('summary')}
          />
        )}
      </div>
    </KioskFrame>
  );
}
