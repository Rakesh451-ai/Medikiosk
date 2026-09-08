import React, { useState, useEffect } from 'react';
import { 
  Heart, Activity, Thermometer, Droplet, Pill, FileText, CheckCircle2, 
  AlertTriangle, Printer, Sparkles, Plus, Clock, ChevronRight, RefreshCw, X, ArrowRight,
  TrendingUp, TrendingDown, Minus, Calendar, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export function SummaryPage({ patient, vitals, medications = [], documents = [], onDataUpdated }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState('');

  // Form state for recording new vitals reading
  const [formBpSys, setFormBpSys] = useState('');
  const [formBpDia, setFormBpDia] = useState('');
  const [formHeartRate, setFormHeartRate] = useState('');
  const [formSpo2, setFormSpo2] = useState('');
  const [formTemp, setFormTemp] = useState('');
  const [formGlucose, setFormGlucose] = useState('');

  // Fetch real vitals history for trend analysis
  const loadVitalsHistory = async () => {
    setLoadingHistory(true);
    try {
      const pid = patient?.patient_id;
      const history = await api.getVitalsHistory(pid || '');
      if (Array.isArray(history)) {
        setVitalsHistory(history);
      } else if (history && Array.isArray(history.readings)) {
        setVitalsHistory(history.readings);
      }
    } catch (e) {
      console.warn('Failed to load vitals history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadVitalsHistory();
  }, [patient?.patient_id]);

  const handleToggleMed = async (medId) => {
    try {
      await api.markMedicationTaken(medId);
      if (onDataUpdated) onDataUpdated();
    } catch (e) {
      try {
        await api.toggleMedication(medId);
        if (onDataUpdated) onDataUpdated();
      } catch (err) {
        console.error('Failed to update medication:', err);
      }
    }
  };

  const handleSaveVitals = async (e) => {
    if (e) e.preventDefault();
    setVitalsError('');

    const payload = {};
    if (patient?.patient_id) payload.patient_id = patient.patient_id;

    if (formHeartRate) {
      const hr = parseInt(formHeartRate, 10);
      if (isNaN(hr) || hr < 30 || hr > 240) {
        setVitalsError('Please enter a realistic pulse (30-240 bpm).');
        return;
      }
      payload.heart_rate = hr;
    }

    if (formBpSys || formBpDia) {
      const sys = parseInt(formBpSys, 10);
      const dia = parseInt(formBpDia, 10);
      if (isNaN(sys) || isNaN(dia) || sys < 50 || sys > 260 || dia < 30 || dia > 160) {
        setVitalsError('Please enter valid systolic and diastolic blood pressure values.');
        return;
      }
      payload.bp_systolic = sys;
      payload.bp_diastolic = dia;
    }

    if (formSpo2) {
      const sp = parseInt(formSpo2, 10);
      if (isNaN(sp) || sp < 50 || sp > 100) {
        setVitalsError('Oxygen saturation (SpO2) must be between 50% and 100%.');
        return;
      }
      payload.spo2 = sp;
    }

    if (formTemp) {
      const t = parseFloat(formTemp);
      if (isNaN(t) || t < 90 || t > 110) {
        setVitalsError('Body temperature must be between 90°F and 110°F.');
        return;
      }
      payload.temperature = t;
    }

    if (formGlucose) {
      const g = parseInt(formGlucose, 10);
      if (isNaN(g) || g < 20 || g > 600) {
        setVitalsError('Blood glucose must be between 20 and 600 mg/dL.');
        return;
      }
      payload.glucose = g;
    }

    if (Object.keys(payload).length <= (payload.patient_id ? 1 : 0)) {
      setVitalsError('Please fill in at least one vital sign reading.');
      return;
    }

    setSavingVitals(true);
    try {
      await api.recordVitals(payload);
      setShowVitalsModal(false);
      setFormBpSys('');
      setFormBpDia('');
      setFormHeartRate('');
      setFormSpo2('');
      setFormTemp('');
      setFormGlucose('');
      if (onDataUpdated) onDataUpdated();
      loadVitalsHistory();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      setVitalsError(err.message || 'Failed to record vitals.');
    } finally {
      setSavingVitals(false);
    }
  };

  const handlePrint = () => {
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
    setTimeout(() => window.print(), 350);
  };

  // Helper to parse BP display
  const getBpDisplay = () => {
    if (vitals?.bp_systolic && vitals?.bp_diastolic) {
      return `${vitals.bp_systolic}/${vitals.bp_diastolic}`;
    }
    if (vitals?.blood_pressure) {
      return vitals.blood_pressure;
    }
    return null;
  };

  const hasAnyVitals = Boolean(
    vitals && (vitals.heart_rate || vitals.bp_systolic || vitals.blood_pressure || vitals.spo2 || vitals.temperature)
  );

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
              <p className="text-[11px] text-cyan-100">✓ Real Electronic Health Record</p>
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
                {patient?.name ? patient.name[0] : 'P'}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#052e0a]">
                  {patient?.name || 'Patient'}
                </h2>
                <p className="text-xs text-gray-600 font-medium">
                  ID: <strong className="text-gray-900">{patient?.patient_id || 'EHR Profile'}</strong>
                  {(patient?.gender || patient?.age) ? ` • ${patient.gender ? patient.gender + ', ' : ''}${patient.age ? patient.age + ' years old' : ''}` : ''}
                </p>
                <p className="text-[11px] text-gray-500">
                  Doctor: <strong className="text-gray-800">{patient?.primary_doctor || (patient?.has_scanned_documents ? 'Not specified' : 'Scan document to extract')}</strong>
                  {patient?.hospital_name ? ` (${patient.hospital_name})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge variant="success" className="px-3.5 py-1 text-sm bg-[#297006] text-white">
                  Blood Group: {patient?.blood_group || 'Unrecorded'}
                </Badge>
                <p className="text-[11px] text-gray-500 mt-1">
                  Emergency: {patient?.emergency_contact || patient?.phone || 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Known Allergies Alert Banner & Measurement trigger */}
          <div className="pt-3 flex flex-wrap items-center justify-between text-xs gap-2">
            {patient?.allergies && patient.allergies.length > 0 ? (
              <div className="flex items-center gap-2 text-rose-900 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Known Drug Allergy:</span>
                <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-md font-black">
                  {patient.allergies.join(', ')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-900 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No known drug allergies reported</span>
              </div>
            )}
            <Button
              onClick={() => setShowVitalsModal(true)}
              variant="outline"
              size="sm"
              icon={Plus}
              className="bg-emerald-100 hover:bg-emerald-200 text-[#052e0a] border-emerald-300 font-black cursor-pointer"
            >
              Record New Reading
            </Button>
          </div>
        </Card>

        {/* Live Vitals Grid with Real Data */}
        <Card className="p-5 sm:p-6 shadow-md border-2 border-emerald-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#297006]" />
              <h3 className="font-extrabold text-base text-[#052e0a]">Your Body Vitals Right Now</h3>
            </div>
            {hasAnyVitals ? (
              <Badge variant="success">● Recorded Vitals</Badge>
            ) : (
              <Badge variant="warning">Awaiting First Reading</Badge>
            )}
          </div>

          {hasAnyVitals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Heart Rate */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 block">Pulse (Heart Rate)</span>
                  <span className="text-2xl font-black text-[#052e0a]">
                    {vitals?.heart_rate ? (
                      <>{vitals.heart_rate} <small className="font-normal text-xs text-gray-500">bpm</small></>
                    ) : (
                      <span className="text-gray-400 font-medium">—</span>
                    )}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    {vitals?.heart_rate ? '✓ Normal (60–100 bpm)' : 'Not recorded'}
                  </span>
                </div>
                <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20 shrink-0" />
              </div>

              {/* Blood Pressure */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 block">Blood Pressure</span>
                  <span className="text-2xl font-black text-[#052e0a]">
                    {getBpDisplay() || <span className="text-gray-400 font-medium">—</span>}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    {getBpDisplay() ? '✓ Target ~120/80' : 'Not recorded'}
                  </span>
                </div>
                <Activity className="w-8 h-8 text-blue-600 shrink-0" />
              </div>

              {/* Oxygen SpO2 */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 block">Oxygen (SpO2)</span>
                  <span className="text-2xl font-black text-[#052e0a]">
                    {vitals?.spo2 ? `${vitals.spo2}%` : <span className="text-gray-400 font-medium">—</span>}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    {vitals?.spo2 ? '✓ Target 95–100%' : 'Not recorded'}
                  </span>
                </div>
                <Droplet className="w-8 h-8 text-teal-600 shrink-0" />
              </div>

              {/* Temperature */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 block">Body Temperature</span>
                  <span className="text-2xl font-black text-[#052e0a]">
                    {vitals?.temperature ? `${vitals.temperature}°F` : <span className="text-gray-400 font-medium">—</span>}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    {vitals?.temperature ? '✓ Body Temperature' : 'Not recorded'}
                  </span>
                </div>
                <Thermometer className="w-8 h-8 text-amber-600 shrink-0" />
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-black text-slate-800">No Vital Readings Recorded Yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Record your pulse, blood pressure, or temperature manually, or scan a clinical prescription slip.
              </p>
              <Button
                onClick={() => setShowVitalsModal(true)}
                variant="primary"
                size="sm"
                icon={Plus}
                className="mt-2 bg-emerald-700 hover:bg-emerald-800"
              >
                Record First Reading
              </Button>
            </div>
          )}

          {/* Vitals Trend Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>Historical Vitals Trend</span>
              </span>
            </div>

            {vitalsHistory && vitalsHistory.length >= 2 ? (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Showing last {vitalsHistory.length} readings</span>
                  <span className="text-emerald-800 font-bold">Latest: {new Date(vitalsHistory[0]?.recorded_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {vitalsHistory.slice(0, 4).map((r, i) => (
                    <div key={i} className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <p className="font-extrabold text-slate-900 mt-0.5">
                        {r.heart_rate ? `${r.heart_rate} bpm` : (r.bp_systolic ? `${r.bp_systolic}/${r.bp_diastolic}` : 'Recorded')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl text-center text-xs text-slate-500 font-medium">
                Not enough readings for a trend yet. Log at least two readings to view comparative trends.
              </div>
            )}
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
                  <p className="text-[11px] text-gray-500">Tap a medicine to mark as taken today</p>
                </div>
              </div>
              <Link to="/scanner" className="text-xs font-bold text-[#297006] hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Scan New Slip
              </Link>
            </div>

            {medications && medications.length > 0 ? (
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
                      {m.taken_today ? '✓ Taken Today' : (m.timing || 'Mark Taken')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200">
                <Pill className="w-8 h-8 text-emerald-600/70 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-bold text-[#052e0a]">No Active Medications Documented</p>
                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                  Scan a prescription slip or clinical discharge summary to digitize your medication schedules automatically.
                </p>
                <Link
                  to="/scanner"
                  className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-[#297006] hover:bg-[#1f5704] text-white text-xs font-bold transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Scan Prescription Slip
                </Link>
              </div>
            )}
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

            {Array.isArray(documents) && documents.length > 0 ? (
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
                        <h4 className="font-black text-sm text-gray-900 truncate">{d.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {d.doc_type} • {d.doctor || 'Physician'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-[10px] uppercase font-mono shrink-0">
                      Verified
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
                <FileText className="w-8 h-8 text-blue-500/70 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-bold text-[#052e0a]">No Past Documents Scanned</p>
                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                  Keep all your doctor slips and test reports digitized and safely organized in one place.
                </p>
                <Link
                  to="/scanner"
                  className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-[#3f51b5] hover:bg-[#303f9f] text-white text-xs font-bold transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Scan Document
                </Link>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* RECORD NEW VITALS READING MODAL */}
      {showVitalsModal && (
        <Modal
          isOpen={showVitalsModal}
          onClose={() => setShowVitalsModal(false)}
          title="Record New Vitals Reading"
          subtitle="Manually enter your observed clinical vital signs"
          icon={Activity}
        >
          <form onSubmit={handleSaveVitals} className="space-y-4 text-xs text-slate-800">
            {vitalsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{vitalsError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={formBpSys}
                  onChange={(e) => setFormBpSys(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={formBpDia}
                  onChange={(e) => setFormBpDia(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Heart Rate / Pulse (bpm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 72"
                  value={formHeartRate}
                  onChange={(e) => setFormHeartRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Oxygen SpO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 98"
                  value={formSpo2}
                  onChange={(e) => setFormSpo2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Body Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 98.6"
                  value={formTemp}
                  onChange={(e) => setFormTemp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Blood Glucose (mg/dL)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 95"
                  value={formGlucose}
                  onChange={(e) => setFormGlucose(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVitalsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingVitals}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center gap-2 disabled:opacity-70"
              >
                {savingVitals ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{savingVitals ? 'Saving...' : 'Save Reading'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAIL MODAL FOR SELECTED DOCUMENT */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          subtitle={`${selectedDoc.doc_type} • ${selectedDoc.doctor || 'Doctor'}`}
          icon={FileText}
        >
          <div className="space-y-3.5 text-xs text-gray-900">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Doctor</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedDoc.doctor || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hospital / Clinic</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedDoc.facility || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">Clinical Findings & Diagnosis:</span>
              <p className="p-3.5 bg-emerald-50 text-[#052e0a] rounded-2xl border border-emerald-200 font-medium leading-relaxed">
                {selectedDoc.diagnosis || 'Clinical consultation recorded.'}
              </p>
            </div>

            {selectedDoc.extracted_text && (
              <details className="bg-gray-50 p-3 rounded-2xl border border-gray-200 cursor-pointer">
                <summary className="font-bold text-gray-700 text-xs select-none">
                  📄 View Full OCR Transcript
                </summary>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed mt-2 max-h-40 overflow-y-auto">
                  {selectedDoc.extracted_text}
                </pre>
              </details>
            )}

            <div className="pt-2">
              <Button
                to="/agent"
                variant="primary"
                size="md"
                fullWidth
                icon={Sparkles}
              >
                Ask Assistant About this Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
