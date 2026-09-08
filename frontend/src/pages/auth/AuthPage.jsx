import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Smartphone,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Stethoscope,
  User,
  Calendar,
  Heart,
  Droplet,
  Loader2,
  KeyRound,
  FileCheck
} from 'lucide-react';
import { api } from '../../services/api';

export default function AuthPage({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Active Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login');

  // Login form state
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp'
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const otpRefs = useRef([]);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regBloodGroup, setRegBloodGroup] = useState('B+');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAadhaar, setRegAadhaar] = useState('');
  const [regAbha, setRegAbha] = useState('');
  const [regAllergies, setRegAllergies] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Timer countdown for OTP
  useEffect(() => {
    let interval = null;
    if (otpSent && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timerSeconds]);

  // Handle Login via Password
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!loginIdentifier.trim()) {
      setError('Please enter your Mobile Number, Aadhaar, ABHA ID, or Username.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your Password.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.unifiedLogin({
        identifier: loginIdentifier.trim(),
        authMode: 'password',
        password: loginPassword,
      });

      setSuccessNotice('Login successful! Redirecting to health station...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
        navigate('/');
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!loginIdentifier.trim()) {
      setError('Please enter your registered Mobile Number or Identifier to receive OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(loginIdentifier.trim());
      setOtpSent(true);
      setTimerSeconds(60);
      setSuccessNotice(res.message || 'OTP sent successfully! Check your phone/messages.');
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.verifyOtp(loginIdentifier.trim(), otpCode);
      setSuccessNotice('Authentication verified! Redirecting...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
        navigate('/');
      }, 500);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register Patient
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!regName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    const parsedAge = parseInt(regAge, 10);
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 125) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }
    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const allergiesList = regAllergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        username: cleanPhone,
        password: regPassword,
        name: regName.trim(),
        age: parsedAge,
        gender: regGender,
        phone: cleanPhone,
        blood_group: regBloodGroup,
        allergies: allergiesList,
        mock_aadhaar_id: regAadhaar.replace(/\D/g, '') || '',
        mock_abha_id: regAbha.trim() || '',
      };

      const data = await api.registerPatient(payload);
      setSuccessNotice('Registration successful! Welcome to MediKiosk.');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
        navigate('/');
      }, 600);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check input details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-emerald-50/90 via-[#f2f8f4] to-teal-50/70 py-4 px-4 flex items-center justify-center font-sans">
      <div className="max-w-lg w-full space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            MediKiosk Health Station
          </h1>
        </div>

        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-emerald-200/80 space-y-5">
          {/* Tab Navigation */}
          <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
                setSuccessNotice('');
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all text-center cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError('');
                setSuccessNotice('');
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all text-center cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* Login Mode Selector */}
              <div className="flex items-center justify-center gap-3 text-xs font-semibold pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('password');
                    setError('');
                  }}
                  className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    loginMode === 'password'
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Lock className="w-3 h-3 inline mr-1" /> Password Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('otp');
                    setError('');
                  }}
                  className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    loginMode === 'otp'
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3 h-3 inline mr-1" /> OTP Verification
                </button>
              </div>

              {loginMode === 'password' ? (
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number / Aadhaar / ABHA ID / Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210 or ABHA ID"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number / Aadhaar / ABHA ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        disabled={otpSent}
                        required
                      />
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={loading}
                          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-70"
                        >
                          {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpValues(['', '', '', '', '', '']);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>

                  {otpSent && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-slate-700 text-center">
                        Enter 6-Digit OTP Verification Code
                      </label>
                      <div className="flex justify-center gap-2">
                        {otpValues.map((val, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpRefs.current[idx] = el)}
                            type="text"
                            maxLength={1}
                            value={val}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              const next = [...otpValues];
                              next[idx] = v;
                              setOtpValues(next);
                              if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !val && idx > 0) {
                                otpRefs.current[idx - 1]?.focus();
                              }
                            }}
                            className="w-11 h-12 text-center text-lg font-black rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>
                          {timerSeconds > 0 ? `Resend in ${timerSeconds}s` : 'Code expired'}
                        </span>
                        {timerSeconds === 0 && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="text-emerald-700 font-bold hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-3"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>{loading ? 'Verifying OTP...' : 'Verify & Sign In'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={regBloodGroup}
                    onChange={(e) => setRegBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password * (Min 6)
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Known Drug Allergies (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  value={regAllergies}
                  onChange={(e) => setRegAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa, Aspirin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div> */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aadhaar (Optional)
                  </label>
                  <input
                    type="text"
                    value={regAadhaar}
                    onChange={(e) => setRegAadhaar(e.target.value)}
                    placeholder="12-digit number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ABHA ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={regAbha}
                    onChange={(e) => setRegAbha(e.target.value)}
                    placeholder="14-digit or @abdm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                <span>{loading ? 'Creating Patient Account...' : 'Register Patient & Start'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
