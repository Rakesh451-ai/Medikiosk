import React, { useState } from 'react';
import { User, ShieldCheck, QrCode, KeyRound, Sparkles, ArrowRight, X, HeartPulse } from 'lucide-react';

export function LoginScreen({ onLoginSuccess }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [patientId, setPatientId] = useState('MK-78294');
  const [pin, setPin] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);

  // New patient registration state
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newBlood, setNewBlood] = useState('O+');

  const handleLoginSubmit = (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        id: patientId || 'MK-78294',
        name: patientId === 'MK-78294' ? 'Sarah Jenkins' : 'Demo Patient'
      });
    }, 600);
  };

  const handleQuickDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        id: 'MK-78294',
        name: 'Sarah Jenkins'
      });
    }, 400);
  };

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSignUpModal(false);
      onLoginSuccess({
        id: 'MK-' + Math.floor(10000 + Math.random() * 90000),
        name: newName || 'Alex Taylor',
        bloodGroup: newBlood,
        age: newAge || 32
      });
    }, 600);
  };

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col items-center justify-between py-12 px-6 bg-[#cbf5d6] select-none font-sans overflow-hidden">
      {/* Decorative subtle ambient pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#297006_0.8px,transparent_0.8px)] [background-size:24px_24px]"></div>

      {/* Top hospital kiosk badge */}
      <div className="relative z-10 w-full flex items-center justify-between text-xs text-[#194703]/70 font-semibold tracking-wider uppercase pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#297006] animate-ping"></span>
          <span>Kiosk #04 Online</span>
        </div>
        <span>Secure Health Portal</span>
      </div>

      {/* Center Welcome Section - Matches Original Mockup Faithfully */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-sm space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#194703] text-center drop-shadow-sm">
          Welcome To
        </h1>

        {/* MediKiosk Pill Badge - Faithful 1:1 Design */}
        <div className="w-full max-w-[340px] py-4 px-8 rounded-full bg-[#297006] border-[3px] border-[#808080] shadow-md flex items-center justify-center transform hover:scale-[1.02] transition-transform duration-200">
          <span className="text-3xl md:text-4xl font-bold text-white tracking-wide">
            MediKiosk
          </span>
        </div>

        <p className="text-sm text-[#194703]/80 text-center font-medium max-w-xs pt-1">
          Touch to check in, scan medical records, or speak with your AI Health Assistant.
        </p>
      </div>

      {/* Bottom Action Area - Matches Original Mockup Faithfully */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs space-y-4 mb-4">
        {/* Main Login Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full py-4 rounded-full bg-[#052e0a] hover:bg-[#0a4213] active:scale-[0.98] text-white text-2xl font-bold tracking-wide shadow-lg shadow-black/20 transition-all duration-150 flex items-center justify-center gap-2"
        >
          <span>Login</span>
        </button>

        {/* Sign Up Text Link */}
        <button
          onClick={() => setShowSignUpModal(true)}
          className="text-xl md:text-2xl font-bold text-[#052e0a] hover:text-[#297006] transition-colors py-1 px-4 hover:underline"
        >
          Sign Up
        </button>

        {/* Quick Demo Access for immediate exploration */}
        <button
          onClick={handleQuickDemo}
          disabled={isLoading}
          className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#194703]/80 bg-white/70 hover:bg-white px-4 py-2 rounded-full border border-[#297006]/30 shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#297006]" />
          <span>{isLoading ? 'Checking In...' : 'Quick Kiosk Demo (Skip Auth)'}</span>
        </button>
      </div>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border-4 border-[#297006] relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#cbf5d6] flex items-center justify-center text-[#297006]">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#052e0a]">Patient Check-In</h2>
                <p className="text-xs text-gray-500">Enter your Patient ID or Scan Health Card</p>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#052e0a] uppercase tracking-wider mb-1">
                  Patient Health ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="e.g. MK-78294"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#297006] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#052e0a] uppercase tracking-wider mb-1">
                  Security PIN / Birth Year
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="****"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#297006] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#cbf5d6]/50 border border-[#297006]/30 text-xs text-[#052e0a]">
                <strong>Kiosk Tip:</strong> Pre-filled with demo patient Sarah Jenkins (MK-78294).
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3.5 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition"
                >
                  <span>{isLoading ? 'Verifying...' : 'Check In'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2.5 rounded-xl border-2 border-[#297006] text-[#297006] hover:bg-[#cbf5d6]/40 font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Simulate RFID / QR Card Tap</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SIGN UP MODAL */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border-4 border-[#297006] relative">
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#cbf5d6] flex items-center justify-center text-[#297006]">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#052e0a]">New Patient Registration</h2>
                <p className="text-xs text-gray-500">Create a new MediKiosk digital chart</p>
              </div>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#052e0a] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Taylor"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#297006] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#052e0a] uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="32"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#297006] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#052e0a] uppercase tracking-wider mb-1">
                    Blood Group
                  </label>
                  <select
                    value={newBlood}
                    onChange={(e) => setNewBlood(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#297006] outline-none"
                  >
                    <option>O+</option>
                    <option>O-</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                A digital health card ID will be instantly generated for your kiosk session.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>{isLoading ? 'Creating Record...' : 'Complete Registration'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
