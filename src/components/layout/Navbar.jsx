import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Home, Camera, Activity, Bot, FileText, User, ShieldCheck, 
  ShieldAlert, Menu, X, Printer, Sparkles, KeyRound, ArrowRight 
} from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';

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

  const navLinks = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/scanner', label: 'Scanner', icon: Camera },
    { to: '/summary', label: 'Summary', icon: Activity },
    { to: '/agent', label: 'AI Agent', icon: Bot },
    { to: '/records', label: 'Records', icon: FileText },
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
    <header className="sticky top-0 z-50 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          
          {/* Brand Logo & Pill Badge - Faithful to LoginScreen design */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="py-1 px-3.5 rounded-full bg-[#297006] border-[2px] border-[#808080] shadow-sm flex items-center justify-center group-hover:scale-102 transition">
              <span className="text-base sm:text-lg font-black text-white tracking-wide">
                MediKiosk
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>Healthcare Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Django REST API :8000</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.exact}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#297006] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header Controls: Patient Profile & Quick Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Patient Badge */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 px-3 py-1.5 rounded-2xl transition text-left cursor-pointer"
              title="Click to Switch Patient or Check In"
            >
              <div className="w-8 h-8 rounded-xl bg-[#297006] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {patient?.name?.[0] || 'S'}
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>{patient?.name || 'Sarah Jenkins'}</span>
                  <span className="text-[10px] font-bold bg-[#cbf5d6] text-[#052e0a] px-1.5 py-0.2 rounded-md">
                    {patient?.blood_group || 'A+'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ID: {patient?.patient_id || 'MK-78294'}
                </div>
              </div>
            </button>

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Print Summary"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Nurse Call Alert */}
            <button
              onClick={() => setShowNurseModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Nurse Call</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-8 h-8 rounded-xl bg-[#297006] text-white font-black text-xs flex items-center justify-center"
            >
              {patient?.name?.[0] || 'S'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1 animate-fade-in">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition ${
                    isActive
                      ? 'bg-[#297006] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Patient: {patient?.name || 'Sarah Jenkins'}</span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowNurseModal(true);
              }}
              className="text-amber-400 font-bold"
            >
              Call Nurse
            </button>
          </div>
        </div>
      )}

      {/* LOGIN & CHECK-IN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-gray-900">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-[#297006] relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#cbf5d6] text-[#297006] flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#052e0a]">Patient Check-In</h3>
                <p className="text-xs text-gray-500">Switch or Authenticate Session</p>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Patient Health ID</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={inputPatientId}
                    onChange={(e) => setInputPatientId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Security PIN</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-2"
              >
                <span>Check In Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowSignUpModal(true);
                  }}
                  className="text-xs font-bold text-[#297006] hover:underline"
                >
                  Register New Patient Instead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIGN UP MODAL */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-gray-900">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-[#297006] relative">
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-[#052e0a] mb-1">New Patient Registration</h3>
            <p className="text-xs text-gray-500 mb-4">Creates a new record in Django database</p>

            <form onSubmit={handleSignUpSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Age</label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Blood Group</label>
                  <select
                    value={newBlood}
                    onChange={(e) => setNewBlood(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none"
                  >
                    <option>O+</option>
                    <option>O-</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#052e0a] text-white font-bold text-sm shadow-md mt-2"
              >
                Complete Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NURSE MODAL */}
      {showNurseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-gray-900">
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl border-4 border-[#ff9800] text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-[#ff9800] mx-auto flex items-center justify-center mb-2">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Nurse Call Activated</h4>
            <p className="text-xs text-gray-600 my-2">Station alert dispatched to the clinical nursing unit.</p>
            <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl text-xs font-semibold mb-3">
              Station Status: Nurse Dispatched (ETA ~60s)
            </div>
            <button
              onClick={() => setShowNurseModal(false)}
              className="w-full py-2 rounded-full bg-[#052e0a] text-white font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
