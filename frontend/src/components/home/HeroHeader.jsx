import React from 'react';
import { Cpu, Sparkles } from 'lucide-react';

export function HeroHeader({
  badgeText = "AI-Assisted Pre-Consultation Monorepo",
  badgeIcon: BadgeIcon = Cpu,
  titlePrefix = "Welcome to ",
  titleHighlight = "MediKiosk",
  subtitle = "Bridging outpatient check-in with clinical decision support. Powered by Django REST Framework, Celery background tasks, and multimodal React touch/voice interfaces.",
  className = ""
}) {
  return (
    <header className={`text-center space-y-4 max-w-3xl mx-auto ${className}`}>
      {/* Monorepo Tech Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-300/80 text-emerald-800 text-xs font-extrabold tracking-wide uppercase shadow-xs backdrop-blur-sm transition-all hover:bg-emerald-500/15">
        {BadgeIcon && <BadgeIcon className="w-4 h-4 text-emerald-600 shrink-0" />}
        <span>{badgeText}</span>
        <Sparkles className="w-3 h-3 text-emerald-500" />
      </div>

      {/* Main Hero Title */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
        {titlePrefix}
        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {titleHighlight}
        </span>
      </h1>

      {/* Hero Subtitle */}
      {subtitle && (
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
          {subtitle}
        </p>
      )}
    </header>
  );
}

export default HeroHeader;
