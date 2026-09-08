import React from 'react';
import { Info, PhoneCall } from 'lucide-react';

export function ClinicalNoticeBanner({
  noticeText,
  emergencyNumber = '112',
  className = ''
}) {
  const defaultNotice = (
    <>
      <strong className="font-bold text-amber-950">Clinical Notice:</strong>{' '}
      This assistant provides information based on your uploaded records and does not replace emergency medical care.
      For severe chest pain, shortness of breath, or bleeding, please alert hospital triage immediately.
    </>
  );

  return (
    <aside
      role="note"
      aria-label="Clinical safety notice"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/95 via-amber-50/80 to-amber-100/60 border border-amber-200/90 p-3.5 text-xs text-amber-900 shadow-xs backdrop-blur-sm transition-all duration-200 hover:border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-300/60 flex items-center justify-center shrink-0 text-amber-700 mt-0.5 sm:mt-0">
          <Info className="w-3.5 h-3.5" />
        </div>
        <p className="leading-relaxed text-slate-800 text-[11.5px] sm:text-xs">
          {noticeText || defaultNotice}
        </p>
      </div>

      <a
        href={`tel:${emergencyNumber}`}
        className="shrink-0 self-end sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-[11px] shadow-xs shadow-amber-500/20 transition-all cursor-pointer group"
      >
        <PhoneCall className="w-3.5 h-3.5 group-hover:animate-bounce" />
        <span>Emergency {emergencyNumber}</span>
      </a>
    </aside>
  );
}

export default ClinicalNoticeBanner;
