import React from 'react';
import { 
  UserCheck, 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldCheck 
} from 'lucide-react';
import { 
  HeroHeader, 
  FlowCard, 
  ClinicalPipelineSteps 
} from '../components/home';

export default function Home() {
  const patientFeatures = [
    {
      icon: CheckCircle2,
      text: "Large 64px+ touch targets & high contrast",
      iconColor: "text-emerald-600"
    },
    {
      icon: CheckCircle2,
      text: "Multilingual: English, Hindi, Hinglish",
      iconColor: "text-emerald-600"
    },
    {
      icon: CheckCircle2,
      text: "Voice input & simulated OCR scanner",
      iconColor: "text-emerald-600"
    }
  ];

  const doctorFeatures = [
    {
      icon: AlertTriangle,
      text: "Active Red-Flag Triage banner & drug alerts",
      iconColor: "text-rose-500"
    },
    {
      icon: FileText,
      text: "Structured timeline & digitized prior Rx",
      iconColor: "text-blue-600"
    },
    {
      icon: ShieldCheck,
      text: "ABDM consent validation & FHIR bundle",
      iconColor: "text-blue-600"
    }
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-emerald-50/25 to-slate-100/90 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 sm:w-[540px] h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-10 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12 w-full relative z-10">
        {/* Reusable Hero Header Section */}
        <HeroHeader />

        {/* Entry Flow Selector Cards */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Patient Flow Card */}
          <FlowCard
            to="/kiosk"
            icon={UserCheck}
            title="Patient Kiosk Flow"
            routeBadge="/kiosk"
            description={
              <>
                Touch & voice friendly patient interface designed for low-literacy accessibility. Multi-step intake:{' '}
                <strong className="text-slate-800 font-semibold">Identify → Converse → Scan → Consent</strong>.
              </>
            }
            features={patientFeatures}
            actionLabel="Launch Kiosk Terminal"
            colorScheme="emerald"
          />

          {/* Doctor Flow Card */}
          <FlowCard
            to="/doctor"
            icon={Stethoscope}
            title="Doctor Dashboard"
            routeBadge="/doctor"
            description="Dense clinical workspace for physicians. Pre-consultation summary, red-flag alert badges, prescription conflict warnings, and quick editable notes."
            features={doctorFeatures}
            actionLabel="Open Doctor Dashboard"
            colorScheme="blue"
          />
        </div>

        {/* Reusable Pipeline Diagram Stepper Bar */}
        <ClinicalPipelineSteps />
      </div>
    </div>
  );
}
