import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Home, Camera, Activity, Bot, FileText, User, ShieldCheck,
  ShieldAlert, Menu, X, Printer, Sparkles, KeyRound, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';

export function Navbar({ patient, onPatientUpdated, apiStatus = 'online' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showNurseModal, setShowNurseModal] = useState(false);

  // Form states
  const [inputPatientId, setInputPatientId] = useState('MK-78294');
  const [inputPin, setInputPin] = useState('1234');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('32');
  const [newBlood, setNewBlood] = useState('O+');

  const navigate = useNavigate();

  const [isLargeText, setIsLargeText] = useState(false);

  const toggleLargeText = () => {
    const next = !isLargeText;
    setIsLargeText(next);
    if (next) {
      document.body.classList.add('kiosk-large-text');
    } else {
      document.body.classList.remove('kiosk-large-text');
    }
  };

  const navLinks = [
    { to: '/', label: 'Home', shortLabel: 'Home', icon: Home, exact: true },
    { to: '/scanner', label: 'Scan Paper', shortLabel: 'Scan', icon: Camera },
    { to: '/summary', label: 'Health & Vitals', shortLabel: 'Vitals', icon: Activity },
    { to: '/agent', label: 'Ask Assistant', shortLabel: 'AI Assistant', icon: Bot },
    { to: '/records', label: 'Past Records', shortLabel: 'Records', icon: FileText },
  ];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(inputPatientId, inputPin);
      onPatientUpdated(res.patient);
      setShowLoginModal(false);
    } catch {
      setShowLoginModal(false);
    }
  };

  const handleQuickPatient = (name, id, pin, blood, age) => {
    setInputPatientId(id);
    setInputPin(pin);
    onPatientUpdated({
      patient_id: id,
      name: name,
      age: age,
      blood_group: blood,
      allergies: ['Penicillin'],
      latest_vitals: {
        heart_rate: 72,
        bp_systolic: 120,
        bp_diastolic: 80,
        spo2: 98,
        temperature: 98.6,
        glucose: 95
      }
    });
    setShowLoginModal(false);
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.signup({
        name: newName,
        age: parseInt(newAge) || 32,
        blood_group: newBlood,
        allergies: ['Penicillin']
      });
      onPatientUpdated(res.patient);
      setShowSignUpModal(false);
    } catch {
      setShowSignUpModal(false);
    }
  };

  const handlePrint = () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setTimeout(() => window.print(), 300);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 text-white shadow-xl transition-all">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-3 sm:gap-4">

          {/* Brand Logo & Pill Badge with Station status */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="py-2 px-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-[#297006] to-[#1f5705] border-2 border-emerald-400/50 shadow-md shadow-emerald-950/40 flex items-center gap-2 group-hover:scale-[1.03] group-hover:border-emerald-300 transition-all">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
                <span className="text-base sm:text-lg font-black text-white tracking-wide">
                  MediKiosk
                </span>
              </div>
            </Link>

            {/* Kiosk Station Indicator for Tablet & PC */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700/70 text-[11px] font-medium text-slate-300 shadow-inner">
              <span className="text-emerald-400 font-bold">Station #04</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Live</span>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 xl:gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/70 shadow-inner">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.exact}
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 lg:px-3.5 lg:py-2 xl:px-4 xl:py-2.5 rounded-xl font-bold text-xs lg:text-sm flex items-center gap-1.5 lg:gap-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-[#297006] to-[#1f5705] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/40 scale-[1.02]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/70 active:scale-98'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {/* Full label on PC / Large screen, streamlined label on Tablet */}
                  <span className="hidden xl:inline">{link.label}</span>
                  <span className="inline xl:hidden">{link.shortLabel}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header Controls: Accessibility, Patient Card & Emergency Help */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Text Zoom / Elderly Accessibility Mode Toggle */}
            <button
              onClick={toggleLargeText}
              className={`px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isLargeText
                  ? 'bg-amber-400 text-gray-950 border-amber-300 ring-2 ring-amber-300/60 font-black scale-[1.02]'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border-slate-700/70'
              }`}
              title="Toggle Larger Text (For Elderly or Low Vision)"
            >
              <span className="text-xs">A</span>
              <span className="text-sm font-black">A+</span>
              <span className="hidden lg:inline text-[11px] ml-0.5 font-semibold text-slate-200">
                {isLargeText ? 'Large' : 'Normal'}
              </span>
            </button>

            {/* Patient Badge with Switcher */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 lg:gap-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 hover:border-emerald-500/50 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-2xl transition-all text-left cursor-pointer group shadow-xs"
              title="Click to Switch Patient"
            >
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-gradient-to-br from-[#297006] to-[#1f5705] text-white font-extrabold text-xs lg:text-sm flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                {patient?.name?.[0] || 'S'}
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="max-w-[80px] lg:max-w-[110px] xl:max-w-[140px] truncate">
                    {patient?.name || 'Sarah Jenkins'}
                  </span>
                  <Badge variant="default" className="text-[10px] shrink-0">
                    {patient?.blood_group || 'A+'}
                  </Badge>
                </div>
                <div className="hidden lg:block text-[10px] text-slate-400 group-hover:text-emerald-300 transition-colors">
                  Tap to switch
                </div>
              </div>
            </button>

            {/* Nurse Call Alert */}
            <button
              onClick={() => setShowNurseModal(true)}
              className="px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
              title="Need Help? Click to alert the nurse station"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse shrink-0" />
              <span className="hidden xl:inline">Need Help?</span>
              <span className="inline xl:hidden">Help</span>
            </button>
          </div>

          {/* Mobile Header Controls (< 768px) */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Quick Nurse Alert Button */}
            <button
              onClick={() => setShowNurseModal(true)}
              className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 transition-colors flex items-center justify-center shadow-xs"
              title="Emergency Nurse Call"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* Quick Patient Switcher Chip */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 py-1 px-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              title="Switch Patient"
            >
              <div className="w-6 h-6 rounded-lg bg-[#297006] text-white font-black text-xs flex items-center justify-center">
                {patient?.name?.[0] || 'S'}
              </div>
              <span className="text-[10px] text-emerald-400 font-extrabold">{patient?.blood_group || 'A+'}</span>
            </button>

            {/* Mobile Drawer Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/98 backdrop-blur-2xl border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fade-in">
          {/* Mobile Patient Profile Banner */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#297006] to-[#1f5705] text-white font-extrabold text-base flex items-center justify-center shadow-md">
                {patient?.name?.[0] || 'S'}
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{patient?.name || 'Sarah Jenkins'}</span>
                  <Badge variant="default" className="text-[10px]">
                    {patient?.blood_group || 'A+'}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400">
                  ID: {patient?.patient_id || 'MK-78294'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowLoginModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition"
            >
              Switch
            </button>
          </div>

          {/* Navigation Links in Mobile Drawer */}
          <div className="space-y-1.5 pt-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.exact}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#297006] to-[#1f5705] text-white shadow-md ring-1 ring-emerald-400/40'
                        : 'text-slate-200 hover:text-white bg-slate-800/60 hover:bg-slate-800'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-60" />
                </NavLink>
              );
            })}
          </div>

          {/* Mobile Accessibility & Nurse Actions */}
          <div className="pt-3 border-t border-slate-800/90 grid grid-cols-2 gap-2.5">
            <button
              onClick={toggleLargeText}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                isLargeText
                  ? 'bg-amber-400 text-gray-950 border-amber-300 font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <span>A / A+ Text</span>
              <span className="text-[10px] opacity-80">{isLargeText ? '(Large)' : '(Normal)'}</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowNurseModal(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Call Nurse</span>
            </button>
          </div>
        </div>
      )}

      {/* LOGIN & CHECK-IN MODAL */}
      <Modal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        title="Patient Check-In"
        subtitle="Sign in with your Card Number & PIN"
        icon={ShieldCheck}
      >
        {/* Quick 1-Click Demo Profiles for Easy Testing */}
        <div className="mb-4 p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
          <p className="text-[11px] font-bold text-[#052e0a] mb-1.5 flex items-center gap-1">
            <span>⚡ 1-Click Patient Profiles:</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPatient('Sarah Jenkins', 'MK-78294', '1234', 'A+', 38)}
              className="px-2 py-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-left transition cursor-pointer shadow-xs"
            >
              <p className="font-bold text-[11px] text-[#052e0a] truncate">Sarah Jenkins</p>
              <p className="text-[10px] text-gray-500">ID: MK-78294 (A+)</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPatient('Robert Davis', 'MK-91042', '5678', 'O+', 68)}
              className="px-2 py-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-left transition cursor-pointer shadow-xs"
            >
              <p className="font-bold text-[11px] text-[#052e0a] truncate">Robert Davis (Senior)</p>
              <p className="text-[10px] text-gray-500">ID: MK-91042 (O+)</p>
            </button>
          </div>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-3">
          <Input 
            label="Patient ID Number"
            icon={User}
            type="text"
            value={inputPatientId}
            onChange={(e) => setInputPatientId(e.target.value)}
            placeholder="e.g. MK-78294"
            required
          />

          <Input 
            label="4-Digit Security PIN"
            icon={KeyRound}
            type="password"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            placeholder="1234"
            required
          />

          <Button 
            type="submit" 
            variant="primary" 
            fullWidth 
            className="mt-2 py-3"
            icon={ArrowRight}
            iconPosition="right"
          >
            Check In Now
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setShowLoginModal(false);
                setShowSignUpModal(true);
              }}
              className="text-xs font-bold text-[#297006] hover:underline"
            >
              New to the hospital? Register here
            </button>
          </div>
        </form>
      </Modal>

      {/* SIGN UP MODAL */}
      <Modal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)}
        title="New Patient Registration"
        subtitle="Creates a new record in Django database"
      >
        <form onSubmit={handleSignUpSubmit} className="space-y-3">
          <Input
            label="Full Name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Age"
              type="number"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              required
            />
            <Select
              label="Blood Group"
              value={newBlood}
              onChange={(e) => setNewBlood(e.target.value)}
              options={['O+', 'O-', 'A+', 'A-', 'B+', 'AB+']}
            />
          </div>

          <Button type="submit" fullWidth className="mt-2 py-3">
            Complete Registration
          </Button>
        </form>
      </Modal>

      {/* NURSE MODAL */}
      <Modal 
        isOpen={showNurseModal} 
        onClose={() => setShowNurseModal(false)}
        icon={ShieldAlert}
        iconBg="bg-amber-100"
        iconColor="text-[#ff9800]"
        borderColor="border-[#ff9800]"
        className="text-center flex flex-col items-center"
      >
        <h4 className="text-base font-bold text-gray-900 w-full text-center mt-2 mb-2">Nurse Call Activated</h4>
        <p className="text-xs text-gray-600 mb-4 text-center">Station alert dispatched to the clinical nursing unit.</p>
        <Badge variant="success" className="mb-4 py-2 px-3 text-xs w-full">
          Station Status: Nurse Dispatched (ETA ~60s)
        </Badge>
        <Button onClick={() => setShowNurseModal(false)} fullWidth className="py-2.5">
          Dismiss
        </Button>
      </Modal>
    </header>
  );
}
