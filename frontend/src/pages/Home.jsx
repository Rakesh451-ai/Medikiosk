import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Stethoscope, ArrowRight, ShieldCheck, FileText, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide uppercase border border-emerald-300 shadow-sm">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>AI-Assisted Pre-Consultation Monorepo</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
            Welcome to <span className="text-emerald-600">MediKiosk</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
            Bridging outpatient check-in with clinical decision support. Powered by Django REST Framework, Celery background tasks, and multimodal React touch/voice interfaces.
          </p>
        </div>

        {/* Entry Flow Selector Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Patient Flow Card */}
          <Link
            to="/kiosk"
            className="group relative bg-white border-2 border-emerald-200 rounded-3xl p-8 shadow-xl shadow-emerald-900/5 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-600/15 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-slate-900">Patient Kiosk Flow</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">/kiosk</span>
                </div>
                <p className="text-slate-600 text-base leading-relaxed">
                  Touch & voice friendly patient interface designed for low-literacy accessibility. Multi-step intake:
                  <strong className="text-slate-800"> Identify → Converse → Scan → Consent</strong>.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Large 64px+ touch targets & high contrast</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Multilingual: English, Hindi, Hinglish</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Voice input & simulated OCR scanner</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4 flex items-center justify-between text-emerald-700 font-bold group-hover:text-emerald-800">
              <span>Launch Kiosk Terminal</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Doctor Flow Card */}
          <Link
            to="/doctor"
            className="group relative bg-white border-2 border-blue-200 rounded-3xl p-8 shadow-xl shadow-blue-900/5 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-600/15 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Stethoscope className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">/doctor</span>
                </div>
                <p className="text-slate-600 text-base leading-relaxed">
                  Dense clinical workspace for physicians. Pre-consultation summary, red-flag alert badges, prescription conflict warnings, and quick editable notes.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Active Red-Flag Triage banner & drug alerts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Structured timeline & digitized prior Rx</span>
                </li>
                <li className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>ABDM consent validation & FHIR bundle</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4 flex items-center justify-between text-blue-700 font-bold group-hover:text-blue-800">
              <span>Open Doctor Dashboard</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Pipeline Diagram Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">
            Standard End-to-End Clinical Flow
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {[
              { step: '1', title: 'Patient', sub: 'Arrival & Welcome' },
              { step: '2', title: 'Identify', sub: 'Phone / ABHA ID' },
              { step: '3', title: 'Converse', sub: 'Module A: Engine' },
              { step: '4', title: 'Scan', sub: 'Module B: OCR' },
              { step: '5', title: 'Summarize', sub: 'Module C: Synthesis' },
              { step: '6', title: 'Consult', sub: 'Doctor Review' },
            ].map((p, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1.5">
                  {p.step}
                </div>
                <div className="text-sm font-bold text-slate-800">{p.title}</div>
                <div className="text-xs text-slate-500">{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
