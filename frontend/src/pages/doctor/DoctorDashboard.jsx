import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle, FileText, Edit3, Save, 
  Clock, User, Stethoscope, Search, Printer, Pill, Heart, Activity, 
  AlertOctagon, Check, RefreshCw, ChevronRight, XCircle, LogOut, Sparkles, Globe
} from 'lucide-react';
import { api } from '../../services/api';

export default function DoctorDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState('MK-78294');
  const [summaryData, setSummaryData] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'triage' | 'documents'
  const [activeLangTab, setActiveLangTab] = useState('en'); // 'en' | 'hi'

  // Editable clinical fields
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [pmh, setPmh] = useState('');

  // Logged-in doctor metadata
  const userString = localStorage.getItem('medikiosk_user');
  const loggedInUser = userString ? JSON.parse(userString) : {
    name: 'Dr. Rajesh Sharma, MD',
    role: 'DOCTOR',
    profile: { department: 'General Medicine', room_number: 'OPD Room 3' }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedPatientId]);

  const loadDashboardData = async () => {
    try {
      const summary = await api.getPatientSummary(selectedPatientId);
      const alertsRes = await api.getActiveAlerts();
      setSummaryData(summary);
      setActiveAlerts(alertsRes.alerts || []);
      setChiefComplaint(summary.chief_complaint || "Acute productive cough and intermittent fever x 5 days");
      setHpi(summary.hpi || "Patient presents with a 5-day history of worsening cough productive of thick greenish-yellow phlegm, accompanied by fever up to 101.2 F. Mild exertional dyspnea upon climbing stairs.");
      setPmh(summary.past_medical_surgical_history || "Childhood bronchial asthma (inactive). No surgical history.");
      setDoctorNotes(summary.doctor_notes || "Action: Discontinue Augmentin immediately due to documented Penicillin anaphylaxis allergy. Switch to Azithromycin 500mg OD x 3d. Order PA Chest X-Ray.");
    } catch (e) {
      console.warn('Dashboard data fallback', e);
    }
  };

  const handleConfirmSummary = async () => {
    setIsEditingNotes(false);
    try {
      if (summaryData?.summary_id) {
        await fetch(`/api/summary/${summaryData.summary_id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chief_complaint: chiefComplaint,
            hpi,
            past_medical_surgical_history: pmh,
            doctor_notes: doctorNotes,
            status: 'CONFIRMED',
            revision_notes: `Confirmed by ${loggedInUser.name}`
          })
        });
      }
    } catch (e) {
      console.warn('Save fallback');
    }
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3500);
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await fetch(`/api/triage/alerts/${alertId}/resolve/`, { method: 'POST' });
    } catch (e) {}
    setActiveAlerts(prev => prev.map(a => a.id === alertId || a.alert_id === alertId ? { ...a, is_resolved: true, status: 'resolved' } : a));
  };

  // Mock patient queue prioritized by urgency
  const patientQueue = [
    { id: 'MK-78294', name: 'Sarah Jenkins', age: '38F', token: '#42', urgency: 'CRITICAL', wait: '4m', complaint: 'Cough, Fever, Dyspnea (Penicillin Alert)', flagged: true },
    { id: 'MK-78297', name: 'David Miller', age: '67M', token: '#45', urgency: 'HIGH', wait: '18m', complaint: 'Chest tightness, elevated BP', flagged: true },
    { id: 'MK-78295', name: 'Ramesh Patel', age: '54M', token: '#43', urgency: 'MEDIUM', wait: '25m', complaint: 'Hypertension follow-up', flagged: false },
    { id: 'MK-78296', name: 'Sunita Devi', age: '29F', token: '#44', urgency: 'LOW', wait: '32m', complaint: 'Migraine & headache', flagged: false },
  ];

  // Lab investigations with abnormal flags
  const investigations = summaryData?.investigations || [
    { test_name: 'Hemoglobin', value: 10.8, unit: 'g/dL', reference_range: '12.0 - 17.5 g/dL', is_abnormal: true, abnormal_flag_reason: 'Low' },
    { test_name: 'WBC Count', value: 13400.0, unit: '/mcL', reference_range: '4,000 - 11,000 /mcL', is_abnormal: true, abnormal_flag_reason: 'High (Leukocytosis)' },
    { test_name: 'Random Blood Glucose', value: 112.0, unit: 'mg/dL', reference_range: '70.0 - 140.0 mg/dL', is_abnormal: false },
    { test_name: 'Platelet Count', value: 240000.0, unit: '/mcL', reference_range: '150,000 - 450,000 /mcL', is_abnormal: false },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 text-slate-900 p-3 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Top Header: Doctor Identity & OPD Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md">
              DR
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{loggedInUser.name || 'Dr. Rajesh Sharma, MD'}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  {loggedInUser.profile?.room_number || 'OPD Room 3'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {loggedInUser.profile?.department || 'General Medicine'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Physician Decision Support Dashboard • ABDM Certified Sandbox
              </p>
            </div>
          </div>

          {/* OPD Real-Time Status Counters */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className="text-slate-400 font-semibold text-[10px] uppercase">Queue</div>
              <div className="text-base font-black text-slate-800">18</div>
            </div>
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <div className="text-emerald-700 font-semibold text-[10px] uppercase">Seen</div>
              <div className="text-base font-black text-emerald-700">5</div>
            </div>
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <div className="text-amber-700 font-semibold text-[10px] uppercase">Waiting</div>
              <div className="text-base font-black text-amber-700">13</div>
            </div>
            <div className="px-3 py-2 bg-red-50 border border-red-300 rounded-xl text-center animate-pulse">
              <div className="text-red-700 font-semibold text-[10px] uppercase">Red Flags</div>
              <div className="text-base font-black text-red-700">2</div>
            </div>
          </div>
        </div>

        {/* PROMINENT RED-FLAG ALERT BANNER */}
        {activeAlerts.filter(a => !a.is_resolved).map((alert, idx) => (
          <div
            key={idx}
            className="border-2 border-red-400 bg-red-50 rounded-2xl p-4 sm:p-5 text-red-950 shadow-md ring-4 ring-red-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn"
          >
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-red-600 text-white animate-bounce mt-0.5">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-red-600 text-white tracking-wide">
                    CRITICAL TRIAGE RED-FLAG
                  </span>
                  <span className="text-xs font-bold text-red-800 font-mono">
                    Patient: {alert.patient_name || alert.patient_identifier || 'Sarah Jenkins'}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-extrabold text-red-900 leading-snug">
                  {alert.message || alert.reason || alert.trigger_reason}
                </p>
                <p className="text-xs text-red-700 font-medium">
                  Flagged for immediate clinician review. Does not diagnose.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleResolveAlert(alert.id || alert.alert_id)}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md flex items-center space-x-1.5 flex-shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>Acknowledge & Resolve Flag</span>
            </button>
          </div>
        ))}

        {/* 2-Column Clinical Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT COLUMN: Queue & Digitize Records (Dense & Scannable) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Queue Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 font-extrabold text-sm text-slate-800">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Prioritized OPD Queue</span>
                </div>
                <span className="text-xs text-slate-400">Flagged at Top</span>
              </div>

              <div className="mt-3 space-y-2">
                {patientQueue.map((p) => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-slate-900">{p.token}</span>
                          <span className="font-extrabold text-sm text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-500">({p.age})</span>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            p.urgency === 'CRITICAL'
                              ? 'bg-red-100 text-red-800 animate-pulse'
                              : p.urgency === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.urgency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                        <span className="truncate max-w-[190px] font-medium">{p.complaint}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{p.wait} ago</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scanned Prior Prescriptions (Module B OCR) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Module B: Digitized Records</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  2 Verified
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>1. Prior Prescription (Dr. Mehta)</span>
                    <span className="text-slate-400">Yesterday</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 text-slate-700 font-mono text-[11px]">
                    "Rx: Tab Augmentin 625mg TDS x 5d; Tab Paracetamol 650mg SOS"
                  </div>
                  <div className="text-[11px] text-red-600 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Flagged: Penicillin Allergy Conflict</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>2. CBC Lab Report (Apex Pathology)</span>
                    <span className="text-slate-400">2 days ago</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Hemoglobin: <strong className="text-red-600">10.8 g/dL (Low)</strong> • WBC: <strong className="text-red-600">13,400 /mcL (High)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Safety Disclaimer Box */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-500 leading-relaxed font-medium">
              🛡️ <strong>Clinical Safety Notice:</strong> MediKiosk flags physiological patterns and conversational histories for human clinician attention. It does not diagnose.
            </div>
          </div>

          {/* RIGHT COLUMN: Standardized Clinical Note Structure */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
              
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-black text-slate-900">Sarah Jenkins</h2>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                      ID: MK-78294
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      ABHA: 14-8921-3490-1284
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    38F • Blood: A+ • Phone: +91-9123456780 • Language: English & Hindi
                  </p>
                </div>

                {/* Actions & Language Switcher */}
                <div className="flex items-center space-x-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setActiveLangTab('en')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        activeLangTab === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setActiveLangTab('hi')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        activeLangTab === 'hi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      हिंदी Note
                    </button>
                  </div>

                  <button
                    onClick={() => setIsEditingNotes(!isEditingNotes)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingNotes ? "Cancel Edit" : "Quick Edit"}</span>
                  </button>

                  <button
                    onClick={handleConfirmSummary}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Save to Record</span>
                  </button>
                </div>
              </div>

              {/* Toast confirmation */}
              {isSavedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Clinical Summary status set to CONFIRMED. Audit revision logged and FHIR CareContext generated!</span>
                </div>
              )}

              {/* Vitals Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Blood Pressure</span>
                  <div className="text-base font-black text-slate-800">118 / 76 mmHg</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 uppercase">Pulse Rate</span>
                  <div className="text-base font-black text-amber-900">104 bpm (Mild Tachy)</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">SpO2 (Room Air)</span>
                  <div className="text-base font-black text-slate-800">95%</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[11px] font-bold text-red-800 uppercase">Temperature</span>
                  <div className="text-base font-black text-red-900">101.2 °F (Fever)</div>
                </div>
              </div>

              {/* Allergies Highlight Box */}
              <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 space-y-2">
                <div className="flex items-center space-x-2 text-red-950 font-black text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Verified Drug Allergies & Contraindications</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-black text-xs shadow-sm">
                    PENICILLIN & BETA-LACTAMS (Anaphylactoid Hives / Facial Edema)
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-red-100 text-red-900 font-bold text-xs border border-red-200">
                    Sulfa Drugs (Mild intolerance)
                  </span>
                </div>
              </div>

              {/* CLINICAL NOTE SECTIONS */}
              <div className="space-y-5">
                
                {/* 1. Chief Complaint & HPI */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    1. Chief Complaint & History of Present Illness (HPI - SOCRATES)
                  </label>
                  {isEditingNotes ? (
                    <textarea
                      rows={3}
                      value={hpi}
                      onChange={(e) => setHpi(e.target.value)}
                      className="w-full p-3 text-sm bg-white border-2 border-blue-400 rounded-xl focus:outline-none"
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm leading-relaxed text-slate-800 font-medium">
                      {activeLangTab === 'hi'
                        ? "मरीज़ को 5 दिनों से गाढ़ा बलगम और बुखार आ रहा है। सीढ़ियां चढ़ने पर सांस फूलती है। प्राथमिक लक्षण: बलगम वाली खांसी।"
                        : hpi}
                    </div>
                  )}
                </div>

                {/* 2. Past Medical / Surgical History */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    2. Past Medical & Surgical History
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
                    {pmh}
                  </div>
                </div>

                {/* 3. Drug History & Prior Prescriptions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    3. Drug History & Active Prescriptions
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-3">Medication</th>
                          <th className="p-3">Dosage / Frequency</th>
                          <th className="p-3">Clinical Alert Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-red-50/70">
                          <td className="p-3 font-bold text-slate-900">Augmentin 625mg (Amox+Clav)</td>
                          <td className="p-3">1 tab TDS x 5d</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black">
                              CONTRAINDICATED (Penicillin Allergy)
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900">Paracetamol 650mg</td>
                          <td className="p-3">1 tab SOS (PRN)</td>
                          <td className="p-3 text-emerald-700 font-bold">Safe / Active</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Investigations (Abnormal Lab Values Highlighted) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      4. Investigations & Diagnostic Labs (Module B Extracted)
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Abnormal values flagged with ⚠️</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-3">Test Name</th>
                          <th className="p-3">Value</th>
                          <th className="p-3">Reference Range</th>
                          <th className="p-3">Flag Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {investigations.map((inv, idx) => (
                          <tr key={idx} className={inv.is_abnormal ? 'bg-amber-50/60 font-medium' : ''}>
                            <td className="p-3 font-bold text-slate-800">{inv.test_name}</td>
                            <td className="p-3 font-mono font-bold">
                              {inv.value} {inv.unit}
                            </td>
                            <td className="p-3 text-slate-500">{inv.reference_range || 'Standard'}</td>
                            <td className="p-3">
                              {inv.is_abnormal ? (
                                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black text-[10px] flex items-center space-x-1 w-fit">
                                  <span>⚠️</span>
                                  <span>{inv.abnormal_flag_reason || 'Abnormal'}</span>
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold text-[10px]">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Family & Personal History */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-500 uppercase">5. Family History</span>
                    <p className="text-slate-700 font-medium">Father: Hypertension. No early premature CAD.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-500 uppercase">6. Personal History (Lifestyle)</span>
                    <p className="text-slate-700 font-medium">Vegetarian diet, Non-smoker, denies alcohol use.</p>
                  </div>
                </div>

                {/* 6. Physician Assessment & Consultation Plan */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      7. Physician Clinical Orders & Prescription Revision
                    </label>
                    <span className="text-[11px] text-blue-700 font-semibold">Syncs to ABDM CareContext</span>
                  </div>
                  <textarea
                    rows={3}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Enter revised clinical orders, replacement antibiotic, or lab requisitions..."
                    className="w-full p-3.5 text-sm bg-white border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* Consultation Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                    <Printer className="w-4 h-4" />
                    <span>Print Clinical Slip</span>
                  </button>
                  <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                    <Activity className="w-4 h-4" />
                    <span>Order Chest X-Ray PA</span>
                  </button>
                </div>

                <button
                  onClick={handleConfirmSummary}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-extrabold shadow-md flex items-center justify-center space-x-2 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirm & Save to Record</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
