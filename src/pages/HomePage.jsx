import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, Activity, Bot, FileText, ArrowRight, ShieldCheck, 
  Heart, Sparkles, AlertTriangle, Pill, CheckCircle2, ChevronRight, Droplet, Thermometer 
} from 'lucide-react';

export function HomePage({ patient, vitals, medications = [], documents = [] }) {
  const features = [
    {
      title: "Optical Document Scanner",
      description: "Instant optical OCR scanner for clinical prescriptions, CBC lab panels, and radiology reports with automated medication extraction.",
      icon: Camera,
      to: "/scanner",
      tag: "Live OCR Engine",
      color: "from-blue-600 to-indigo-700",
      accent: "#3f51b5"
    },
    {
      title: "Medical Summary & Vitals",
      description: "Comprehensive patient health chart with live vital metrics (Pulse, BP, SpO2, Temp), active prescription tracker, and allergy safety checks.",
      icon: Activity,
      to: "/summary",
      tag: "Real-Time Vitals",
      color: "from-emerald-600 to-green-800",
      accent: "#297006"
    },
    {
      title: "AI Clinical Health Agent",
      description: "Conversational medical triage agent with speech recognition, text-to-speech voice readouts, and intelligent drug contraindication detection.",
      icon: Bot,
      to: "/agent",
      tag: "Clinical AI Doctor",
      color: "from-amber-500 to-orange-600",
      accent: "#ff9800"
    },
    {
      title: "Diagnostic Medical Records",
      description: "Chronological medical record archive with full OCR content inspection, doctor notes, and PDF summary export.",
      icon: FileText,
      to: "/records",
      tag: "Django Database",
      color: "from-teal-600 to-cyan-700",
      accent: "#00bcd4"
    }
  ];

  return (
    <div className="w-full flex flex-col items-center bg-[#cbf5d6] select-none font-sans min-h-[calc(100vh-4rem)]">
      
      {/* Hero Welcome Banner */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#297006]/20 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="space-y-3 max-w-2xl">
            {/* MediKiosk Pill Badge */}
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#297006] border-[2px] border-[#808080] shadow-sm">
              <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
                MediKiosk
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#052e0a] tracking-tight leading-tight">
              Smart Healthcare Patient Portal
            </h1>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Welcome, <strong className="text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</strong>. Scan your medical documents, track your live vitals, review active prescriptions, and consult your dedicated AI Clinical Health Agent in real time.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/scanner"
                className="px-5 py-2.5 rounded-full bg-[#297006] hover:bg-[#205905] text-white font-bold text-sm shadow-md transition flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Document Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/agent"
                className="px-5 py-2.5 rounded-full bg-[#3f51b5] hover:bg-[#303f9f] text-white font-bold text-sm shadow-md transition flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                <span>Speak with AI Doctor</span>
              </Link>
            </div>
          </div>

          {/* Quick Patient Identity & Status Card */}
          <div className="w-full md:w-80 bg-[#cbf5d6]/50 border border-[#297006]/30 rounded-3xl p-5 shadow-xs space-y-3 shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#297006]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#297006] text-white font-black text-lg flex items-center justify-center">
                  {patient?.name?.[0] || 'S'}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h4>
                  <p className="text-[11px] text-gray-600">ID: {patient?.patient_id || 'MK-78294'}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-[#052e0a] font-extrabold text-xs">
                {patient?.blood_group || 'A+'}
              </span>
            </div>

            {/* Allergy Warning */}
            <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 p-2 rounded-xl font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Allergy: <strong>{patient?.allergies?.join(', ') || 'Penicillin'}</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-xl border border-[#297006]/20">
                <span className="text-[10px] text-gray-500 font-bold block">Heart Rate</span>
                <span className="font-extrabold text-sm text-[#052e0a]">{vitals?.heart_rate || 74} bpm</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-[#297006]/20">
                <span className="text-[10px] text-gray-500 font-bold block">Blood Pressure</span>
                <span className="font-extrabold text-sm text-[#052e0a]">{vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Showcase Grid with Working URLs */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#052e0a]">
              Core MediKiosk Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Access every healthcare module with dedicated working URLs
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-bold text-[#297006] bg-white px-3 py-1 rounded-full border border-[#297006]/30">
            All Features Connected to Django REST API
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <Link
                key={idx}
                to={feat.to}
                className="bg-white rounded-3xl p-5 shadow-md border border-gray-200/80 hover:border-[#297006] hover:shadow-xl transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#cbf5d6] text-[#297006] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#297006] transition">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#297006]">
                  <span>Launch Feature</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live Dashboard Snapshot Row */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Snapshot: Active Medications */}
          <div className="bg-white rounded-3xl p-5 shadow-md border border-[#297006]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#297006]" />
                <h3 className="font-bold text-sm text-[#052e0a]">Today's Active Prescriptions ({medications.length})</h3>
              </div>
              <Link to="/summary" className="text-xs font-bold text-[#297006] hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {medications.slice(0, 3).map((m) => (
                <div key={m.id} className="p-2.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{m.name}</span> <span className="text-gray-500 text-[10px]">({m.dose})</span>
                    <p className="text-[10px] text-gray-500">{m.frequency} • {m.timing}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#cbf5d6] text-[#052e0a] px-2 py-0.5 rounded-full">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Snapshot: Recent Clinical Scans */}
          <div className="bg-white rounded-3xl p-5 shadow-md border border-[#297006]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3f51b5]" />
                <h3 className="font-bold text-sm text-[#052e0a]">Recent Diagnostic Scans ({documents.length})</h3>
              </div>
              <Link to="/records" className="text-xs font-bold text-[#3f51b5] hover:underline">
                View Archive →
              </Link>
            </div>

            <div className="space-y-2">
              {documents.slice(0, 3).map((d) => (
                <div key={d.id} className="p-2.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold text-gray-900 truncate block">{d.title}</span>
                    <p className="text-[10px] text-gray-500">{d.doctor} • {d.doc_type}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                    OCR {d.confidence}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
