import React, { useState } from 'react';
import IdentifyScreen from './IdentifyScreen';
import ConverseScreen from './ConverseScreen';
import { Camera, RefreshCw, CheckCircle, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export default function KioskView() {
  const [currentStep, setCurrentStep] = useState(1); // 1: Identify, 2: Converse, 3: Scan, 4: Complete
  const [patientSession, setPatientSession] = useState(null);

  // Scan state (Stage 3)
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'scanning' | 'scanned'

  const handleIdentifyComplete = (patientData) => {
    setPatientSession(patientData);
    setCurrentStep(2); // Advance to Stage 2: Converse
  };

  const handleConverseComplete = () => {
    setCurrentStep(3); // Advance to Stage 3: Scan
  };

  const handleScanSimulation = () => {
    setScanStatus('scanning');
    setTimeout(() => {
      setScanStatus('scanned');
    }, 2000);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f0fdf4] text-slate-900 flex flex-col justify-between select-none">
      
      {/* 5-Stage Stepper Bar */}
      <div className="bg-[#cbf5d6] border-b border-emerald-300 py-3 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {[
            { step: 1, label: '1. Identify' },
            { step: 2, label: '2. Converse' },
            { step: 3, label: '3. Scan OCR' },
            { step: 4, label: '4. Complete' },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center space-x-2 text-xs sm:text-sm font-bold transition-all ${
                currentStep === s.step
                  ? 'text-emerald-950 font-black'
                  : currentStep > s.step
                  ? 'text-emerald-700'
                  : 'text-emerald-600/60'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStep === s.step
                    ? 'bg-emerald-800 text-white'
                    : currentStep > s.step
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-200 text-emerald-800'
                }`}
              >
                {currentStep > s.step ? '✓' : s.step}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Step Views */}
      <main className="flex-1 py-4 sm:py-8">
        {/* STAGE 1: IDENTIFY & CONSENT */}
        {currentStep === 1 && (
          <IdentifyScreen onComplete={handleIdentifyComplete} />
        )}

        {/* STAGE 2: CONVERSE (Module A Multimodal Engine) */}
        {currentStep === 2 && (
          <ConverseScreen
            patientSession={patientSession}
            onComplete={handleConverseComplete}
          />
        )}

        {/* STAGE 3: SCAN (Module B Document OCR) */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto p-6 sm:p-10">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-emerald-200 shadow-2xl text-center space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Stage 3 of 5: Document Scanner
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                  Scan Previous Medical Prescriptions
                </h2>
                <p className="text-lg text-slate-600">
                  Hold prior prescriptions under the kiosk camera for automated OCR digitization.
                </p>
              </div>

              {scanStatus === 'idle' && (
                <div className="border-4 border-dashed border-emerald-300 rounded-3xl p-10 bg-emerald-50/50 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Camera className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-800">Ready to Scan</h3>
                    <p className="text-slate-500 text-sm">Align document in the scanning tray.</p>
                  </div>
                  <button
                    onClick={handleScanSimulation}
                    className="py-4 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-2xl shadow-lg kiosk-touch-target"
                  >
                    📸 Scan Document Now
                  </button>
                </div>
              )}

              {scanStatus === 'scanning' && (
                <div className="py-16 space-y-6">
                  <RefreshCw className="w-16 h-16 text-emerald-600 animate-spin mx-auto" />
                  <h3 className="text-2xl font-bold text-slate-800">Digitizing Prescription via OCR...</h3>
                  <p className="text-slate-500">Celery worker extracting active medications & clinical entities.</p>
                </div>
              )}

              {scanStatus === 'scanned' && (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 text-left space-y-4">
                  <div className="flex items-center space-x-3 text-emerald-800 font-bold text-xl">
                    <CheckCircle className="w-7 h-7 text-emerald-600" />
                    <span>Prescription Digitized & Structured!</span>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-sm space-y-2">
                    <div className="font-bold text-slate-800">City Clinic Prior Prescription (Dr. Mehta)</div>
                    <div className="p-2.5 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>Contraindication Alert: Augmentin detected with Penicillin allergy!</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-2xl shadow-lg kiosk-touch-target"
                  >
                    Issue Check-In Ticket & Complete
                  </button>
                </div>
              )}

              {scanStatus === 'idle' && (
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-slate-500 font-semibold text-lg hover:underline"
                >
                  I don't have any prescriptions today → Skip to Ticket
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 4: TICKET ASSIGNED & COMPLETE */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto p-6 sm:p-10">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border-4 border-emerald-400 shadow-2xl text-center space-y-8 animate-fadeIn">
              <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <Check className="w-14 h-14" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Check-In Complete
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                  Token #42 Issued
                </h1>
                <p className="text-xl text-emerald-800 font-bold">
                  Please proceed to Consultation Room 3 (Dr. Rajesh Sharma)
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-sm space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-bold">Patient Name:</span>
                  <span>{patientSession?.name || 'Outpatient'}</span>
                </div>
                {patientSession?.mockAbhaId && (
                  <div className="flex justify-between">
                    <span className="font-bold">ABHA ID:</span>
                    <span className="font-mono text-emerald-700 font-bold">{patientSession.mockAbhaId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">Summary Status:</span>
                  <span className="text-emerald-700 font-bold">Transmitted to Doctor Screen</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setCurrentStep(1);
                  setScanStatus('idle');
                }}
                className="py-4 px-10 bg-slate-900 hover:bg-black text-white text-lg font-bold rounded-2xl shadow-md transition-all kiosk-touch-target"
              >
                Return to Welcome Screen
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Emergency Help Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs font-semibold text-slate-500">
        MediKiosk Outpatient Terminal • ABDM Certified Sandbox • Need help? Tap the nurse call on the kiosk pillar.
      </footer>
    </div>
  );
}
