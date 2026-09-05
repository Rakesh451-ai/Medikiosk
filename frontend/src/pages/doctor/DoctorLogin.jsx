import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck, Lock, User, AlertCircle, ArrowRight, Activity, Check } from 'lucide-react';
import { api } from '../../services/api';

export default function DoctorLogin({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('dr_sharma');
  const [password, setPassword] = useState('DoctorPass123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);
      localStorage.setItem('medikiosk_token', data.access);
      localStorage.setItem('medikiosk_refresh', data.refresh);
      localStorage.setItem('medikiosk_user', JSON.stringify(data.user));

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      } else {
        navigate('/doctor');
      }
    } catch (err) {
      setError(err.message || 'Invalid username or credentials');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/25">
            <Stethoscope className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Clinical Staff Portal
          </h1>
          <p className="text-sm text-slate-500">
            Secure login for Physicians & Hospital Triage Officers
          </p>
        </div>

        {/* Demo Fast-Login Pills */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fast Demo Logins:
          </span>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setDemoUser('dr_sharma', 'DoctorPass123!')}
              className={`w-full py-2 px-3 text-xs font-bold rounded-xl border text-left flex items-center justify-between transition-all ${
                username === 'dr_sharma'
                  ? 'bg-blue-50 border-blue-400 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>👨‍⚕️ Dr. Rajesh Sharma (MD - Gen Med)</span>
              <span className="text-[10px] text-slate-400 font-mono">DOCTOR</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoUser('dr_sen', 'DoctorPass123!')}
              className={`w-full py-2 px-3 text-xs font-bold rounded-xl border text-left flex items-center justify-between transition-all ${
                username === 'dr_sen'
                  ? 'bg-blue-50 border-blue-400 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>👩‍⚕️ Dr. Ananya Sen (Pulmonology)</span>
              <span className="text-[10px] text-slate-400 font-mono">DOCTOR</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoUser('nurse_priya', 'StaffPass123!')}
              className={`w-full py-2 px-3 text-xs font-bold rounded-xl border text-left flex items-center justify-between transition-all ${
                username === 'nurse_priya'
                  ? 'bg-blue-50 border-blue-400 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>🩺 Nurse Priya Nair (Triage Staff)</span>
              <span className="text-[10px] text-slate-400 font-mono">TRIAGE_STAFF</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating via SimpleJWT..." : "Sign In to Dashboard"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Role-Based Access Control enforced by Django REST Framework & JWT.
        </div>
      </div>
    </div>
  );
}
