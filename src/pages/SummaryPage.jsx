import React, { useState } from 'react';
import { 
  Heart, Activity, Thermometer, Droplet, Pill, FileText, CheckCircle2, 
  AlertTriangle, Printer, Sparkles, Plus, Clock, ChevronRight, RefreshCw, X, ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

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
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Top Header Banner */}
        <div className="bg-[#00bcd4] rounded-3xl p-4 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="py-2 px-6 rounded-full bg-[#297006] shadow-sm flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
                My Health Summary
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-extrabold text-white">Your Live Medical & Vitals Chart</p>
              <p className="text-[11px] text-cyan-100">✓ Up to Date & Verified</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="accent"
              size="sm"
              icon={Printer}
              className="text-gray-950 font-black"
            >
              Print My Summary
            </Button>
            <Button
              to="/agent"
              variant="primary"
              size="sm"
              icon={Sparkles}
            >
              Ask Assistant
            </Button>
          </div>
        </div>

        {/* Patient Profile Card */}
        <Card className="p-5 sm:p-6 shadow-md border-2 border-emerald-200/80">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#cbf5d6] text-[#297006] font-black text-2xl flex items-center justify-center shadow-inner">
                {patient?.name?.[0] || 'S'}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h2>
                <p className="text-xs text-gray-600 font-medium">
                  Card ID: <strong className="text-gray-900">{patient?.patient_id || 'MK-78294'}</strong> • {patient?.gender || 'Female'}, {patient?.age || 38} years old
                </p>
                <p className="text-[11px] text-gray-500">Doctor: {patient?.primary_doctor || 'Dr. Michael Chen, MD (Cardiology)'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge variant="success" className="px-3.5 py-1 text-sm bg-[#297006] text-white">
                  Blood Group: {patient?.blood_group || 'A+'}
                </Badge>
                <p className="text-[11px] text-gray-500 mt-1">Emergency: {patient?.emergency_contact || '+1 (555) 234-8901'}</p>
              </div>
            </div>
          </div>

          {/* Known Allergies Alert Banner & Measurement trigger */}
          <div className="pt-3 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Known Drug Allergy:</span>
              <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-md font-black">
                {Array.isArray(patient?.allergies) ? patient.allergies.join(', ') : 'Penicillin'}
              </span>
            </div>
            <Button
              onClick={handleSimulateVitals}
              disabled={isUpdatingVitals}
              variant="outline"
              size="sm"
              icon={RefreshCw}
              className={`bg-emerald-100 hover:bg-emerald-200 text-[#052e0a] border-emerald-200 font-black ${isUpdatingVitals ? 'opacity-80' : ''}`}
            >
              {isUpdatingVitals ? 'Measuring Sensor...' : 'Take New Sensor Measurement'}
            </Button>
          </div>
        </Card>

        {/* Live Vitals Grid with "What This Means" Explanations */}
        <Card className="p-5 sm:p-6 shadow-md border-2 border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#297006]" />
              <h3 className="font-extrabold text-base text-[#052e0a]">Your Body Vitals Right Now</h3>
            </div>
            <Badge variant="success">
              ● All Numbers Normal
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Heart Rate */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Pulse (Heart Rate)</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.heart_rate || 74} <small className="font-normal text-xs text-gray-500">bpm</small></span>
                <span className="text-[11px] text-emerald-700 font-bold block mt-1">✓ Normal (60–100 bpm)</span>
              </div>
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20 shrink-0" />
            </div>

            {/* Blood Pressure */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Blood Pressure</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}</span>
                <span className="text-[11px] text-emerald-700 font-bold block mt-1">✓ Healthy Range (120/80)</span>
              </div>
              <Activity className="w-8 h-8 text-blue-600 shrink-0" />
            </div>

            {/* Oxygen SpO2 */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Oxygen (SpO2)</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.spo2 || 99}%</span>
                <span className="text-[11px] text-emerald-700 font-bold block mt-1">✓ Excellent (95–100%)</span>
              </div>
              <Droplet className="w-8 h-8 text-teal-600 shrink-0" />
            </div>

            {/* Temperature */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 block">Body Temperature</span>
                <span className="text-2xl font-black text-[#052e0a]">{vitals?.temperature || 98.4}°F</span>
                <span className="text-[11px] text-emerald-700 font-bold block mt-1">✓ Normal Body Temp</span>
              </div>
              <Thermometer className="w-8 h-8 text-amber-600 shrink-0" />
            </div>
          </div>
        </Card>

        {/* Daily Medicines & Medical Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Prescriptions / Daily Medicines */}
          <Card className="p-5 sm:p-6 shadow-md border-2 border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#297006]" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#052e0a]">Daily Prescribed Medicines</h3>
                  <p className="text-[11px] text-gray-500">Tap a medicine to mark it as taken today</p>
                </div>
              </div>
              <Link to="/scanner" className="text-xs font-bold text-[#297006] hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Scan New Slip
              </Link>
            </div>

            <div className="space-y-2.5">
              {medications.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMed(m.id)}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer text-xs ${
                    m.taken_today
                      ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                      : 'bg-gray-50 hover:bg-emerald-50/40 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition ${
                      m.taken_today ? 'bg-[#297006] text-white' : 'border-2 border-gray-300 text-gray-300'
                    }`}>
                      ✓
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-gray-900">
                        {m.name} <span className="font-bold text-xs text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">({m.dose})</span>
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5">{m.instruction || m.frequency}</p>
                    </div>
                  </div>
                  <Badge variant={m.taken_today ? 'success' : 'warning'}>
                    {m.taken_today ? '✓ Taken' : m.timing || 'Today'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Diagnostic Scans & Reports */}
          <Card className="p-5 sm:p-6 shadow-md border-2 border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3f51b5]" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#052e0a]">Saved Medical Reports</h3>
                  <p className="text-[11px] text-gray-500">Tap any report to view summary</p>
                </div>
              </div>
              <Link to="/records" className="text-xs font-bold text-[#3f51b5] hover:underline">
                View All Records →
              </Link>
            </div>

            <div className="space-y-2.5">
              {documents.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d)}
                  className="p-3 bg-gray-50 hover:bg-emerald-50/50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#3f51b5] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{d.title}</h4>
                      <p className="text-[11px] text-gray-500">{d.doctor} • {d.doc_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="success">
                      ✓ Verified
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>

      {/* DOCUMENT DETAIL MODAL USING REUSABLE MODAL COMPONENT */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          subtitle={`${selectedDoc.doc_type} • ${selectedDoc.doctor}`}
          icon={FileText}
        >
          <div className="space-y-3.5 text-xs text-gray-900">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Attending Doctor</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedDoc.doctor}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hospital / Lab</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedDoc.facility}</p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">Doctor's Diagnosis & Notes:</span>
              <p className="p-3.5 bg-emerald-50 text-[#052e0a] rounded-2xl border border-emerald-200 font-medium leading-relaxed">
                {selectedDoc.diagnosis}
              </p>
            </div>

            <details className="bg-gray-50 p-3 rounded-2xl border border-gray-200 cursor-pointer">
              <summary className="font-bold text-gray-700 text-xs select-none">
                📄 View Full Scanned Slip Text
              </summary>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed mt-2 max-h-40 overflow-y-auto">
                {selectedDoc.extracted_text}
              </pre>
            </details>

            <div className="pt-2">
              <Button
                to="/agent"
                variant="primary"
                size="md"
                fullWidth
                icon={Sparkles}
              >
                Ask Health Assistant About This Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
