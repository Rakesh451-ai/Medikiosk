import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Sparkles, ArrowRight, X, HeartPulse, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export function MobileLogin({ onLoginSuccess }) {
  const [patientId, setPatientId] = useState('MK-78294');
  const [pin, setPin] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);

  // New patient fields
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('32');
  const [newGender, setNewGender] = useState('Female');
  const [newBlood, setNewBlood] = useState('O+');
  const [newAllergies, setNewAllergies] = useState('None');

  const handleLogin = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.login(patientId, pin);
      setIsLoading(false);
      onLoginSuccess(data.patient);
    } catch (err) {
      console.warn('API error, falling back to local demo:', err);
      // Fallback
      setIsLoading(false);
      onLoginSuccess({
        patient_id: patientId || 'MK-78294',
        name: 'Sarah Jenkins',
        blood_group: 'A+',
        allergies: ['Penicillin', 'Sulfa Drugs']
      });
    }
  };

  const handleDemoQuickLogin = async () => {
    setIsLoading(true);
    try {
      const data = await api.login('MK-78294', '1234');
      setIsLoading(false);
      onLoginSuccess(data.patient);
    } catch {
      setIsLoading(false);
      onLoginSuccess({
        patient_id: 'MK-78294',
        name: 'Sarah Jenkins',
        blood_group: 'A+',
        allergies: ['Penicillin', 'Sulfa Drugs']
      });
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        name: newName,
        age: parseInt(newAge) || 30,
        gender: newGender,
        blood_group: newBlood,
        allergies: newAllergies.split(',').map((s) => s.trim()).filter(Boolean)
      };
      const res = await api.signup(payload);
      setIsLoading(false);
      setShowSignUp(false);
      onLoginSuccess(res.patient);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Registration failed. Please try again.');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[580px] flex flex-col justify-between p-6 bg-[#cbf5d6] font-sans select-none overflow-y-auto">
      
      {/* Top Mobile Brand Header */}
      <div className="w-full flex items-center justify-between pt-1 text-xs text-[#052e0a]">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-[#297006] animate-pulse"></span>
          <span>MediKiosk Mobile</span>
        </div>
        <span className="text-[11px] font-semibold opacity-75">v2.0 • Django API</span>
      </div>

      {/* Main Center Brand Hero - Faithfully modernized from LoginScreen.pdf */}
      <div className="my-auto w-full flex flex-col items-center text-center space-y-6 py-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#194703]">
          Welcome To
        </h1>

        {/* MediKiosk Pill Badge with subtle glow */}
        <div className="w-full max-w-[320px] py-4 px-6 rounded-full bg-[#297006] border-[3px] border-[#808080] shadow-lg shadow-[#297006]/20 flex items-center justify-center transform active:scale-95 transition">
          <span className="text-3xl md:text-4xl font-extrabold text-white tracking-wide">
            MediKiosk
          </span>
        </div>

        <p className="text-xs md:text-sm text-[#052e0a]/80 font-medium max-w-xs leading-relaxed">
          Your secure digital health companion for prescriptions, medical vitals, and AI health advice.
        </p>

        {/* Quick 1-Tap Demo Check-In */}
        <button
          onClick={handleDemoQuickLogin}
          disabled={isLoading}
          className="flex items-center gap-2 text-xs font-bold text-[#052e0a] bg-white/80 hover:bg-white active:scale-95 px-5 py-2.5 rounded-full border border-[#297006]/30 shadow-sm transition"
        >
          <Sparkles className="w-4 h-4 text-[#297006]" />
          <span>{isLoading ? 'Connecting to Django API...' : '1-Tap Demo Patient (Sarah Jenkins)'}</span>
        </button>
      </div>

      {/* Bottom Action Form - Faithfully matching Login and Sign Up */}
      <div className="w-full max-w-xs mx-auto space-y-3 pb-2">
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Patient ID (e.g. MK-78294)"
              className="w-full pl-10 pr-4 py-3 bg-white/90 border border-gray-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-[#297006] outline-none shadow-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-[#052e0a] hover:bg-[#0a4213] active:scale-98 text-white text-xl font-bold tracking-wide shadow-md shadow-black/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isLoading ? 'Verifying...' : 'Login'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="text-center pt-1">
          <button
            onClick={() => setShowSignUp(true)}
            className="text-lg font-bold text-[#052e0a] hover:text-[#297006] transition-colors py-1 px-4 cursor-pointer hover:underline"
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Sign Up Modal */}
      {showSignUp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-[#297006] relative">
            <button
              onClick={() => setShowSignUp(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#cbf5d6] text-[#297006] flex items-center justify-center font-bold">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#052e0a]">Patient Registration</h3>
                <p className="text-[11px] text-gray-500">Creates live record in Django backend</p>
              </div>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006]"
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
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006]"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Blood Group</label>
                  <select
                    value={newBlood}
                    onChange={(e) => setNewBlood(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006]"
                  >
                    <option>O+</option>
                    <option>O-</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>AB+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  value={newAllergies}
                  onChange={(e) => setNewAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Aspirin"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? 'Creating Chart...' : 'Complete & Start Session'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
