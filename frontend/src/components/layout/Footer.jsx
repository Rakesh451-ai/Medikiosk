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

          </div>
        </div>
      </div>
    </footer>
  );
}
