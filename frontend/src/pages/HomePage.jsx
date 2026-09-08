import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Activity, Bot, FileText, ArrowRight, ShieldCheck,
  Heart, Sparkles, AlertTriangle, Pill, CheckCircle2, ChevronRight,
  Droplet, Thermometer, Smile, HeartPulse, HelpCircle, Shield,
  User, KeyRound, LogOut, ShieldAlert
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { features } from '../data/features';
import accountCircleIcon from '../icons/accountCircle.svg';

export function HomePage({
  patient,
  vitals,
  medications = [],
  documents = [],
  onPatientUpdated
}) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [savingAge, setSavingAge] = useState(false);
  const [ageMessage, setAgeMessage] = useState('');

  const bpDisplay = (vitals?.bp_systolic && vitals?.bp_diastolic)
    ? `${vitals.bp_systolic}/${vitals.bp_diastolic}`
    : (vitals?.blood_pressure || null);

  const hasAnyVitals = Boolean(
    vitals && (vitals.heart_rate || bpDisplay || vitals.spo2 || vitals.temperature || vitals.glucose)
  );
  const hasHealthData = Boolean(patient?.has_scanned_documents || hasAnyVitals);

  const handleSaveAge = async (e) => {
    if (e) e.preventDefault();
    const parsed = parseInt(editAge, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 125) {
      setAgeMessage('Please enter a valid age (1-120)');
      return;
    }
    setSavingAge(true);
    setAgeMessage('');
    try {
      await api.updatePatientProfile({
        patient_id: patient?.patient_id,
        age: parsed
      });

      try {
        const stored = localStorage.getItem('medikiosk_user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u.patient_profile) u.patient_profile.age = parsed;
          if (u.profile) u.profile.age = parsed;
          localStorage.setItem('medikiosk_user', JSON.stringify(u));
        }
      } catch (err) {}

      if (onPatientUpdated) {
        onPatientUpdated({
          ...(patient || {}),
          age: parsed
        });
      }
      setAgeMessage('Age updated successfully!');
      setTimeout(() => setAgeMessage(''), 3000);
    } catch (err) {
      setAgeMessage(err.message || 'Failed to update age');
    } finally {
      setSavingAge(false);
    }
  };

  // Dynamic time-based friendly greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };



  const moodResponses = {
    calm: {
      text: "Wonderful! We're glad you are feeling peaceful. Take your time reviewing your records.",
      highlight: null
    },
    check: {
      text: "All your latest doctor slips and test results are ready below. Tap 'View My Health' to begin.",
      highlight: "/summary"
    },
    symptoms: {
      text: "You can talk to our voice assistant or review your vitals to see how your body is doing today.",
      highlight: "/agent"
    },
    nurse: {
      text: "Help is always here. Tap the amber 'Need Help?' button at the top header to notify the nurse station.",
      highlight: "help"
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center bg-gradient-to-b from-[#f2f8f4] via-[#e8f4ed] to-[#ddead4] text-slate-800 select-none font-sans min-h-[calc(100vh-4rem)] overflow-hidden">

      {/* Ambient Soothing Organic Glow Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-emerald-200/35 blur-3xl pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-48 right-10 w-96 h-96 rounded-full bg-teal-200/25 blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-green-200/20 blur-3xl pointer-events-none -z-10"></div>

      {/* Top Header Bar with Calming Space Banner & User Account Icon on the Top Right */}
      <header className="w-full bg-[#184a32]/95 backdrop-blur-md text-emerald-100 py-2.5 px-4 sm:px-6 lg:px-8 border-b border-emerald-800/40 shadow-xs z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

          {/* Left: Reassuring Safe Health Space Ribbon */}
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="hidden sm:inline">🌿 You are in a safe, quiet health space. Take your time — no rush.</span>
            <span className="inline sm:hidden font-bold">🌿 MediKiosk Portal</span>
          </div>

          {/* Right: User Account Profile */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-2 sm:gap-2.5 py-1 px-2.5 sm:py-1.5 sm:px-3.5 rounded-full bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400/40 text-white transition-all duration-200 shadow-sm cursor-pointer group hover:scale-[1.03] active:scale-95 shrink-0"
              title="My Health Account"
              aria-label="User Account Profile"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 text-[#0f2e1f] font-black text-xs sm:text-sm flex items-center justify-center shadow-xs group-hover:ring-2 group-hover:ring-emerald-300 overflow-hidden">
                <img src={accountCircleIcon} alt="Account" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
              </div>
              <div className="text-left hidden xs:block">
                <div className="text-xs font-black text-white flex items-center gap-1.5 leading-tight">
                  <span>{patient?.name && patient.name !== 'Guest Patient' ? patient.name : 'Sign In'}</span>
                  {patient?.blood_group && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-700/80 text-emerald-200 rounded-md font-mono">
                      {patient.blood_group}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-300/80 font-mono mt-0.5">
                  {patient?.mock_aadhaar_id ? `Aadhaar: •••• ${patient.mock_aadhaar_id.slice(-4)}` : (patient?.patient_id && patient.patient_id !== 'Patient' ? `ID: ${patient.patient_id}` : 'Patient Portal')}
                </div>
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">

        {/* Hero Section: Welcoming & Stress-Relieving */}
        <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_10px_35px_rgba(18,56,38,0.06)] border border-emerald-900/10 flex flex-col lg:flex-column items-center justify-between gap-8 transition-all">

          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f2e1f] tracking-tight leading-[1.15]">
              {getGreeting()}, <span className="text-emerald-800">{patient?.name && patient.name !== 'Guest Patient' ? patient.name.split(' ')[0] : 'Patient'}</span>.
            </h1>

            {/* <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Scan your medical papers, see your health vitals explained in plain English, and ask any questions using your voice or keyboard.
            </p> */}

            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Button
                to="/scanner"
                variant="primary"
                size="lg"
                icon={Camera}
                iconPosition="left"
                className="w-full sm:w-auto bg-[#184a32] hover:bg-[#123826]"
              >
                Scan Doctor Slip
              </Button>
              <Button
                to="/agent"
                variant="outline"
                size="lg"
                icon={Bot}
                iconPosition="left"
                className="w-full sm:w-auto border-[#184a32]/30 text-[#143d2b]"
              >
                Talk with Health Assistant
              </Button>
            </div>

            
          </div>

          {/* Quick Patient Identity & Live Health Snapshot Card */}
          <div className="w-full lg:w-92 bg-gradient-to-br from-emerald-50/90 to-teal-50/80 border border-emerald-900/15 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 shrink-0">

            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#184a32] text-white font-black text-lg flex items-center justify-center shadow-xs">
                  {patient?.name && patient.name !== 'Guest Patient' ? patient.name[0] : 'P'}
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-[#0f2e1f]">
                    {patient?.name && patient.name !== 'Guest Patient' ? patient.name : 'New Patient'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {patient?.patient_id && patient.patient_id !== 'Patient' ? `ID: ${patient.patient_id}` : 'EHR Profile'}
                  </p>
                </div>
              </div>
              {patient?.blood_group ? (
                <Badge variant="success" className="px-3 py-1 bg-[#184a32] text-white border-none shadow-xs">
                  {patient.blood_group}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-2.5 py-1 text-slate-600 border-emerald-300 text-[10px]">
                  {patient?.has_scanned_documents ? 'Blood: —' : 'Unverified'}
                </Badge>
              )}
            </div>

            {/* Documented Allergy Box */}
            {patient?.allergies && patient.allergies.length > 0 ? (
              <div className="flex items-center gap-2.5 text-xs text-amber-900 bg-amber-50/90 border border-amber-200/90 p-2.5 rounded-2xl font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Known Allergy: <strong className="font-black">{patient.allergies.join(', ')}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-emerald-900 bg-emerald-50/90 border border-emerald-200/90 p-2.5 rounded-2xl font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{patient?.has_scanned_documents ? 'No known drug allergies reported' : 'Allergies: Scan slip to verify'}</span>
              </div>
            )}

            {/* Live Vitals Mini-Grid or Scan Prompt */}
            {hasAnyVitals ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {vitals?.heart_rate ? (
                  <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                      <span>Pulse (Heart)</span>
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                      {vitals.heart_rate} <small className="text-[10px] font-normal text-slate-500">bpm</small>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ● Normal Range
                    </span>
                  </div>
                ) : null}

                {bpDisplay ? (
                  <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                      <span>Blood Pressure</span>
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                      {bpDisplay}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ● Blood Pressure
                    </span>
                  </div>
                ) : null}

                {vitals?.spo2 ? (
                  <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                      <span>Oxygen (SpO2)</span>
                      <Droplet className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                      {vitals.spo2}%
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ● Normal (95-100%)
                    </span>
                  </div>
                ) : null}

                {vitals?.temperature ? (
                  <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                      <span>Temperature</span>
                      <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                      {vitals.temperature}°F
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ● Body Temp
                    </span>
                  </div>
                ) : null}

                {vitals?.glucose ? (
                  <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                      <span>Blood Glucose</span>
                      <Activity className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                      {vitals.glucose} <small className="text-[10px] font-normal text-slate-500">mg/dL</small>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ● Glucose
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-3 bg-emerald-100/60 rounded-2xl border border-emerald-300 text-center space-y-1">
                <HeartPulse className="w-5 h-5 text-emerald-700 mx-auto" />
                <p className="text-xs font-bold text-[#0f2e1f]">No Vitals Recorded Yet</p>
                <p className="text-[11px] text-slate-600">Record your vitals in Health Summary or scan a prescription slip.</p>
              </div>
            )}

            <Button
              to={hasHealthData ? "/summary" : "/scanner"}
              variant="outline"
              size="sm"
              fullWidth
              icon={hasHealthData ? HeartPulse : Camera}
              className="bg-white hover:bg-emerald-50 text-[#184a32] border-emerald-900/15"
            >
              {hasHealthData ? "See Full Health Details" : "Scan Medical Paper"}
            </Button>
          </div>

        </section>

        {/* 3-Step Guided Journey */}
        <section className="bg-white/80 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-emerald-100 text-emerald-900">
                Easy 3 Steps
              </Badge>
              <h2 className="text-base sm:text-lg font-black text-[#0f2e1f]">
                How to use this health station
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              No technical skills needed — designed for everyone
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-green-50/50 border border-emerald-900/10 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#184a32] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                01
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#0f2e1f]">Scan your Paper Slip</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Hold your prescription or lab paper under the scanner. It reads medicines and dosages automatically.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-green-50/50 border border-emerald-900/10 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#184a32] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                02
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#0f2e1f]">Review Plain Explanations</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Your medicines and heart numbers are presented clearly with normal ranges and daily schedules.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-green-50/50 border border-emerald-900/10 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#184a32] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                03
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#0f2e1f]">Ask with Your Voice</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tap the microphone and talk aloud in everyday language. You don't need to type quickly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Services Section: Responsive Grid on Mobiles, Tablets & Computers */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f2e1f]">
                What would you like to do?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Tap any card to open that service immediately
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-3.5 py-1.5 rounded-full border border-emerald-300/60 w-fit">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Touch-Screen Ready</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <Link
                  key={idx}
                  to={feat.to}
                  className="group bg-white/90 backdrop-blur-sm rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl border border-emerald-900/10 hover:border-[#184a32]/40 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${feat.iconBg} flex items-center justify-center font-bold shadow-xs group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${feat.bgSoft}`}>
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#184a32] transition-colors">
                      {feat.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-[#184a32]">
                    <span>{feat.actionText}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Live Patient Snapshot: Prescriptions & Recent Scans */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-8">

          {/* Active Prescriptions Snapshot */}
          <Card className="p-5 sm:p-6 shadow-sm border border-emerald-900/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#184a32] flex items-center justify-center font-bold">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#0f2e1f]">Today's Daily Medicines</h3>
                  <p className="text-[11px] text-slate-500">Prescriptions active on your record</p>
                </div>
              </div>
              <Link to="/summary" className="text-xs font-black text-[#184a32] hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {medications.slice(0, 3).map((m) => (
                <div key={m.id} className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-900/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{m.name}</span>
                    <span className="text-slate-500 text-[11px] ml-1.5">({m.dose})</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.frequency} • {m.timing}</p>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    {m.status || 'Active'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Medical Papers Snapshot */}
          <Card className="p-5 sm:p-6 shadow-sm border border-emerald-900/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#0f2e1f]">Recent Medical Papers</h3>
                  <p className="text-[11px] text-slate-500">Scanned slips & diagnostic reports</p>
                </div>
              </div>
              <Link to="/records" className="text-xs font-black text-teal-800 hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {(Array.isArray(documents) ? documents : []).slice(0, 3).map((d) => (
                <div key={d.id} className="p-3 bg-teal-50/40 rounded-2xl border border-teal-900/5 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate block">{d.title}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{d.doctor} • {d.doc_type}</p>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0">
                    ✓ Clear
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

        </section>

      </div>

      {/* USER ACCOUNT & PATIENT PROFILE MODAL */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="My Patient Account"
        subtitle="View personal health identity and account settings"
        icon={User}
      >
        <div className="space-y-4 text-xs text-gray-900">

          {/* Active Profile Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#184a32] text-white font-black text-xl flex items-center justify-center shadow-xs">
                {patient?.name && patient.name !== 'Guest Patient' ? patient.name[0] : 'P'}
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-[#0f2e1f]">
                  {patient?.name && patient.name !== 'Guest Patient' ? patient.name : 'Not Signed In'}
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  {patient?.patient_id && patient.patient_id !== 'Patient' ? `Card ID: ${patient.patient_id}` : 'Guest Profile'}
                </p>
                <p className="text-[11px] text-slate-600 font-semibold">
                  {patient?.gender ? `${patient.gender} • ` : ''}
                  {patient?.age ? `${patient.age} years old` : 'Age: Not documented'}
                </p>
              </div>
            </div>
            {patient?.blood_group ? (
              <Badge variant="success" className="px-3 py-1 text-xs">
                {patient.blood_group}
              </Badge>
            ) : null}
          </div>

          {/* Age Configuration Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-700 font-extrabold uppercase tracking-wider">Patient Age</span>
              <span className="text-xs font-bold text-emerald-800">
                {patient?.age ? `${patient.age} years old` : 'Not documented'}
              </span>
            </div>
          </div>

          {/* Clinical Chart Details */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Emergency Contact</span>
              <p className="font-bold text-gray-900 mt-0.5">{patient?.emergency_contact || patient?.phone || 'Not provided'}</p>
            </div>
          </div>
          {/* Direct Government ID & Mobile Login Link */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <Link
              to="/login"
              onClick={() => setShowAccountModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{patient?.name && patient.name !== 'Guest Patient' ? 'Switch Patient / Sign In' : 'Sign In with Aadhaar, ABHA or Mobile'}</span>
            </Link>

            {patient?.name && patient.name !== 'Guest Patient' && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('medikiosk_token');
                  localStorage.removeItem('medikiosk_refresh');
                  localStorage.removeItem('medikiosk_user');
                  setShowAccountModal(false);
                  window.location.href = '/login';
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

        </div>
      </Modal>

    </div>
  );
}
