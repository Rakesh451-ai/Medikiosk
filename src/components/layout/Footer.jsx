import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Activity, Phone, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="py-1 px-3 rounded-full bg-[#297006] text-white font-extrabold text-sm border border-[#808080]">
            MediKiosk
          </div>
          <div>
            <p className="text-white font-bold">Smart Healthcare Patient Portal</p>
            <p className="text-[11px] text-slate-500">Connected to Django REST Framework Backend</p>
          </div>
        </div>

        {/* Feature Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <Link to="/scanner" className="hover:text-white transition">Optical Scanner</Link>
          <Link to="/summary" className="hover:text-white transition">Medical Summary</Link>
          <Link to="/agent" className="hover:text-white transition">AI Health Agent</Link>
          <Link to="/records" className="hover:text-white transition">Clinical Records</Link>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Station #04 Online</span>
          <span className="text-slate-600">•</span>
          <span>HIPAA Compliant Session</span>
        </div>
      </div>
    </footer>
  );
}
