import React, { useState } from 'react';
import { 
  Heart, Activity, Thermometer, Droplet, Pill, FileText, CheckCircle2, 
  AlertTriangle, Printer, Sparkles, Plus, Clock, ChevronRight, RefreshCw, X, ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

export function SummaryPage({ patient, vitals, medications = [], documents = [], onDataUpdated }) {
  const [isUpdatingVitals, setIsUpdatingVitals] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleToggleMed = async (medId) => {
    try {
      await api.toggleMedication(medId);
      onDataUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateVitals = async () => {
    setIsUpdatingVitals(true);
    try {
      const newVitals = {
        patient_id: patient?.patient_id || 'MK-78294',
        heart_rate: Math.floor(70 + Math.random() * 12),
        bp_systolic: Math.floor(115 + Math.random() * 10),
        bp_diastolic: Math.floor(75 + Math.random() * 8),
        spo2: Math.floor(98 + Math.random() * 2),
        temperature: parseFloat((98.2 + Math.random() * 0.5).toFixed(1)),
        glucose: Math.floor(90 + Math.random() * 10)
      };
      await api.updateVitals(newVitals);
      onDataUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingVitals(false);
    }
  };

  const handlePrint = () => {
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
    setTimeout(() => window.print(), 350);
  };

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Top Header Banner - Faithful to MedicalSummary.pdf */}
        <div className="bg-[#00bcd4] rounded-3xl p-4 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="py-2 px-6 rounded-full bg-[#297006] shadow-sm flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Medical Summary
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white/90">Comprehensive Clinical Patient Record</p>
              <p className="text-[11px] text-cyan-100">Synchronized with Django REST API</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-full bg-[#ff9800] hover:bg-[#f57c00] text-black font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Chart</span>
            </button>
            <Link
              to="/agent"
              className="px-4 py-2 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Doctor</span>
            </Link>
          </div>
        </div>

        {/* Patient Demographic Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#297006]/20">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#cbf5d6] text-[#297006] font-extrabold text-2xl flex items-center justify-center shadow-inner">
                {patient?.name?.[0] || 'S'}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h2>
                <p className="text-xs text-gray-500">
                  ID: <strong className="text-gray-800">{patient?.patient_id || 'MK-78294'}</strong> • {patient?.gender || 'Female'}, {patient?.age || 38} years
                </p>
                <p className="text-[11px] text-gray-500">Primary: {patient?.primary_doctor || 'Dr. Michael Chen, MD (Cardiology)'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-100 text-[#297006] font-black text-sm">
                  Blood: {patient?.blood_group || 'A+'}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">Emergency: {patient?.emergency_contact}</p>
              </div>
            </div>
          </div>

          {/* Known Allergies Alert Banner */}
          <div className="pt-3 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Documented Allergies:</span>
              <span className="bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-lg font-extrabold">
                {Array.isArray(patient?.allergies) ? patient.allergies.join(', ') : 'Penicillin, Sulfa Drugs'}
              </span>
            </div>
            <button
              onClick={handleSimulateVitals}
              disabled={isUpdatingVitals}
              className="px-3 py-1 rounded-full bg-[#cbf5d6] text-[#052e0a] font-bold text-xs hover:bg-[#b5ecc4] transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingVitals ? 'animate-spin' : ''}`} />
              <span>{isUpdatingVitals ? 'Measuring...' : 'Take New Vitals Measurement'}</span>
            </button>
          </div>
        </div>

        {/* Live Vitals Grid */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#297006]/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#297006]" />
              <h3 className="font-extrabold text-base text-[#052e0a]">Live Kiosk Patient Vitals</h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Optimal Rhythm
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Resting Pulse</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.heart_rate || 74} <small className="font-normal text-xs text-gray-500">bpm</small></span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Optimal Rhythm</span>
              </div>
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500/20" />
            </div>

            <div className="p-4 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Blood Pressure</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Standard mmHg</span>
              </div>
              <Activity className="w-7 h-7 text-blue-600" />
            </div>

            <div className="p-4 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">SpO2 Oxygen</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.spo2 || 99}%</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Oxygenated</span>
              </div>
              <Droplet className="w-7 h-7 text-teal-600" />
            </div>

            <div className="p-4 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Temperature</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.temperature || 98.4}°F</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Normothermic</span>
              </div>
              <Thermometer className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Active Medications & Scanned Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Medications */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#297006]/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#297006]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#052e0a]">Active Prescriptions ({medications.length})</h3>
              </div>
              <Link to="/scanner" className="text-xs font-bold text-[#297006] hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Scan New Rx
              </Link>
            </div>

            <div className="space-y-2">
              {medications.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMed(m.id)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer text-xs ${
                    m.taken_today
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 line-through opacity-75'
                      : 'bg-gray-50 hover:bg-[#cbf5d6]/30 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      m.taken_today ? 'bg-[#297006] text-white' : 'border-2 border-gray-300 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{m.name} <span className="font-normal text-xs text-gray-500">({m.dose})</span></h4>
                      <p className="text-xs text-gray-500">{m.frequency} • {m.instruction}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-[#cbf5d6] text-[#052e0a] px-3 py-1 rounded-full">
                    {m.timing}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Scans & Reports */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#297006]/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3f51b5]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#052e0a]">Scanned Diagnostic Reports ({documents.length})</h3>
              </div>
              <Link to="/records" className="text-xs font-bold text-[#3f51b5] hover:underline">
                View Full Archive →
              </Link>
            </div>

            <div className="space-y-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d)}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-between text-xs cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#3f51b5] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{d.title}</h4>
                      <p className="text-[11px] text-gray-500">{d.doctor} • {d.doc_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                      OCR {d.confidence}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* DOCUMENT DETAIL MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-gray-900">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border-4 border-[#297006] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h4 className="font-extrabold text-base text-gray-900 truncate">{selectedDoc.title}</h4>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Provider</span>
                  <p className="font-semibold text-gray-800">{selectedDoc.doctor}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Facility</span>
                  <p className="font-semibold text-gray-800">{selectedDoc.facility}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Diagnosis / Impression</span>
                <p className="p-3 bg-emerald-50 text-[#052e0a] rounded-xl font-medium mt-1">
                  {selectedDoc.diagnosis}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Raw Clinical Text</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed mt-1">
                  {selectedDoc.extracted_text}
                </pre>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/agent"
                className="flex-1 py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Ask AI Health Agent About This Report</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
