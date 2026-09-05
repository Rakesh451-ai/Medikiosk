import React, { useState } from 'react';
import { 
  Monitor, Smartphone, Eye, Layers, ExternalLink, ChevronRight, 
  RotateCcw, Sparkles, Check, Info 
} from 'lucide-react';

export function KioskFrame({ 
  currentScreen, 
  onSelectScreen, 
  children,
  onResetDemo 
}) {
  const [viewMode, setViewMode] = useState('kiosk'); // 'kiosk' | 'full' | 'compare'
  const [showReferenceOverlay, setShowReferenceOverlay] = useState(false);

  // Map screen key to corresponding reference image
  const referenceImageMap = {
    login: '/reference/login.png',
    doc: '/reference/doc.png',
    summary: '/reference/summary.png',
    agent: '/reference/agent.png'
  };

  const currentRefImg = referenceImageMap[currentScreen] || '/reference/login.png';

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start font-sans">
      
      {/* Top Demo & Kiosk Hardware Control Bar */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg z-40">
        
        {/* Brand & Kiosk Station Status */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#297006] flex items-center justify-center font-black text-white text-sm shadow-md">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wide">MediKiosk Local Server</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE :5173
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Deployed from Design Mockups</p>
          </div>
        </div>

        {/* Quick Screen Navigation Selector */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 overflow-x-auto text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold px-2 hidden sm:inline">
            Screens:
          </span>
          <button
            onClick={() => onSelectScreen('login')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentScreen === 'login'
                ? 'bg-[#297006] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            1. Login
          </button>
          <button
            onClick={() => onSelectScreen('doc')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentScreen === 'doc'
                ? 'bg-[#297006] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            2. DocScanner
          </button>
          <button
            onClick={() => onSelectScreen('summary')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentScreen === 'summary'
                ? 'bg-[#297006] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            3. MedicalSummary
          </button>
          <button
            onClick={() => onSelectScreen('agent')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentScreen === 'agent'
                ? 'bg-[#297006] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            4. AgentWindow
          </button>
        </div>

        {/* Layout & Compare Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('kiosk')}
              title="Kiosk Portrait Terminal View (636x1042 Aspect)"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'kiosk'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">Kiosk Mode</span>
            </button>
            <button
              onClick={() => setViewMode('full')}
              title="Full Responsive View"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'full'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden md:inline">Full Display</span>
            </button>
            <button
              onClick={() => setViewMode('compare')}
              title="Side-by-Side with Original Mockup"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'compare'
                  ? 'bg-[#ff9800] text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden md:inline">Compare Design</span>
            </button>
          </div>

          <button
            onClick={onResetDemo}
            title="Reset to default patient data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-x-hidden">
        {viewMode === 'compare' ? (
          /* Side-by-Side Comparison Mode */
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start py-4">
            {/* Live React Implementation */}
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2 px-2 text-xs font-bold text-emerald-400">
                <span>⚡ Live React Application ({currentScreen})</span>
                <span className="text-[10px] text-slate-400">Interactive</span>
              </div>
              <div className="w-full max-w-[440px] aspect-[9/15] rounded-[36px] bg-slate-900 shadow-2xl overflow-hidden border-[6px] border-slate-800 ring-1 ring-slate-700 relative flex flex-col">
                {children}
              </div>
            </div>

            {/* Original Uploaded Reference Screenshot */}
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2 px-2 text-xs font-bold text-amber-400">
                <span>📷 Original Uploaded Design ({currentScreen}.pdf)</span>
                <span className="text-[10px] text-slate-400">Reference Mockup</span>
              </div>
              <div className="w-full max-w-[440px] aspect-[9/15] rounded-[36px] bg-black shadow-2xl overflow-hidden border-[6px] border-slate-800 ring-1 ring-slate-700 relative flex items-center justify-center">
                <img
                  src={currentRefImg}
                  alt="Original Design Reference"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        ) : viewMode === 'kiosk' ? (
          /* Sleek Kiosk Stand / Terminal Frame */
          <div className="relative flex flex-col items-center py-2 animate-fade-in">
            {/* Top Terminal Camera / Sensor Bezel */}
            <div className="w-full max-w-[440px] bg-slate-900 border-t-2 border-x-2 border-slate-800 rounded-t-[40px] py-2 px-8 flex items-center justify-between text-[11px] text-slate-400 shadow-xl">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></span>
                <span className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700"></span>
              </div>
              {/* Kiosk Camera Lens */}
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60"></div>
              </div>
              <div className="font-mono text-[10px] text-slate-500">MK-STATION #04</div>
            </div>

            {/* Kiosk Screen Frame */}
            <div className="relative w-[375px] sm:w-[420px] md:w-[440px] h-[750px] sm:h-[800px] md:h-[840px] bg-[#cbf5d6] rounded-b-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden border-b-[8px] border-x-[8px] border-slate-900 ring-1 ring-slate-700 flex flex-col">
              {children}
            </div>

            {/* Physical Stand Foot */}
            <div className="w-32 h-3 bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-xl shadow-md -mt-1"></div>
            <div className="w-56 h-2 bg-slate-800/80 rounded-full blur-[2px] mt-1"></div>
          </div>
        ) : (
          /* Full Display Responsive Mode */
          <div className="w-full max-w-5xl h-[85vh] bg-[#cbf5d6] rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-800 flex flex-col animate-fade-in">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
