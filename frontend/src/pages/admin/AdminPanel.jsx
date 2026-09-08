import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX, Users, UserX, UserCheck,
  AlertTriangle, AlertOctagon, Ban, Lock, Unlock, Search, Filter,
  RefreshCw, Trash2, Edit3, Eye, Plus, ArrowLeft, CheckCircle2,
  Activity, Zap, Terminal, Smartphone, Mail, Globe, Check, X,
  Clock, Stethoscope, ChevronRight, Sparkles, ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminPanel() {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    total_users: 0,
    patients_count: 0,
    doctors_count: 0,
    admins_count: 0,
    flagged_spammers_count: 0,
    active_blocked_count: 0,
    today_incidents: 0,
    today_otps: 0,
    critical_alerts_24h: 0,
    system_health: 'OPTIMAL',
    fraud_engine_status: 'ACTIVE_MONITORING'
  });

  const [users, setUsers] = useState([]);
  const [blockedList, setBlockedList] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Tabs: 'users' | 'spammers' | 'logs'
  const [activeTab, setActiveTab] = useState('users');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Modals
  const [editingUser, setEditingUser] = useState(null);
  const [inspectingUser, setInspectingUser] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlock, setNewBlock] = useState({
    identifier: '',
    identifier_type: 'PHONE',
    reason: 'Suspicious OTP flood attempts'
  });

  // Admin Authentication State
  const [isAdminAuth, setIsAdminAuth] = useState(api.isAdminAuthenticated());
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (isAdminAuth) {
      loadAllAdminData();
    }
  }, [isAdminAuth]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');
    try {
      const res = await api.adminLogin(adminUsername, adminPassword);
      if (res.success) {
        setIsAdminAuth(true);
        showToast('Administrator authenticated successfully.', 'success');
      } else {
        setAdminLoginError(res.error || 'Invalid administrator credentials.');
      }
    } catch (err) {
      setAdminLoginError('Authentication failed. Please check network connection.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    api.adminLogout();
    setIsAdminAuth(false);
    setAdminPassword('');
    showToast('Administrator session ended.', 'info');
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, blockedData, logsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers({ q: searchQuery, role: roleFilter, status: statusFilter }),
        api.getBlockedIdentifiers(),
        api.getSecurityLogs(riskFilter)
      ]);

      if (statsData) setStats(statsData);
      if (usersData?.users) setUsers(usersData.users);
      if (blockedData?.blocked_identifiers) setBlockedList(blockedData.blocked_identifiers);
      if (logsData?.logs) setSecurityLogs(logsData.logs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Failed to load live backend data. Working in offline fallback.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter users query debounce / trigger
  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        const res = await api.getAdminUsers({
          q: searchQuery,
          role: roleFilter,
          status: statusFilter
        });
        if (res?.users) setUsers(res.users);
      } catch (e) {}
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, roleFilter, statusFilter]);

  // Actions
  const handleToggleSpammer = async (user) => {
    setActionLoading(true);
    try {
      const res = await api.toggleUserSpammer(user.id, user.is_flagged_spammer ? '' : 'Flagged by Admin Panel');
      if (res?.user) {
        setUsers(users.map(u => u.id === user.id ? res.user : u));
        showToast(
          res.user.is_flagged_spammer
            ? `Flagged ${res.user.username} as Spammer & restricted access.`
            : `Cleared spammer flag for ${res.user.username}.`,
          res.user.is_flagged_spammer ? 'warning' : 'success'
        );
        const newStats = await api.getAdminStats();
        if (newStats) setStats(newStats);
      }
    } catch (e) {
      showToast('Failed to update spammer status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    setActionLoading(true);
    try {
      const res = await api.toggleUserActive(user.id);
      if (res?.user) {
        setUsers(users.map(u => u.id === user.id ? res.user : u));
        showToast(`User account ${res.user.is_active ? 'Activated' : 'Suspended'}.`, 'info');
      }
    } catch (e) {
      showToast('Failed to update account status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSecurity = async (user) => {
    setActionLoading(true);
    try {
      const res = await api.resetUserSecurity(user.id);
      if (res?.user) {
        setUsers(users.map(u => u.id === user.id ? res.user : u));
        showToast(`Security score and OTP limits reset to 0 for ${user.username}.`, 'success');
      }
    } catch (e) {
      showToast('Failed to reset security score.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}" (${user.name})? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.deleteAdminUser(user.id);
      if (res?.message) {
        setUsers(users.filter(u => u.id !== user.id));
        showToast(res.message, 'info');
        const newStats = await api.getAdminStats();
        if (newStats) setStats(newStats);
      } else {
        showToast(res?.error || 'Failed to delete user.', 'error');
      }
    } catch (e) {
      showToast('Failed to delete user.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const res = await api.updateAdminUser(editingUser.id, editingUser);
      if (res?.user) {
        setUsers(users.map(u => u.id === editingUser.id ? res.user : u));
        showToast(`User ${res.user.username} updated successfully!`, 'success');
        setEditingUser(null);
      }
    } catch (e) {
      showToast('Failed to save user changes.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!newBlock.identifier.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.blockIdentifier(newBlock.identifier, newBlock.identifier_type, newBlock.reason);
      if (res?.blocked_identifier) {
        setBlockedList([res.blocked_identifier, ...blockedList]);
        showToast(`Blocked ${newBlock.identifier_type}: ${newBlock.identifier}`, 'warning');
        setShowBlockModal(false);
        setNewBlock({ identifier: '', identifier_type: 'PHONE', reason: 'Suspicious OTP flood attempts' });
        // Refresh users & stats
        const [statsData, usersData, logsData] = await Promise.all([
          api.getAdminStats(),
          api.getAdminUsers({ q: searchQuery, role: roleFilter, status: statusFilter }),
          api.getSecurityLogs()
        ]);
        if (statsData) setStats(statsData);
        if (usersData?.users) setUsers(usersData.users);
        if (logsData?.logs) setSecurityLogs(logsData.logs);
      }
    } catch (e) {
      showToast('Failed to block identifier.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async (blockedItem) => {
    setActionLoading(true);
    try {
      const res = await api.unblockIdentifier(blockedItem.id, blockedItem.identifier);
      if (res?.message) {
        setBlockedList(blockedList.map(b => b.id === blockedItem.id ? { ...b, is_active: false } : b));
        showToast(`Unblocked ${blockedItem.identifier}`, 'success');
        const [statsData, logsData] = await Promise.all([api.getAdminStats(), api.getSecurityLogs()]);
        if (statsData) setStats(statsData);
        if (logsData?.logs) setSecurityLogs(logsData.logs);
      }
    } catch (e) {
      showToast('Failed to unblock identifier.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateIncident = async (type) => {
    setActionLoading(true);
    try {
      const res = await api.simulateSecurityIncident(type);
      if (res?.incident) {
        showToast(`Simulated ${type.toUpperCase()} incident registered! Check Audit Logs.`, 'warning');
        const [statsData, logsData] = await Promise.all([api.getAdminStats(), api.getSecurityLogs()]);
        if (statsData) setStats(statsData);
        if (logsData?.logs) setSecurityLogs(logsData.logs);
      }
    } catch (e) {
      showToast('Simulation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 75) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">Admin</span>;
      case 'DOCTOR':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Doctor</span>;
      case 'TRIAGE_STAFF':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">Staff</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Patient</span>;
    }
  };

  if (!isAdminAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">MediKiosk Administration</h2>
            <p className="text-xs text-slate-400">
              Restricted Security Zone • System Administrators Only
            </p>
          </div>

          {adminLoginError && (
            <div className="bg-red-950/60 border border-red-800/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-red-200">
              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="font-semibold">{adminLoginError}</div>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Administrator Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Security Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adminLoginLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {adminLoginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Administrator Token...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate & Open Admin Console</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Patient Kiosk</span>
            </Link>
            <span className="text-[10px] font-mono text-emerald-500/70">
              Role: System Superuser
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all animate-bounce ${
          toast.type === 'error' ? 'bg-red-950 text-red-200 border-red-700' :
          toast.type === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' :
          toast.type === 'info' ? 'bg-sky-950 text-sky-200 border-sky-700' :
          'bg-emerald-950 text-emerald-200 border-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertOctagon className="w-5 h-5 text-red-400" /> :
           toast.type === 'warning' ? <ShieldAlert className="w-5 h-5 text-amber-400" /> :
           <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Return to Patient Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">MediKiosk Admin & Anti-Spam Control</h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Shield
                  </span>
                </div>
                <p className="text-xs text-slate-400">User Identity Management, Spam Defense & Fraud Detection Engine</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBlockModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block Spammer</span>
            </button>

            <button
              onClick={loadAllAdminData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh All Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <Link
              to="/doctor"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
              <span>Doctor Portal</span>
            </Link>

            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-900 text-rose-200 text-xs font-bold transition border border-rose-700/60 shadow-sm cursor-pointer"
              title="Sign Out of Administrator Session"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Card 1: Total Users */}
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">{stats.total_users}</span>
              <span className="text-[11px] text-emerald-400 font-semibold">{stats.patients_count} Patients</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>{stats.doctors_count} Doctors</span>
              <span>•</span>
              <span>{stats.admins_count} Staff/Admin</span>
            </div>
          </div>

          {/* Card 2: Spammers Flagged */}
          <div className="bg-slate-800/80 border border-red-900/40 rounded-2xl p-4 flex flex-col justify-between hover:border-red-700/60 transition bg-gradient-to-br from-slate-800/80 to-red-950/20">
            <div className="flex items-center justify-between text-red-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Spammers</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-red-400">{stats.flagged_spammers_count}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-200 font-bold">Flagged</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Suspicious accounts isolated</div>
          </div>

          {/* Card 3: Blocked Identifiers */}
          <div className="bg-slate-800/80 border border-amber-900/40 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-700/60 transition bg-gradient-to-br from-slate-800/80 to-amber-950/20">
            <div className="flex items-center justify-between text-amber-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Blacklist</span>
              <Ban className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-400">{stats.active_blocked_count}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-bold">Enforced</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">IPs, Aadhaar, Phones blocked</div>
          </div>

          {/* Card 4: Security Incidents (24h) */}
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Incidents (24h)</span>
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">{stats.critical_alerts_24h}</span>
              <span className="text-[11px] text-yellow-400 font-semibold">{stats.today_incidents} today</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">OTP flood & auth alerts</div>
          </div>

          {/* Card 5: Shield Health */}
          <div className="col-span-2 md:col-span-1 bg-slate-800/80 border border-emerald-900/40 rounded-2xl p-4 flex flex-col justify-between bg-gradient-to-br from-slate-800/80 to-emerald-950/20">
            <div className="flex items-center justify-between text-emerald-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Defense State</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-emerald-400">Active (100%)</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Zero Bypass Mode</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('spammers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'spammers'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Spam & Blacklist ({blockedList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Security Audit Logs ({securityLogs.length})</span>
            </button>
          </div>

          {/* Test & Simulation Trigger */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Threat Simulator:</span>
            <button
              onClick={() => handleSimulateIncident('otp_flood')}
              disabled={actionLoading}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
              title="Simulate 12 rapid OTP attempts from bot proxy"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate OTP Flood</span>
            </button>

            <button
              onClick={() => handleSimulateIncident('aadhaar_fraud')}
              disabled={actionLoading}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-300 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
              title="Simulate invalid UIDAI checksum fraud"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>Simulate Aadhaar Fraud</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: USERS DIRECTORY & MANAGEMENT                     */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name, Username, Phone, Email, Aadhaar, or ABHA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 text-xs mr-1">Role:</span>
                {['ALL', 'PATIENT', 'DOCTOR', 'ADMIN'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition text-xs ${
                      roleFilter === r
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 text-xs mr-1">Status:</span>
                {[
                  { label: 'All', val: 'all' },
                  { label: 'Active', val: 'active' },
                  { label: 'Suspended', val: 'suspended' },
                  { label: 'Spammer Only', val: 'spammer' }
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setStatusFilter(s.val)}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition text-xs ${
                      statusFilter === s.val
                        ? s.val === 'spammer'
                          ? 'bg-red-900/60 text-red-200 border border-red-700'
                          : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Data Table */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Contact & Identification</th>
                      <th className="py-3 px-4">Security / Risk Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                          <p className="font-semibold">No users matching current filters.</p>
                          <p className="text-xs mt-1">Try changing search query or reset filter pills.</p>
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSpam = u.is_flagged_spammer || u.spam_score >= 75;
                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-slate-750 transition ${
                              isSpam ? 'bg-red-950/20' : !u.is_active ? 'bg-slate-900/40 opacity-75' : ''
                            }`}
                          >
                            {/* User details */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isSpam
                                    ? 'bg-red-900/60 text-red-200 border border-red-700'
                                    : u.role === 'ADMIN'
                                    ? 'bg-purple-900/60 text-purple-200 border border-purple-700'
                                    : u.role === 'DOCTOR'
                                    ? 'bg-blue-900/60 text-blue-200 border border-blue-700'
                                    : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                                }`}>
                                  {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white text-sm">{u.name || u.username}</span>
                                    {isSpam && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-red-900/80 text-red-200 border border-red-700">
                                        SPAMMER
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    @{u.username} • Joined {u.date_joined || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              {getRoleBadge(u.role)}
                            </td>

                            {/* Contact & ID */}
                            <td className="py-3.5 px-4 space-y-0.5">
                              {u.phone && (
                                <div className="text-slate-200 flex items-center gap-1 font-mono">
                                  <Smartphone className="w-3 h-3 text-slate-400" />
                                  <span>+91 {u.phone}</span>
                                </div>
                              )}
                              {u.mock_aadhaar_id && (
                                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                                  <span className="font-semibold text-slate-400">Aadhaar:</span> {u.mock_aadhaar_id}
                                </div>
                              )}
                              {u.mock_abha_id && (
                                <div className="text-[11px] text-blue-400 font-mono flex items-center gap-1">
                                  <span className="font-semibold text-slate-400">ABHA:</span> {u.mock_abha_id}
                                </div>
                              )}
                              {u.email && !u.phone && (
                                <div className="text-slate-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{u.email}</span>
                                </div>
                              )}
                            </td>

                            {/* Security & Risk Score */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                                  <div
                                    className={`h-full transition-all ${
                                      u.spam_score >= 75 ? 'bg-red-500' : u.spam_score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.max(u.spam_score, 8)}%` }}
                                  ></div>
                                </div>
                                <span className={`text-[11px] font-bold font-mono ${
                                  u.spam_score >= 75 ? 'text-red-400' : u.spam_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {u.spam_score}/100
                                </span>
                              </div>
                              {u.spam_notes && (
                                <p className="text-[10px] text-red-300 mt-1 line-clamp-1 italic">
                                  "{u.spam_notes}"
                                </p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {u.is_active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                  Suspended
                                </span>
                              )}
                            </td>

                            {/* Administrative Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Toggle Spammer Button */}
                                <button
                                  onClick={() => handleToggleSpammer(u)}
                                  disabled={actionLoading}
                                  className={`px-2 py-1 rounded-md font-bold text-[10px] transition border ${
                                    u.is_flagged_spammer
                                      ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-700'
                                      : 'bg-red-900/60 hover:bg-red-800 text-red-200 border-red-700'
                                  }`}
                                  title={u.is_flagged_spammer ? 'Clear Spammer Status' : 'Flag as Spammer'}
                                >
                                  {u.is_flagged_spammer ? 'Unflag Spammer' : 'Flag Spammer'}
                                </button>

                                {/* Toggle Active Button */}
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  disabled={actionLoading}
                                  className={`p-1.5 rounded-md text-xs transition border ${
                                    u.is_active
                                      ? 'bg-slate-800 hover:bg-amber-900/50 text-slate-300 hover:text-amber-200 border-slate-700'
                                      : 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border-emerald-700'
                                  }`}
                                  title={u.is_active ? 'Suspend Account' : 'Reactivate Account'}
                                >
                                  {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => setEditingUser({ ...u })}
                                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                  title="Edit User Profile"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Inspector Button */}
                                <button
                                  onClick={() => setInspectingUser(u)}
                                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                  title="View Comprehensive Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Reset Security Button */}
                                {u.spam_score > 0 && (
                                  <button
                                    onClick={() => handleResetSecurity(u)}
                                    className="p-1.5 rounded-md bg-amber-900/40 hover:bg-amber-800 text-amber-300 border border-amber-700 transition"
                                    title="Reset Security Score to 0"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete User Button */}
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={actionLoading}
                                  className="p-1.5 rounded-md bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700 transition"
                                  title="Delete User Permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SPAM, FRAUD & BLACKLISTED IDENTIFIERS             */}
        {/* ======================================================== */}
        {activeTab === 'spammers' && (
          <div className="space-y-6">
            {/* Threat Defense Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span>OTP Flood Protection</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Automatically throttles & rate-limits any phone or email dispatching more than <strong>5 OTPs in 5 minutes</strong>. Offending IPs receive progressive spam scores and temporary blocks.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm mb-2">
                  <Ban className="w-5 h-5" />
                  <span>Zero-Bypass Blacklist</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Blacklisted identifiers (Phone, IP, Aadhaar, Email) are intercepted at the Django middleware layer with HTTP 403 Forbidden. OTP dispatch and authentication are completely disallowed.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span>ABDM & UIDAI Verification Gate</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enforces 12-digit Verhoeff checksum algorithm for Aadhaar and 14-digit ABDM gateway standard formats, preventing mock ID collision and forged credentials.
                </p>
              </div>
            </div>

            {/* Blacklisted Identifiers Registry */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Ban className="w-5 h-5 text-red-400" />
                    <span>Active Blacklist & Blocked Threat Actors</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Entities actively blocked from generating OTPs, logging in, or interacting with MediKiosk.
                  </p>
                </div>
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Identifier to Blacklist</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4">Identifier Type</th>
                      <th className="py-3 px-4">Blocked Target</th>
                      <th className="py-3 px-4">Enforcement Reason</th>
                      <th className="py-3 px-4">Blocked On</th>
                      <th className="py-3 px-4">Enforced By</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {blockedList.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-10 text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                          <p className="font-semibold text-slate-200">No active blacklist entries.</p>
                          <p className="text-xs text-slate-400">All traffic is passing standard health checks.</p>
                        </td>
                      </tr>
                    ) : (
                      blockedList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-750 transition">
                          <td className="py-3.5 px-4 font-semibold">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]">
                              {item.identifier_type === 'IP' && <Globe className="w-3 h-3 text-blue-400" />}
                              {item.identifier_type === 'PHONE' && <Smartphone className="w-3 h-3 text-emerald-400" />}
                              {item.identifier_type === 'EMAIL' && <Mail className="w-3 h-3 text-amber-400" />}
                              {item.identifier_type === 'AADHAAR' && <Shield className="w-3 h-3 text-red-400" />}
                              {item.identifier_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                            {item.identifier}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                            <span className="text-xs leading-snug">{item.reason}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {item.created_at}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                            {item.blocked_by || 'Security Engine'}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-700">
                                Blacklisted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.is_active ? (
                              <button
                                onClick={() => handleUnblock(item)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-900/60 text-slate-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-700 text-xs font-semibold transition"
                              >
                                Unblock
                              </button>
                            ) : (
                              <span className="text-slate-500 text-xs italic">Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LIVE SECURITY & AUDIT LOGS                       */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Logs Controls */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Live Security Incident Feed</h3>
                  <p className="text-[11px] text-slate-400">Real-time audit log of login attempts, OTP events, and policy violations</p>
                </div>
              </div>

              {/* Risk Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 text-xs mr-1">Risk Level:</span>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setRiskFilter(lvl);
                      api.getSecurityLogs(lvl).then(res => res?.logs && setSecurityLogs(res.logs));
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      riskFilter === lvl
                        ? lvl === 'CRITICAL' ? 'bg-red-600 text-white' :
                          lvl === 'HIGH' ? 'bg-orange-600 text-white' :
                          lvl === 'MEDIUM' ? 'bg-amber-600 text-white' :
                          'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs List */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl divide-y divide-slate-700/60 shadow-xl overflow-hidden">
              {securityLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="font-semibold text-slate-200">No security incidents recorded.</p>
                  <p className="text-xs text-slate-400">Audit trail is currently clear.</p>
                </div>
              ) : (
                securityLogs.map((log) => {
                  const isCrit = log.risk_level === 'CRITICAL';
                  const isHigh = log.risk_level === 'HIGH';
                  const isMed = log.risk_level === 'MEDIUM';

                  return (
                    <div
                      key={log.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-750 transition ${
                        isCrit ? 'bg-red-950/20' : isHigh ? 'bg-orange-950/15' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-2 rounded-xl border flex-shrink-0 ${
                          isCrit ? 'bg-red-900/40 text-red-400 border-red-700' :
                          isHigh ? 'bg-orange-900/40 text-orange-400 border-orange-700' :
                          isMed ? 'bg-amber-900/40 text-amber-400 border-amber-700' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {isCrit ? <AlertOctagon className="w-4 h-4" /> :
                           isHigh ? <ShieldAlert className="w-4 h-4" /> :
                           isMed ? <AlertTriangle className="w-4 h-4" /> :
                           <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-xs tracking-tight">
                              {log.event_display || log.event_type}
                            </span>
                            <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                              isCrit ? 'bg-red-900/80 text-red-200 border border-red-700' :
                              isHigh ? 'bg-orange-900/80 text-orange-200 border border-orange-700' :
                              isMed ? 'bg-amber-900/80 text-amber-200 border border-amber-700' :
                              'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {log.risk_level} Risk
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Target: {log.identifier}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              IP: {log.ip_address}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-snug">
                            {log.details}
                          </p>
                        </div>
                      </div>
                      <div className="text-right sm:flex-shrink-0 text-[11px] text-slate-400 font-mono">
                        {log.created_at}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: BLOCK IDENTIFIER / ADD TO BLACKLIST             */}
      {/* ======================================================== */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <Ban className="w-5 h-5" />
                <h3 className="text-base text-white">Add Threat Actor to Blacklist</h3>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Identifier Type</label>
                <select
                  value={newBlock.identifier_type}
                  onChange={(e) => setNewBlock({ ...newBlock, identifier_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-red-500 focus:outline-none"
                >
                  <option value="PHONE">Phone Number (10-digit)</option>
                  <option value="AADHAAR">Aadhaar Number (12-digit)</option>
                  <option value="ABHA">ABHA ID / Address</option>
                  <option value="IP">IP Address (e.g. 198.51.100.42)</option>
                  <option value="EMAIL">Email Address</option>
                  <option value="USERNAME">Username</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Identifier Value</label>
                <input
                  type="text"
                  placeholder="e.g. 9999999999, 198.51.100.42, or 552189341284"
                  value={newBlock.identifier}
                  onChange={(e) => setNewBlock({ ...newBlock, identifier: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reason for Blacklist</label>
                <textarea
                  rows="3"
                  value={newBlock.reason}
                  onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  required
                  placeholder="Describe suspicious activity or security policy violation..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="bg-red-950/30 border border-red-900/60 rounded-xl p-3 text-[11px] text-red-200">
                ⚠️ Once blocked, this target cannot dispatch OTPs, authenticate, or access any outpatient clinical endpoints.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition"
                >
                  Confirm & Enforce Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT USER DETAILS                               */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base text-white">Edit User: {editingUser.username}</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Account Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="TRIAGE_STAFF">Triage Staff</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Security / Spammer Notes</label>
                <input
                  type="text"
                  value={editingUser.spam_notes || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, spam_notes: e.target.value })}
                  placeholder="Admin notes on risk level or behavior..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: USER PROFILE INSPECTOR                          */}
      {/* ======================================================== */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  {inspectingUser.name?.charAt(0) || inspectingUser.username?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{inspectingUser.name || inspectingUser.username}</h3>
                  <p className="text-[10px] text-slate-400">User ID #{inspectingUser.id} • @{inspectingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Aadhaar Number</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {inspectingUser.mock_aadhaar_id || 'Not Linked'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">ABHA Health ID</span>
                <span className="font-mono text-blue-400 font-bold text-sm">
                  {inspectingUser.mock_abha_id || 'Not Linked'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Mobile Phone</span>
                <span className="font-mono text-white">
                  {inspectingUser.phone ? `+91 ${inspectingUser.phone}` : 'None'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Email</span>
                <span className="text-white truncate block">
                  {inspectingUser.email || 'None'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Role</span>
                <span className="text-white">{inspectingUser.role}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Spam Risk Score</span>
                <span className={`font-mono font-bold ${
                  inspectingUser.spam_score >= 75 ? 'text-red-400' : inspectingUser.spam_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {inspectingUser.spam_score} / 100 ({inspectingUser.is_flagged_spammer ? 'Banned Spammer' : 'Normal'})
                </span>
              </div>
            </div>

            {inspectingUser.spam_notes && (
              <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-200">
                <span className="font-bold block mb-0.5 text-red-300">Spam / Risk Notes:</span>
                {inspectingUser.spam_notes}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => {
                  setInspectingUser(null);
                  setEditingUser(inspectingUser);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setInspectingUser(null)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
