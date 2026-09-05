import React, { useState } from 'react';
import { Smartphone, Monitor, Layers, RotateCcw, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { MobileStatusBar } from './MobileStatusBar';
import { MobileNavBar } from './MobileNavBar';

export function MobileAppContainer({
  activeTab,
  onSelectTab,
  isAuthenticated,
  patient,
  docCount,
  children,
  onResetDemo,
  apiStatus = 'online'
}) {
  const [viewMode, setViewMode] = useState('mobile'); // 'mobile' | 'full' | 'compare'

  const referenceMap = {
    login: '/reference/login.png',
    doc: '/reference/doc.png',
    summary: '/reference/summary.png',
    agent: '/reference/agent.png',
    records: '/reference/summary.png',
  };

  const currentRef = referenceMap[activeTab] || '/reference/login.png';

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start font-sans antialiased">
      
      {/* Top Demo & Backend Integration Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#297006] flex items-center justify-center font-extrabold text-white text-xs shadow-xs">
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-xs">MediKiosk Mobile</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Django REST API :8000
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Modern Mobile Patient Healthcare Portal</p>
          </div>
        </div>

        {/* Quick Screen Selector */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 overflow-x-auto text-xs">
          <button
            onClick={() => onSelectTab('login')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              activeTab === 'login' ? 'bg-[#297006] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => onSelectTab('summary')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              activeTab === 'summary' ? 'bg-[#297006] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => onSelectTab('doc')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              activeTab === 'doc' ? 'bg-[#297006] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => onSelectTab('agent')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              activeTab === 'agent' ? 'bg-[#297006] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            AI Agent
          </button>
          <button
            onClick={() => onSelectTab('records')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              activeTab === 'records' ? 'bg-[#297006] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Records
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
                viewMode === 'mobile' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Mobile Frame</span>
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
                viewMode === 'full' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Responsive</span>
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
                viewMode === 'compare' ? 'bg-[#ff9800] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Compare Design</span>
            </button>
          </div>

          <button
            onClick={onResetDemo}
            title="Reset to default patient data"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Viewport Area */}
      <main className="flex-1 w-full flex items-center justify-center p-3 sm:p-6 overflow-x-hidden">
        {viewMode === 'compare' ? (
          /* Side-by-Side Comparison with the Original PDF Mockups */
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start py-2">
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2 text-xs font-bold text-emerald-400">
                <span>⚡ Modernized React + Django App ({activeTab})</span>
                <span className="text-[10px] text-slate-400">Interactive</span>
              </div>
              <div className="w-full max-w-[390px] h-[780px] rounded-[48px] bg-[#cbf5d6] shadow-2xl overflow-hidden border-[8px] border-slate-900 ring-1 ring-slate-800 relative flex flex-col">
                <MobileStatusBar apiStatus={apiStatus} />
                <div className="flex-1 overflow-hidden relative flex flex-col">
                  {children}
                </div>
                {isAuthenticated && (
                  <MobileNavBar
                    activeTab={activeTab}
                    onSelectTab={onSelectTab}
                    docCount={docCount}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2 text-xs font-bold text-amber-400">
                <span>📷 Original Uploaded Mockup</span>
                <span className="text-[10px] text-slate-400">Design Reference</span>
              </div>
              <div className="w-full max-w-[390px] h-[780px] rounded-[48px] bg-black shadow-2xl overflow-hidden border-[8px] border-slate-900 ring-1 ring-slate-800 relative flex items-center justify-center">
                <img
                  src={currentRef}
                  alt="Original Design"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        ) : viewMode === 'mobile' ? (
          /* Modern Smartphone Hardware Frame */
          <div className="relative flex flex-col items-center py-2 animate-fade-in">
            {/* Phone Chassis */}
            <div className="relative w-[375px] sm:w-[390px] h-[780px] sm:h-[812px] bg-[#cbf5d6] rounded-[50px] shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden border-[10px] border-slate-900 ring-1 ring-slate-800 flex flex-col">
              {/* Native Mobile Status Bar */}
              <MobileStatusBar apiStatus={apiStatus} />

              {/* Screen Content */}
              <div className="flex-1 overflow-hidden relative flex flex-col">
                {children}
              </div>

              {/* Bottom Navigation (if authenticated) */}
              {isAuthenticated && (
                <MobileNavBar
                  activeTab={activeTab}
                  onSelectTab={onSelectTab}
                  docCount={docCount}
                />
              )}

              {/* Home Indicator Bar */}
              <div className="w-full bg-white/95 pb-2 pt-0.5 flex justify-center">
                <div className="w-32 h-1 bg-black/40 rounded-full"></div>
              </div>
            </div>
          </div>
        ) : (
          /* Full Responsive View */
          <div className="w-full max-w-4xl h-[86vh] bg-[#cbf5d6] rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-800 flex flex-col animate-fade-in">
            <MobileStatusBar apiStatus={apiStatus} />
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {children}
            </div>
            {isAuthenticated && (
              <MobileNavBar
                activeTab={activeTab}
                onSelectTab={onSelectTab}
                docCount={docCount}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
