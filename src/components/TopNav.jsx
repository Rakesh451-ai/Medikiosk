import React, { useState } from 'react';
import { 
  LogOut, ShieldAlert, Sparkles, Camera, Activity, 
  Menu, X, ChevronRight, User, HeartPulse, SlidersHorizontal 
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function TopNav({
  activeTab,
  onSelectTab,
  patient,
  onLogout,
  headerVariant = 'auto' // 'auto' | 'blue' | 'cyan'
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Background gradient logic:
  // In MedicalSummary: header is cyan themed
  // In DocScanner and AgentWindow: header is indigo blue themed
  const isCyan = headerVariant === 'cyan' || (headerVariant === 'auto' && activeTab === 'summary');
  const bgGradient = isCyan 
    ? 'bg-gradient-to-r from-[#00838f] via-[#00bcd4] to-[#0097a7]' 
    : 'bg-gradient-to-r from-[#283593] via-[#3f51b5] to-[#1e88e5]';

  const tabs = [
    {
      id: 'agent',
      label: 'Health Assistant',
      shortLabel: 'AI Assistant',
      icon: Sparkles,
      iconColor: 'text-amber-300',
      description: 'Interactive AI triage & consultation'
    },
    {
      id: 'doc',
      label: 'Scan Report',
      shortLabel: 'Scan Report',
      icon: Camera,
      iconColor: 'text-emerald-300',
      description: 'OCR & digital prescription scanning'
    },
    {
      id: 'summary',
      label: 'My Health & Vitals',
      shortLabel: 'My Health',
      icon: Activity,
      iconColor: 'text-rose-300',
      description: 'Live vitals, history & prescription summary'
    }
  ];

  return (
    <header className={`relative w-full ${bgGradient} transition-all duration-300 shadow-xl border-b border-white/15 z-30 select-none`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between min-h-[72px] sm:min-h-[80px] py-2.5 gap-3 sm:gap-4">
          
          {/* Brand & Kiosk Station Status */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <div className="flex items-center gap-2 py-1.5 px-3.5 sm:px-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-base sm:text-lg font-black tracking-wide">
                MediKiosk
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/20 backdrop-blur-sm border border-white/15 text-xs text-white/90">
              <span className="font-bold text-amber-300">Station #04</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">Active</span>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2.5 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3.5 py-2 lg:px-4.5 lg:py-2.5 rounded-xl font-bold text-xs lg:text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? tab.id === 'agent'
                        ? 'bg-[#052e0a] text-white ring-2 ring-white/70 shadow-lg scale-[1.02]'
                        : 'bg-[#ff9800] text-gray-950 ring-2 ring-white/80 font-black shadow-lg scale-[1.02]'
                      : 'text-white/90 hover:text-white hover:bg-white/15 active:scale-98'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-inherit' : tab.iconColor}`} />
                  <span className="hidden xl:inline">{tab.label}</span>
                  <span className="inline xl:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Nurse Emergency Call & Patient Profile */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3.5 shrink-0">
            {/* Nurse Alert Call Button */}
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/20 cursor-pointer shrink-0"
              title="Alert Nurse Station"
            >
              <ShieldAlert className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
              <span className="hidden xl:inline">Call Nurse</span>
              <span className="inline xl:hidden">Help</span>
            </button>

            {/* Interactive Patient Profile Chip */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title="Patient Profile & Kiosk Options"
                className="flex items-center gap-2.5 bg-black/20 hover:bg-black/30 border border-white/25 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-2xl transition-all cursor-pointer text-left shadow-sm group"
              >
                <div className="w-8 h-8 rounded-xl bg-[#ff9800] text-gray-950 font-black text-sm flex items-center justify-center ring-2 ring-white/40 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  {patient?.name ? patient.name[0] : 'P'}
                </div>
                <div className="text-xs text-white">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="max-w-[85px] lg:max-w-[120px] truncate">{patient?.name || 'Sarah Jenkins'}</span>
                    <Badge variant="default" className="text-[10px] shrink-0">
                      {patient?.bloodGroup || patient?.blood_group || 'A+'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-white/70 group-hover:text-white transition-colors">
                    {patient?.id || patient?.patient_id || 'MK-78294'}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 top-12 sm:top-14 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 text-gray-800 z-50 animate-fade-in">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-2xl bg-[#cbf5d6] text-[#297006] flex items-center justify-center font-black text-lg shadow-sm">
                      {patient?.name ? patient.name[0] : 'P'}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</h4>
                      <p className="text-xs text-gray-500 font-medium">ID: {patient?.id || patient?.patient_id || 'MK-78294'}</p>
                    </div>
                  </div>

                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 text-gray-600">
                      <span>Blood Group</span>
                      <Badge variant="success">
                        {patient?.bloodGroup || patient?.blood_group || 'A+'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-1 text-gray-600">
                      <span>Age / Gender</span>
                      <span className="font-semibold text-gray-900">{patient?.age || 38} yrs • {patient?.gender || 'Female'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 text-gray-600">
                      <span>Kiosk Session</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowEmergencyModal(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>Alert Nurse Station</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out to Check-In</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Header Controls (< 768px) */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Quick Nurse Call */}
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-md font-bold"
              title="Nurse Assistance Call"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* Mobile Patient Badge */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-xl bg-[#ff9800] text-gray-950 font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white/50"
            >
              {patient?.name ? patient.name[0] : 'P'}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-black/20 text-white border border-white/20 hover:bg-black/30 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (< 768px) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/98 backdrop-blur-2xl border-t border-white/10 px-4 pt-3 pb-6 space-y-3 text-white shadow-2xl animate-fade-in">
          {/* Mobile Patient Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff9800] text-gray-950 font-black text-sm flex items-center justify-center shadow-md">
                {patient?.name ? patient.name[0] : 'P'}
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{patient?.name || 'Sarah Jenkins'}</span>
                  <Badge variant="default" className="text-[10px]">
                    {patient?.bloodGroup || patient?.blood_group || 'A+'}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400">
                  ID: {patient?.id || patient?.patient_id || 'MK-78294'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold"
            >
              Log Out
            </button>
          </div>

          {/* Tab Navigation in Mobile Drawer */}
          <div className="space-y-1.5 pt-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-between transition-all ${
                    isActive
                      ? tab.id === 'agent'
                        ? 'bg-[#052e0a] text-white shadow-md ring-1 ring-white/50'
                        : 'bg-[#ff9800] text-gray-950 font-black shadow-md ring-1 ring-white/70'
                      : 'text-slate-200 hover:text-white bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="leading-tight">{tab.label}</div>
                      <div className={`text-[11px] font-normal ${isActive ? 'opacity-85' : 'text-slate-400'}`}>
                        {tab.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60 shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Emergency Nurse Action */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowEmergencyModal(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Call Station Nurse (Emergency)</span>
            </button>
          </div>
        </div>
      )}

      {/* EMERGENCY / NURSE CALL MODAL */}
      <Modal 
        isOpen={showEmergencyModal} 
        onClose={() => setShowEmergencyModal(false)}
        icon={ShieldAlert}
        iconBg="bg-amber-100"
        iconColor="text-[#ff9800]"
        borderColor="border-[#ff9800]"
        className="text-center flex flex-col items-center max-w-sm"
      >
        <h4 className="text-xl font-bold text-gray-900 w-full text-center mt-2 mb-1">Nurse Assistance Call</h4>
        <p className="text-xs text-gray-600 mb-4 text-center">
          A nurse station alert has been signaled for Kiosk Station #04. A clinical attendant will arrive shortly.
        </p>
        <Badge variant="success" className="mb-4 py-2 px-3 text-xs w-full">
          Status: Attendant Dispatched (ETA ~60s)
        </Badge>
        <Button onClick={() => setShowEmergencyModal(false)} fullWidth className="py-3">
          Dismiss Alert
        </Button>
      </Modal>
    </header>
  );
}
