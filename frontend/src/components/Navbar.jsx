import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserCheck, ShieldAlert, Cpu, Activity, Globe } from 'lucide-react';
import tokens from '../styles/design-tokens';

export default function Navbar() {
  const location = useLocation();
  const isKiosk = location.pathname.startsWith('/kiosk');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Medi<span className="text-emerald-600">Kiosk</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                v2.4 Monorepo
              </span>
            </div>
          </Link>

          {/* Navigation Mode Switcher */}
          <nav className="flex items-center space-x-2">
            <Link
              to="/kiosk"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isKiosk
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>/kiosk (Patient UI)</span>
            </Link>
          </nav>

          {/* System status pill */}
          <div className="hidden md:flex items-center space-x-3 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Backend & Celery: Online</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ABDM Ready</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
