import React from 'react';
import { Workflow } from 'lucide-react';

const DEFAULT_STEPS = [
  { step: '1', title: 'Patient', sub: 'Arrival & Welcome' },
  { step: '2', title: 'Identify', sub: 'Phone / ABHA ID' },
  { step: '3', title: 'Converse', sub: 'Module A: Engine' },
  { step: '4', title: 'Scan', sub: 'Module B: OCR' },
  { step: '5', title: 'Summarize', sub: 'Module C: Synthesis' },
  { step: '6', title: 'Consult', sub: 'Doctor Review' },
];

export function ClinicalPipelineSteps({
  title = "Standard End-to-End Clinical Flow",
  steps = DEFAULT_STEPS,
  className = ""
}) {
  return (
    <section className={`bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 ${className}`}>
      {/* Stepper Header */}
      <div className="flex items-center justify-center gap-2">
        <Workflow className="w-4 h-4 text-emerald-600" />
        <h3 className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wider text-center">
          {title}
        </h3>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 text-center">
        {steps.map((p, idx) => (
          <div
            key={idx}
            className="group p-3.5 rounded-2xl bg-slate-50/90 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-300/80 transition-all duration-200 hover:-translate-y-0.5 shadow-2xs flex flex-col items-center justify-between min-h-[96px]"
          >
            {/* Step Number Bubble */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xs flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              {p.step}
            </div>

            {/* Step Title & Subtitle */}
            <div className="mt-2 space-y-0.5">
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-emerald-950 transition-colors">
                {p.title}
              </div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">
                {p.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ClinicalPipelineSteps;
