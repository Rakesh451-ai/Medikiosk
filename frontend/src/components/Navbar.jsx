import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserCheck, ShieldAlert, Activity } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const isKiosk = location.pathname.startsWith('/kiosk');

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 group-hover:shadow-emerald-600/30 transition-all duration-200">
              <Activity className="w-5 h-5 transition-transform group-hover:rotate-12" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Medi<span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Kiosk</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-600 font-bold border border-slate-200/80 shadow-2xs">
                v2.4 Monorepo
              </span>
            </div>
          </Link>

          {/* Navigation Mode Switcher */}
          <nav className="flex items-center gap-2">
            <Link
              to="/kiosk"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 ${
                isKiosk
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-700/25 ring-2 ring-emerald-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>/kiosk (Patient UI)</span>
            </Link>
          </nav>

          {/* System status pill */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-800 rounded-full border border-emerald-300/70 font-semibold shadow-2xs backdrop-blur-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Backend & Celery: Online</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>ABDM Ready</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
