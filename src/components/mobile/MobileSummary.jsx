import React, { useState } from 'react';
import { 
  Heart, Activity, Thermometer, Droplet, Pill, FileText, CheckCircle2, 
  AlertTriangle, Printer, Sparkles, Plus, Clock, ChevronRight, User, RefreshCw 
} from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';

export function MobileSummary({ 
  patient, 
  vitals, 
  medications = [], 
  documents = [], 
  onNavigateToScanner, 
  onNavigateToAgent, 
  onNavigateToRecords,
  onRefreshData 
}) {
  const [togglingId, setTogglingId] = useState(null);
  const [isUpdatingVitals, setIsUpdatingVitals] = useState(false);

  const handleToggleMed = async (medId) => {
    setTogglingId(medId);
    try {
      await api.toggleMedication(medId);
      onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSimulateVitalsUpdate = async () => {
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
      onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingVitals(false);
    }
  };

  const handlePrint = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    setTimeout(() => window.print(), 350);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#cbf5d6] select-none font-sans overflow-y-auto pb-6">
      
      {/* Top Cyan Navigation Bar - Matches MedicalSummary.pdf */}
      <div className="w-full bg-[#00bcd4] py-2.5 px-4 shadow-sm flex items-center justify-between z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={onNavigateToAgent}
            className="px-3.5 py-1 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-xs shadow-xs transition"
          >
            Agent
          </button>
          <button
            onClick={onNavigateToScanner}
            className="px-3.5 py-1 rounded-full bg-[#ff9800] hover:bg-[#f57c00] text-black font-bold text-xs shadow-xs transition"
          >
            Scanner
          </button>
          <button
            className="px-3.5 py-1 rounded-full bg-[#ff9800] text-black font-extrabold text-xs shadow-xs ring-2 ring-white/60"
          >
            Summary
          </button>
        </div>

        {/* Orange Avatar Circle */}
        <div className="w-7 h-7 rounded-full bg-[#ff9800] ring-2 ring-white/60 flex items-center justify-center font-black text-black text-xs shadow-xs">
          {patient?.name?.[0] || 'S'}
        </div>
      </div>

      {/* Prominent Medical Summary Green Banner - 1:1 with MedicalSummary.pdf */}
      <div className="w-full pt-4 pb-3 px-4 flex justify-center z-10">
        <div className="w-full max-w-[320px] py-3 px-6 rounded-3xl bg-[#297006] shadow-md flex flex-col items-center justify-center transform active:scale-98 transition">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide text-center leading-snug">
            Medical<br />Summary
          </h2>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="w-full max-w-md mx-auto px-4 space-y-3">
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#297006]/20">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#cbf5d6] text-[#297006] font-bold text-lg flex items-center justify-center shadow-inner">
                {patient?.name?.[0] || 'S'}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h3>
                <p className="text-[11px] text-gray-500">ID: {patient?.patient_id || 'MK-78294'} • {patient?.gender || 'Female'}, {patient?.age || 38}y</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#297006] font-extrabold text-xs">
              {patient?.blood_group || 'A+'}
            </span>
          </div>

          {/* Known Allergies Warning Chip */}
          <div className="pt-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-rose-700 font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Allergies:</span>
              <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
                {Array.isArray(patient?.allergies) ? patient.allergies.join(', ') : 'Penicillin'}
              </span>
            </div>
            <button
              onClick={handleSimulateVitalsUpdate}
              disabled={isUpdatingVitals}
              className="text-[10px] font-bold text-[#297006] hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdatingVitals ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Vitals Grid */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#297006]/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#297006]" />
              <h4 className="font-bold text-xs text-[#052e0a]">Kiosk Live Vitals (Django Synced)</h4>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              Optimal
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Heart Rate */}
            <div className="bg-[#cbf5d6]/40 p-2.5 rounded-2xl border border-[#297006]/20 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500">Pulse</div>
                <div className="text-lg font-extrabold text-[#052e0a]">
                  {vitals?.heart_rate || 74} <span className="text-[11px] font-normal text-gray-600">bpm</span>
                </div>
              </div>
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/30" />
            </div>

            {/* Blood Pressure */}
            <div className="bg-[#cbf5d6]/40 p-2.5 rounded-2xl border border-[#297006]/20 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500">Blood Pressure</div>
                <div className="text-lg font-extrabold text-[#052e0a]">
                  {vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}
                </div>
              </div>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>

            {/* Oxygen SpO2 */}
            <div className="bg-[#cbf5d6]/40 p-2.5 rounded-2xl border border-[#297006]/20 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500">SpO2 Oxygen</div>
                <div className="text-lg font-extrabold text-[#052e0a]">
                  {vitals?.spo2 || 99}%
                </div>
              </div>
              <Droplet className="w-5 h-5 text-teal-600" />
            </div>

            {/* Temperature */}
            <div className="bg-[#cbf5d6]/40 p-2.5 rounded-2xl border border-[#297006]/20 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500">Temperature</div>
                <div className="text-lg font-extrabold text-[#052e0a]">
                  {vitals?.temperature || 98.4}°F
                </div>
              </div>
              <Thermometer className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Active Medications with Interactive Checkoff */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#297006]/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-[#297006]" />
              <h4 className="font-bold text-xs text-[#052e0a]">
                Active Prescriptions ({medications.length})
              </h4>
            </div>
            <button
              onClick={onNavigateToScanner}
              className="text-[11px] font-bold text-[#297006] hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> Scan New
            </button>
          </div>

          <div className="space-y-2">
            {medications.map((m) => (
              <div
                key={m.id}
                onClick={() => handleToggleMed(m.id)}
                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  m.taken_today
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-gray-50 hover:bg-[#cbf5d6]/30 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                      m.taken_today
                        ? 'bg-[#297006] text-white'
                        : 'border-2 border-gray-300 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div>
                    <h5 className={`font-bold text-xs ${m.taken_today ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {m.name} <span className="font-normal text-[10px] text-gray-500">({m.dose})</span>
                    </h5>
                    <p className="text-[10px] text-gray-500">{m.frequency} • {m.instruction}</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold bg-[#cbf5d6] text-[#052e0a] px-2 py-0.5 rounded-full">
                  {m.timing || 'Daily'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Doctor Recommendation Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#297006]/20 flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#3f51b5] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-xs text-[#052e0a]">AI Clinical Assistant Insight</h5>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              Penicillin allergy is documented. Chest X-Ray and CBC panels are clear. Tap below to speak with your AI Health Agent.
            </p>
            <button
              onClick={onNavigateToAgent}
              className="mt-2 text-[11px] font-bold text-[#3f51b5] hover:underline flex items-center gap-1"
            >
              <span>Ask AI Doctor Questions</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Quick Kiosk Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-full bg-[#052e0a] hover:bg-[#0a4213] active:scale-95 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Patient Chart</span>
          </button>
          <button
            onClick={onNavigateToRecords}
            className="flex-1 py-3 rounded-full bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 text-black font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4" />
            <span>View All Records ({documents.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
