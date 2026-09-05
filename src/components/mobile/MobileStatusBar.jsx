import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Radio } from 'lucide-react';

export function MobileStatusBar({ apiStatus = 'online' }) {
  const [time, setTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full pt-3 pb-2 px-6 flex items-center justify-between text-xs font-semibold text-[#052e0a] select-none z-30">
      {/* Time */}
      <span className="tracking-tight font-bold text-[13px]">{time}</span>

      {/* Dynamic Island / Camera Notch */}
      <div className="w-24 h-4 bg-black/90 rounded-full flex items-center justify-center gap-1 shadow-inner">
        <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 animate-pulse"></div>
      </div>

      {/* Connectivity & Backend Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-[#297006]/15 text-[#297006] px-1.5 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#297006] animate-ping"></span>
          <span>DRF</span>
        </div>
        <Signal className="w-3.5 h-3.5 text-[#052e0a]" />
        <Wifi className="w-3.5 h-3.5 text-[#052e0a]" />
        <div className="flex items-center">
          <Battery className="w-4 h-4 text-[#052e0a] fill-[#052e0a]" />
        </div>
      </div>
    </div>
  );
}
