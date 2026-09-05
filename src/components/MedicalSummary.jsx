import React, { useState } from 'react';
import { 
  Heart, Activity, Thermometer, Droplet, Pill, FileText, CheckCircle2, 
  AlertTriangle, Printer, Download, Share2, Sparkles, Plus, Clock, Stethoscope, ChevronRight 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function MedicalSummary({ patient, scannedDocs, onNavigateToScanner, onNavigateToAgent }) {
  const [selectedDocModal, setSelectedDocModal] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Combine initial medications with any scanned documents
  const allMedications = scannedDocs.flatMap((doc) => doc.medications || []);

  const handlePrint = () => {
    setIsExporting(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 400);
  };

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col bg-[#cbf5d6] select-none font-sans overflow-y-auto">
      {/* Centered Green Badge Banner - Matches MedicalSummary.pdf Faithfully */}
      <div className="w-full pt-6 pb-4 px-6 flex flex-col items-center z-10">
        <div className="w-full max-w-[340px] py-4 px-6 rounded-3xl bg-[#297006] shadow-lg flex flex-col items-center justify-center transform hover:scale-[1.01] transition-transform">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-wide text-center leading-tight">
            Medical<br />Summary
          </h2>
        </div>
      </div>

      {/* Patient Information & Clinical Chart Body */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 pb-8 space-y-4">
        
        {/* Patient Identity Card */}
        <div className="bg-white rounded-3xl p-4 md:p-5 shadow-md border border-[#297006]/20">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#cbf5d6] text-[#297006] font-bold text-xl flex items-center justify-center shadow-inner">
                {patient?.name?.[0] || 'S'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h3>
                <p className="text-xs text-gray-500">ID: {patient?.id || 'MK-78294'} • {patient?.gender || 'Female'}, {patient?.age || 38} yrs</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-[#297006] font-bold text-xs">
                Blood: {patient?.bloodGroup || 'A+'}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">Primary: Dr. M. Chen</p>
            </div>
          </div>

          {/* Known Allergies Alert */}
          <div className="pt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Allergies:</span>
              <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                {patient?.allergies?.join(', ') || 'Penicillin'}
              </span>
            </div>
            <span className="text-gray-500 text-[11px]">Last Updated: Today</span>
          </div>
        </div>

        {/* Vital Signs Grid */}
        <div className="bg-white rounded-3xl p-4 shadow-md border border-[#297006]/20">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#297006]" />
              <h4 className="font-bold text-sm text-[#052e0a]">Live Kiosk Vitals</h4>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              Normal Status
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Heart Rate */}
            <div className="bg-[#cbf5d6]/40 p-3 rounded-2xl border border-[#297006]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-600">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span className="text-[10px] font-bold text-gray-500">Pulse</span>
              </div>
              <div className="mt-1">
                <div className="text-xl font-extrabold text-[#052e0a]">
                  {patient?.vitals?.heartRate || 74} <span className="text-xs font-normal text-gray-600">bpm</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">Optimal Rhythm</div>
              </div>
            </div>

            {/* Blood Pressure */}
            <div className="bg-[#cbf5d6]/40 p-3 rounded-2xl border border-[#297006]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-600">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold text-gray-500">BP</span>
              </div>
              <div className="mt-1">
                <div className="text-xl font-extrabold text-[#052e0a]">
                  {patient?.vitals?.bpSystolic || 118}/{patient?.vitals?.bpDiastolic || 78}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">Standard mmHg</div>
              </div>
            </div>

            {/* Oxygen SpO2 */}
            <div className="bg-[#cbf5d6]/40 p-3 rounded-2xl border border-[#297006]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-teal-600">
                <Droplet className="w-4 h-4" />
                <span className="text-[10px] font-bold text-gray-500">SpO2</span>
              </div>
              <div className="mt-1">
                <div className="text-xl font-extrabold text-[#052e0a]">
                  {patient?.vitals?.spO2 || 99}%
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">Oxygenated</div>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-[#cbf5d6]/40 p-3 rounded-2xl border border-[#297006]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-600">
                <Thermometer className="w-4 h-4" />
                <span className="text-[10px] font-bold text-gray-500">Temp</span>
              </div>
              <div className="mt-1">
                <div className="text-xl font-extrabold text-[#052e0a]">
                  {patient?.vitals?.temperature || 98.4}°F
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">Afebril</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Prescriptions & Medications */}
        <div className="bg-white rounded-3xl p-4 md:p-5 shadow-md border border-[#297006]/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#297006]" />
              <h4 className="font-bold text-sm text-[#052e0a]">
                Active Medications ({allMedications.length})
              </h4>
            </div>
            <button
              onClick={onNavigateToScanner}
              className="text-xs font-bold text-[#297006] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Scan New Rx
            </button>
          </div>

          <div className="space-y-2">
            {allMedications.map((med, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-gray-50 hover:bg-[#cbf5d6]/20 border border-gray-100 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#297006] flex items-center justify-center font-bold">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-gray-900">{med.name} <span className="text-xs font-normal text-gray-500">({med.dose})</span></h5>
                    <p className="text-xs text-gray-500">{med.frequency} • {med.instruction}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-[#cbf5d6] text-[#052e0a] font-bold text-[11px]">
                    {med.time || 'Daily'}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{med.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scanned Diagnostic Documents */}
        <div className="bg-white rounded-3xl p-4 md:p-5 shadow-md border border-[#297006]/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#297006]" />
              <h4 className="font-bold text-sm text-[#052e0a]">Scanned Medical Records</h4>
            </div>
            <span className="text-xs text-gray-500">{scannedDocs.length} Documents On File</span>
          </div>

          <div className="space-y-2">
            {scannedDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocModal(doc)}
                className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#3f51b5] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs md:text-sm text-gray-900 line-clamp-1">{doc.title}</h5>
                    <p className="text-[11px] text-gray-500">{doc.doctor} • {doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                    Verified OCR
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kiosk Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="flex-1 min-w-[140px] py-3 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>{isExporting ? 'Printing...' : 'Print Summary'}</span>
          </button>

          <button
            onClick={onNavigateToAgent}
            className="flex-1 min-w-[140px] py-3 rounded-full bg-[#ff9800] hover:bg-[#f57c00] text-black font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask AI Health Agent</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT DETAIL MODAL */}
      {selectedDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border-4 border-[#297006] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{selectedDocModal.title}</h3>
              <button
                onClick={() => setSelectedDocModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 uppercase text-[10px] font-bold block">Facility</span>
                  <span className="font-semibold text-gray-800">{selectedDocModal.facility}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase text-[10px] font-bold block">Date</span>
                  <span className="font-semibold text-gray-800">{selectedDocModal.date}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-1">Extracted Clinical Content</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed">
                  {selectedDocModal.extractedText}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setSelectedDocModal(null);
                  onNavigateToAgent();
                }}
                className="flex-1 py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Ask AI Agent About this Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
