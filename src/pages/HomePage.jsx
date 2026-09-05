import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Activity, Bot, FileText, ArrowRight, ShieldCheck,
  Heart, Sparkles, AlertTriangle, Pill, CheckCircle2, ChevronRight,
  Droplet, Thermometer, Smile, HeartPulse, HelpCircle, Shield
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function HomePage({ patient, vitals, medications = [], documents = [] }) {
  const [selectedMood, setSelectedMood] = useState(null);

  // Dynamic time-based friendly greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const features = [
    {
      title: "Scan Prescription or Slip",
      description: "Hold your doctor's slip or lab report under the camera. The kiosk reads it clearly in seconds.",
      icon: Camera,
      to: "/scanner",
      tag: "1-Tap Camera Scan",
      gradient: "from-emerald-600 to-teal-700",
      bgSoft: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-600 text-white",
      actionText: "Scan My Paper"
    },
    {
      title: "My Health & Vitals",
      description: "See your heart rate, blood pressure, oxygen, and daily medicines explained in plain, comforting words.",
      icon: Activity,
      to: "/summary",
      tag: "Heart & Numbers",
      gradient: "from-teal-600 to-emerald-800",
      bgSoft: "bg-teal-50 text-teal-800 border-teal-200",
      iconBg: "bg-teal-700 text-white",
      actionText: "View My Health"
    },
    {
      title: "Ask Health Assistant",
      description: "Have questions about pills or symptoms? Talk naturally with our voice-enabled friendly assistant.",
      icon: Bot,
      to: "/agent",
      tag: "Voice & Chat",
      gradient: "from-emerald-700 to-green-900",
      bgSoft: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-800 text-white",
      actionText: "Talk to Assistant"
    },
    {
      title: "Past Medical Records",
      description: "Browse previous doctor prescriptions, blood tests, and scans safely kept in your personal record.",
      icon: FileText,
      to: "/records",
      tag: "Private & Safe",
      gradient: "from-teal-700 to-cyan-800",
      bgSoft: "bg-cyan-50 text-cyan-800 border-cyan-200",
      iconBg: "bg-teal-800 text-white",
      actionText: "Browse Records"
    }
  ];

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

      {/* Reassuring Top Calming Notification Ribbon */}
      <div className="w-full bg-[#184a32]/95 backdrop-blur-md text-emerald-100 text-xs py-2 px-4 border-b border-emerald-800/40 flex items-center justify-center gap-2 shadow-xs text-center">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="font-medium tracking-wide">
          🌿 You are in a safe, quiet health space. Take your time — no rush.
        </span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">

        {/* Hero Section: Welcoming & Stress-Relieving */}
        <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_10px_35px_rgba(18,56,38,0.06)] border border-emerald-900/10 flex flex-col lg:flex-row items-center justify-between gap-8 transition-all">

          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f2e1f] tracking-tight leading-[1.15]">
              {getGreeting()}, <span className="text-emerald-800">{patient?.name?.split(' ')[0] || 'Sarah'}</span>.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Scan your medical papers, see your health vitals explained in plain English, and ask any questions using your voice or keyboard.
            </p>

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

            {/* "How are you feeling?" Stress-Relief Comfort Check */}
            <div className="pt-2 border-t border-emerald-900/10 text-left">
              <span className="text-xs font-bold text-slate-600 block mb-2 text-center lg:text-left">
                💭 How are you feeling today?
              </span>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                {[
                  { id: 'calm', emoji: '😌', label: 'Feeling Relaxed' },
                  { id: 'check', emoji: '📋', label: 'Just Checking Records' },
                  { id: 'symptoms', emoji: '🩺', label: 'Have Mild Symptoms' },
                  { id: 'nurse', emoji: '🆘', label: 'Need Nurse Help' }
                ].map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${selectedMood === mood.id
                        ? 'bg-[#184a32] text-white border-[#184a32] shadow-xs'
                        : 'bg-emerald-50/70 hover:bg-emerald-100 text-[#143d2b] border-emerald-200'
                      }`}
                  >
                    <span>{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </button>
                ))}
              </div>

              {selectedMood && (
                <div className="mt-2.5 p-3 rounded-2xl bg-emerald-100/70 border border-emerald-300 text-xs text-[#0f2e1f] font-medium flex items-center justify-between gap-3 animate-fade-in">
                  <span>{moodResponses[selectedMood].text}</span>
                  {moodResponses[selectedMood].highlight && (
                    <Link
                      to={moodResponses[selectedMood].highlight}
                      className="px-3 py-1 rounded-xl bg-[#184a32] text-white font-bold shrink-0 hover:bg-[#123826] transition"
                    >
                      Go Now →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Patient Identity & Live Health Snapshot Card */}
          <div className="w-full lg:w-92 bg-gradient-to-br from-emerald-50/90 to-teal-50/80 border border-emerald-900/15 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 shrink-0">

            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#184a32] text-white font-black text-lg flex items-center justify-center shadow-xs">
                  {patient?.name?.[0] || 'S'}
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-[#0f2e1f]">{patient?.name || 'Sarah Jenkins'}</h4>
                  <p className="text-xs text-slate-500 font-mono">ID: {patient?.patient_id || 'MK-78294'}</p>
                </div>
              </div>
              <Badge variant="success" className="px-3 py-1 bg-[#184a32] text-white border-none shadow-xs">
                {patient?.blood_group || 'A+'}
              </Badge>
            </div>

            {/* Documented Allergy Box */}
            <div className="flex items-center gap-2.5 text-xs text-amber-900 bg-amber-50/90 border border-amber-200/90 p-2.5 rounded-2xl font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Known Allergy: <strong className="font-black">{patient?.allergies?.join(', ') || 'Penicillin'}</strong></span>
            </div>

            {/* Live Vitals Mini-Grid with Comfort Indicators */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                  <span>Pulse (Heart)</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                  {vitals?.heart_rate || 74} <small className="text-[10px] font-normal text-slate-500">bpm</small>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  ● Normal (60–100)
                </span>
              </div>

              <div className="bg-white/90 p-3 rounded-2xl border border-emerald-900/10 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 font-bold mb-1">
                  <span>Blood Pressure</span>
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <span className="font-black text-lg text-[#0f2e1f] block leading-tight">
                  {vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  ● Healthy Range
                </span>
              </div>
            </div>

            <Button
              to="/summary"
              variant="outline"
              size="sm"
              fullWidth
              icon={HeartPulse}
              className="bg-white hover:bg-emerald-50 text-[#184a32] border-emerald-900/15"
            >
              See Full Health Details
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
              {documents.slice(0, 3).map((d) => (
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
    </div>
  );
}
