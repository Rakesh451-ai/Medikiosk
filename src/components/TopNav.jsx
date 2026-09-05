import React, { useState } from 'react';
import { LogOut, UserCheck, ShieldAlert, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';

export function TopNav({
  activeTab,
  onSelectTab,
  patient,
  onLogout,
  headerVariant = 'auto' // 'auto' | 'blue' | 'cyan'
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Background color logic:
  // In MedicalSummary: header is #00bcd4 (cyan)
  // In DocScanner and AgentWindow: header is #3f51b5 (indigo blue)
  const isCyan = headerVariant === 'cyan' || (headerVariant === 'auto' && activeTab === 'summary');
  const bgColor = isCyan ? 'bg-[#00bcd4]' : 'bg-[#3f51b5]';

  return (
    <header className={`relative w-full ${bgColor} transition-colors duration-200 shadow-md z-30 select-none`}>
      <div className="w-full px-4 py-3 flex items-center justify-between min-h-[64px]">
        {/* If in Agent view with blue header, we show the orange square on the left, but make it an interactive menu/home button! */}
        {activeTab === 'agent' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEmergencyModal(true)}
              title="Kiosk Quick Menu / Nurse Call"
              className="w-8 h-8 rounded-md bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 transition shadow-sm flex items-center justify-center cursor-pointer"
            >
              <span className="sr-only">Menu</span>
            </button>
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() => onSelectTab('summary')}
                className="text-xs font-bold text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full transition"
              >
                Summary
              </button>
              <button
                onClick={() => onSelectTab('doc')}
                className="text-xs font-bold text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full transition"
              >
                Scanner
              </button>
            </div>
          </div>
        ) : (
          /* Three pill navigation buttons matching MedicalSummary.pdf design */
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
            {/* AGENT TAB */}
            <button
              onClick={() => onSelectTab('agent')}
              className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 ${
                activeTab === 'agent'
                  ? 'bg-[#052e0a] text-white ring-2 ring-white/50'
                  : 'bg-[#052e0a]/80 hover:bg-[#052e0a] text-white'
              }`}
            >
              <span>Agent</span>
            </button>

            {/* SCANNER TAB */}
            <button
              onClick={() => onSelectTab('doc')}
              className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeTab === 'doc'
                  ? 'bg-[#ff9800] text-black ring-2 ring-white/60 font-extrabold'
                  : 'bg-[#ff9800] hover:bg-[#f57c00] text-black'
              }`}
            >
              <span>Scanner</span>
            </button>

            {/* SUMMARY TAB */}
            <button
              onClick={() => onSelectTab('summary')}
              className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeTab === 'summary'
                  ? 'bg-[#ff9800] text-black ring-2 ring-white/60 font-extrabold'
                  : 'bg-[#ff9800] hover:bg-[#f57c00] text-black'
              }`}
            >
              <span>Summary</span>
            </button>
          </div>
        )}

        {/* Right side circular avatar indicator - Matches orange circle #ff9800 in mockups */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Patient Profile & Kiosk Options"
            className="w-8 h-8 rounded-full bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 transition shadow-sm flex items-center justify-center ring-2 ring-white/40 cursor-pointer"
          >
            <span className="sr-only">Profile</span>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 text-gray-800 z-50 animate-fade-in">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#cbf5d6] text-[#297006] flex items-center justify-center font-bold text-base">
                  {patient?.name ? patient.name[0] : 'P'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h4>
                  <p className="text-xs text-gray-500">ID: {patient?.id || 'MK-78294'}</p>
                </div>
              </div>

              <div className="py-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600 py-1">
                  <span>Blood Group:</span>
                  <span className="font-bold text-[#297006]">{patient?.bloodGroup || 'A+'}</span>
                </div>
                <div className="flex justify-between text-gray-600 py-1">
                  <span>Age / Gender:</span>
                  <span className="font-semibold">{patient?.age || 38} yrs / {patient?.gender || 'Female'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out to Login Screen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EMERGENCY / NURSE CALL MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-[#ff9800] text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-[#ff9800] mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Nurse Assistance Call</h3>
            <p className="text-xs text-gray-600 mb-4">
              A nurse station alert has been signaled for Kiosk #04. An attendant will arrive shortly.
            </p>
            <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-xs font-semibold mb-4">
              Status: Attendant Dispatched (ETA ~90s)
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
