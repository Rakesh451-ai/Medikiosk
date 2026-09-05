import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Activity, Thermometer, Droplet, Pill, FileText, CheckCircle2, 
  AlertTriangle, Printer, Sparkles, Plus, Clock, ChevronRight, User, 
  RefreshCw, Camera, Upload, Send, Mic, MicOff, Volume2, VolumeX, 
  Bot, ShieldCheck, ShieldAlert, Smartphone, Monitor, Layers, X, KeyRound, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';

export function UnifiedDashboard() {
  // Global Patient & State (Synced with Django REST Framework)
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [apiStatus, setApiStatus] = useState('online');

  // Scanner state
  const [scannerAction, setScannerAction] = useState('scan'); // 'scan' | 'upload'
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedDocResult, setScannedDocResult] = useState(null);
  const [allergyAlert, setAllergyAlert] = useState(false);
  const fileInputRef = useRef(null);

  // Agent chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const chatEndRef = useRef(null);

  // View & Modal states
  const [layoutMode, setLayoutMode] = useState('dashboard'); // 'dashboard' | 'mobile-preview' | 'compare'
  const [activeMobileSection, setActiveMobileSection] = useState('all'); // 'all' | 'summary' | 'scanner' | 'agent'
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(null);
  const [showNurseAlert, setShowNurseAlert] = useState(false);
  const [isUpdatingVitals, setIsUpdatingVitals] = useState(false);

  // Login form state
  const [inputPatientId, setInputPatientId] = useState('MK-78294');
  const [inputPin, setInputPin] = useState('1234');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('32');
  const [newBlood, setNewBlood] = useState('O+');

  // Preset clinical documents
  const presetTemplates = [
    {
      id: 'template-rx',
      title: 'Clinical Prescription - Dr. Michael Chen',
      doc_type: 'Prescription',
      facility: 'Metro General Hospital',
      doctor: 'Dr. Michael Chen, MD',
      diagnosis: 'Seasonal Respiratory Infection & Mild Bronchospasm',
      extracted_text: 'METRO GENERAL HOSPITAL\nDate: 04-Sep-2026\nPatient: Sarah Jenkins (Age: 38)\nRx:\n1. Amoxicillin 500mg - 1 capsule PO q8h x 7d\n2. Levocetirizine 5mg - 1 tab PO qhs x 5d\n3. Fluticasone Nasal Spray - 2 sprays daily',
      medications: [
        { name: "Amoxicillin", dose: "500 mg", frequency: "3 times daily", duration: "7 days", instruction: "Take after meals with water", timing: "Morning, Noon, Night" },
        { name: "Levocetirizine", dose: "5 mg", frequency: "Once daily", duration: "5 days", instruction: "Take at bedtime", timing: "Night" }
      ],
      confidence: '99.4%'
    },
    {
      id: 'template-lab',
      title: 'Comprehensive Metabolic Panel & CBC',
      doc_type: 'Lab Report',
      facility: 'BioPath Diagnostic Laboratories',
      doctor: 'Dr. Rachel Adams, Pathologist',
      diagnosis: 'Routine Fasting Metabolic & Lipid Profile',
      extracted_text: 'BIOPATH DIAGNOSTICS\nPatient: Sarah Jenkins\n- Fasting Glucose: 92 mg/dL (Normal)\n- Total Cholesterol: 198 mg/dL (Desirable)\n- HDL: 58 mg/dL (Optimal)\n- Hemoglobin: 13.8 g/dL (Normal)',
      medications: [
        { name: "Omega-3 Fish Oil", dose: "1000 mg", frequency: "Daily", duration: "Ongoing", instruction: "With breakfast", timing: "Morning" }
      ],
      confidence: '98.9%'
    },
    {
      id: 'template-xray',
      title: 'Digital Chest Radiography (PA View)',
      doc_type: 'Radiology',
      facility: 'Advanced Imaging Center',
      doctor: 'Dr. K. Vance, Radiologist',
      diagnosis: 'Chest X-Ray Post-Viral Clearance',
      extracted_text: 'ADVANCED RADIOLOGY\nExamination: Chest X-Ray PA View\nFindings: Lungs are clear without focal consolidation or pneumothorax. Cardiothoracic ratio is normal (0.45). Impression: Normal study.',
      medications: [],
      confidence: '99.8%'
    }
  ];

  // Fetch initial data from Django API
  const refreshData = async (targetId = 'MK-78294') => {
    try {
      const p = await api.getPatient(targetId);
      setPatient(p);
      setVitals(p.latest_vitals);

      const [meds, docs, chatHist] = await Promise.all([
        api.getMedications(p.patient_id),
        api.getDocuments(p.patient_id),
        api.getChatHistory(p.patient_id)
      ]);

      setMedications(meds);
      setDocuments(docs);
      if (chatHist && chatHist.length > 0) {
        setMessages(chatHist);
      }
      setApiStatus('online');
    } catch (e) {
      console.warn('API error, working offline fallback:', e);
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    refreshData('MK-78294');
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  // Handle Medication Dose Toggle
  const handleToggleMed = async (medId) => {
    try {
      await api.toggleMedication(medId);
      refreshData(patient?.patient_id);
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate Vitals Reading
  const handleSimulateVitals = async () => {
    setIsUpdatingVitals(true);
    try {
      const newVitals = {
        patient_id: patient?.patient_id || 'MK-78294',
        heart_rate: Math.floor(70 + Math.random() * 12),
        bp_systolic: Math.floor(115 + Math.random() * 10),
        bp_diastolic: Math.floor(75 + Math.random() * 8),
        spo2: Math.floor(98 + Math.random() * 2),
        temperature: parseFloat((98.2 + Math.random() * 0.5).toFixed(1)),
        glucose: Math.floor(90 + Math.random() * 10)
      };
      await api.updateVitals(newVitals);
      refreshData(patient?.patient_id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingVitals(false);
    }
  };

  // Optical Document Scanner Handler
  const handleStartScan = (template = presetTemplates[0]) => {
    setIsScanning(true);
    setScanProgress(15);
    setScannedDocResult(null);
    setAllergyAlert(false);

    const timer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          submitScan(template);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  const submitScan = async (template) => {
    try {
      const payload = {
        patient_id: patient?.patient_id || 'MK-78294',
        title: template.title,
        doc_type: template.doc_type,
        facility: template.facility,
        doctor: template.doctor,
        diagnosis: template.diagnosis,
        extracted_text: template.extracted_text,
        confidence: template.confidence,
        medications: template.medications
      };

      const res = await api.scanDocument(payload);
      setIsScanning(false);
      setScannedDocResult(res.document || template);
      setAllergyAlert(res.allergy_warning || false);
      refreshData(patient?.patient_id);

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (e) {
      setIsScanning(false);
      setScannedDocResult(template);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const customTemplate = {
      id: 'upload-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      doc_type: file.type.includes('pdf') ? 'Prescription' : 'Lab Report',
      facility: 'Uploaded Clinical Record',
      doctor: 'Attending Physician',
      diagnosis: 'Processed by Optical Kiosk OCR Engine',
      extracted_text: `UPLOADED FILE: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nParsed by Django OCR.`,
      medications: [
        { name: "Prescribed Item", dose: "Standard", frequency: "As directed", duration: "7 days", instruction: "Take with meals", timing: "Daily" }
      ],
      confidence: '98.5%'
    };

    handleStartScan(customTemplate);
  };

  // AI Agent Speech & Chat
  const speakText = (text) => {
    if (voiceMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setChatInput(text);
        setIsListening(false);
        handleSendChat(text);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const demoQueries = [
          "Can I safely take Amoxicillin?",
          "Explain my latest scan report",
          "How are my vitals today?"
        ];
        const q = demoQueries[Math.floor(Math.random() * demoQueries.length)];
        setChatInput(q);
        handleSendChat(q);
      }, 1400);
    }
  };

  const handleSendChat = async (customPrompt) => {
    const query = (customPrompt || chatInput).trim();
    if (!query) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'patient',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAgentTyping(true);

    try {
      const res = await api.sendChatMessage(query, patient?.patient_id || 'MK-78294');
      setIsAgentTyping(false);
      setMessages((prev) => [...prev, res]);
      speakText(res.text);
    } catch (e) {
      setIsAgentTyping(false);
      const fallback = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: "Your vitals (BP 118/78, Heart Rate 74 bpm) and lab values are normal. Please verify any penicillin-class medications with Dr. Michael Chen.",
        urgency: 'caution',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallback]);
      speakText(fallback.text);
    }
  };

  const handlePrint = () => {
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
    setTimeout(() => window.print(), 350);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(inputPatientId, inputPin);
      setPatient(res.patient);
      setShowLoginModal(false);
      refreshData(res.patient.patient_id);
    } catch (e) {
      setShowLoginModal(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newName,
        age: parseInt(newAge) || 32,
        blood_group: newBlood,
        allergies: ['Penicillin']
      };
      const res = await api.signup(payload);
      setPatient(res.patient);
      setShowSignUpModal(false);
      refreshData(res.patient.patient_id);
    } catch (e) {
      setShowSignUpModal(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-800 font-sans flex flex-col items-center">
      
      {/* TOP SYSTEM & CONTROL BAR */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-white z-40 shadow-lg">
        {/* Brand & Connection Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#297006] flex items-center justify-center font-extrabold text-white text-base shadow-sm border border-[#808080]">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm tracking-wide">MediKiosk All-in-One Portal</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Django REST API :8000
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Unified Medical Screen • Mobile & Kiosk Optimized</p>
          </div>
        </div>

        {/* Layout & Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setLayoutMode('dashboard')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition ${
                layoutMode === 'dashboard' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>All-In-One Screen</span>
            </button>
            <button
              onClick={() => setLayoutMode('mobile-preview')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition ${
                layoutMode === 'mobile-preview' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Phone Frame</span>
            </button>
            <button
              onClick={() => setLayoutMode('compare')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition ${
                layoutMode === 'compare' ? 'bg-[#ff9800] text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>4 Mockups Compare</span>
            </button>
          </div>

          <button
            onClick={() => setShowNurseAlert(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nurse Call</span>
          </button>
        </div>
      </header>

      {/* MAIN UNIFIED SCREEN CONTENT */}
      <main className="w-full flex-1 p-3 sm:p-5 flex flex-col items-center justify-start overflow-x-hidden">
        
        {layoutMode === 'compare' ? (
          /* 4 Mockups Side-by-Side Reference Mode */
          <div className="w-full max-w-7xl py-3 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-amber-400">Original Uploaded Design Mockups (4 PDFs)</h3>
                <p className="text-xs text-slate-400">All 4 screens have been unified into the live interactive portal below</p>
              </div>
              <button
                onClick={() => setLayoutMode('dashboard')}
                className="px-4 py-2 bg-[#297006] text-white font-bold text-xs rounded-xl hover:bg-[#205905] transition"
              >
                Back to Live Unified Portal →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: '1. Login Screen', src: '/reference/login.png' },
                { name: '2. Doc Scanner', src: '/reference/doc.png' },
                { name: '3. Medical Summary', src: '/reference/summary.png' },
                { name: '4. Agent Window', src: '/reference/agent.png' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900 rounded-3xl p-3 border border-slate-800 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-300 mb-2">{item.name}</span>
                  <div className="w-full aspect-[9/15] bg-black rounded-2xl overflow-hidden border-2 border-slate-700">
                    <img src={item.src} alt={item.name} className="w-full h-full object-cover object-top" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* THE UNIFIED PORTAL CONTAINER */
          <div
            className={`w-full transition-all duration-300 ${
              layoutMode === 'mobile-preview'
                ? 'max-w-[420px] bg-[#cbf5d6] rounded-[48px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[10px] border-slate-900 p-3 my-2'
                : 'max-w-7xl bg-[#cbf5d6] rounded-3xl shadow-2xl border-4 border-slate-800 p-4 md:p-6'
            }`}
          >
            {/* 1. WELCOME & PATIENT IDENTITY SECTION (From LoginScreen.pdf) */}
            <div className="w-full bg-white rounded-3xl p-4 md:p-5 shadow-sm border border-[#297006]/20 mb-5 flex flex-wrap items-center justify-between gap-4">
              
              {/* MediKiosk Brand Pill Badge - Exactly matches LoginScreen.pdf */}
              <div className="flex items-center gap-3.5">
                <div className="py-2 px-5 rounded-full bg-[#297006] border-[2.5px] border-[#808080] shadow-md flex items-center justify-center">
                  <span className="text-xl md:text-2xl font-black text-white tracking-wide">
                    MediKiosk
                  </span>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-extrabold text-[#194703]">
                    Welcome To MediKiosk
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Smart Clinical Patient Kiosk Portal</p>
                </div>
              </div>

              {/* Patient Profile Chip & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2.5 bg-[#cbf5d6]/50 border border-[#297006]/30 px-3.5 py-1.5 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-[#297006] text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {patient?.name?.[0] || 'S'}
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-bold text-[#052e0a]">{patient?.name || 'Sarah Jenkins'}</div>
                    <div className="text-[10px] text-gray-600 font-mono">ID: {patient?.patient_id || 'MK-78294'} • Blood: <strong className="text-[#297006]">{patient?.blood_group || 'A+'}</strong></div>
                  </div>
                </div>

                {/* Patient Switch / Check-In Button */}
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-3.5 py-2 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Check In / Switch</span>
                </button>

                {/* Print Summary Button */}
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-full bg-[#ff9800] hover:bg-[#f57c00] text-black font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Chart</span>
                </button>
              </div>
            </div>

            {/* Mobile Jump Anchors (Visible on mobile/narrow layout) */}
            <div className="flex md:hidden items-center justify-around bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-[#297006]/20 mb-4 text-xs font-bold">
              <a href="#section-summary" className="px-3 py-1 rounded-xl text-[#052e0a] hover:bg-[#cbf5d6]">
                1. Summary
              </a>
              <a href="#section-scanner" className="px-3 py-1 rounded-xl text-[#3f51b5] hover:bg-blue-50">
                2. Scanner
              </a>
              <a href="#section-agent" className="px-3 py-1 rounded-xl text-[#ff9800] hover:bg-amber-50">
                3. AI Agent
              </a>
            </div>

            {/* 2. THE THREE UNIFIED COLUMNS ON ONE SCREEN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* ============================================================
                  COLUMN 1: MEDICAL SUMMARY & VITALS (From MedicalSummary.pdf)
                  ============================================================ */}
              <div id="section-summary" className="lg:col-span-4 bg-white rounded-3xl p-4 shadow-md border border-[#297006]/20 space-y-4 flex flex-col justify-between">
                
                {/* Medical Summary Header Banner - Matches MedicalSummary.pdf */}
                <div className="w-full bg-[#00bcd4] -mt-4 -mx-4 w-[calc(100%+2rem)] p-3 rounded-t-3xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#ff9800] text-black font-extrabold text-xs shadow-xs">
                      Summary
                    </span>
                    <span className="text-white text-xs font-bold">Patient Clinical Chart</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#ff9800] ring-2 ring-white/60 flex items-center justify-center font-bold text-xs text-black">
                    {patient?.name?.[0] || 'S'}
                  </div>
                </div>

                {/* Iconic Medical Summary Green Badge */}
                <div className="w-full py-2.5 px-4 rounded-2xl bg-[#297006] shadow-sm flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-wide leading-tight">
                    Medical Summary
                  </h3>
                </div>

                {/* Known Allergy Alert */}
                <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Allergies:</span>
                    <span className="bg-rose-200/70 text-rose-900 px-2 py-0.5 rounded-md font-extrabold">
                      {Array.isArray(patient?.allergies) ? patient.allergies.join(', ') : 'Penicillin'}
                    </span>
                  </div>
                  <button
                    onClick={handleSimulateVitals}
                    disabled={isUpdatingVitals}
                    className="text-[10px] font-bold text-[#297006] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isUpdatingVitals ? 'animate-spin' : ''}`} />
                    <span>Measure</span>
                  </button>
                </div>

                {/* Live Kiosk Vitals Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#052e0a]">
                    <span className="flex items-center gap-1">
                      <Activity className="w-4 h-4 text-[#297006]" />
                      <span>Live Kiosk Vitals</span>
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-[#297006] px-2 py-0.5 rounded-full">
                      Django Synced
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 block">Pulse</span>
                        <span className="text-base font-black text-[#052e0a]">{vitals?.heart_rate || 74} <small className="font-normal text-xs text-gray-500">bpm</small></span>
                      </div>
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                    </div>

                    <div className="p-2.5 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 block">Blood Pressure</span>
                        <span className="text-base font-black text-[#052e0a]">{vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}</span>
                      </div>
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>

                    <div className="p-2.5 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 block">SpO2 Oxygen</span>
                        <span className="text-base font-black text-[#052e0a]">{vitals?.spo2 || 99}%</span>
                      </div>
                      <Droplet className="w-4 h-4 text-teal-600" />
                    </div>

                    <div className="p-2.5 rounded-2xl bg-[#cbf5d6]/40 border border-[#297006]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 block">Temperature</span>
                        <span className="text-base font-black text-[#052e0a]">{vitals?.temperature || 98.4}°F</span>
                      </div>
                      <Thermometer className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                </div>

                {/* Active Medications with Checkoff */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#052e0a]">
                    <span className="flex items-center gap-1">
                      <Pill className="w-4 h-4 text-[#297006]" />
                      <span>Daily Medications ({medications.length})</span>
                    </span>
                    <span className="text-[10px] text-gray-500">Tap to Check Off</span>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {medications.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMed(m.id)}
                        className={`p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-xs ${
                          m.taken_today
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 line-through opacity-75'
                            : 'bg-gray-50 hover:bg-[#cbf5d6]/30 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            m.taken_today ? 'bg-[#297006] text-white' : 'border-2 border-gray-300 text-transparent'
                          }`}>
                            ✓
                          </span>
                          <div>
                            <span className="font-bold text-gray-900">{m.name}</span> <span className="text-gray-500 text-[10px]">({m.dose})</span>
                            <p className="text-[10px] text-gray-500 font-normal">{m.timing}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-[#cbf5d6] text-[#052e0a] px-2 py-0.5 rounded-full">
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scanned Reports History Thumbnails */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs font-bold text-[#052e0a] mb-2">
                    <span>Scanned Records ({documents.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {documents.slice(0, 2).map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setShowDocModal(d)}
                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-xs flex items-center justify-between cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-[#3f51b5] shrink-0" />
                          <span className="font-bold truncate text-gray-800">{d.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#297006] font-bold shrink-0">{d.confidence}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ============================================================
                  COLUMN 2: OPTICAL DOCUMENT SCANNER (From DocScanner.pdf)
                  ============================================================ */}
              <div id="section-scanner" className="lg:col-span-4 bg-white rounded-3xl p-4 shadow-md border border-[#297006]/20 space-y-4 flex flex-col justify-between">
                
                {/* Scanner Header - Matches DocScanner.pdf Royal Blue */}
                <div className="w-full bg-[#3f51b5] -mt-4 -mx-4 w-[calc(100%+2rem)] p-3 rounded-t-3xl flex items-center justify-between text-white shadow-xs">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs font-bold">Optical Document Scanner</span>
                  </div>
                  <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full">300 DPI</span>
                </div>

                {/* Dual Buttons: Scan & Upload - Exactly matches DocScanner.pdf */}
                <div className="flex items-center justify-center gap-4 py-1">
                  <button
                    onClick={() => {
                      setScannerAction('scan');
                      handleStartScan(presetTemplates[0]);
                    }}
                    className={`flex-1 py-2.5 rounded-full font-bold text-lg tracking-wide shadow-sm transition cursor-pointer flex items-center justify-center ${
                      scannerAction === 'scan'
                        ? 'bg-[#297006] text-black ring-2 ring-black/30 scale-102'
                        : 'bg-[#297006] text-black hover:bg-[#236005] opacity-90'
                    }`}
                  >
                    Scan
                  </button>

                  <button
                    onClick={() => {
                      setScannerAction('upload');
                      fileInputRef.current?.click();
                    }}
                    className={`flex-1 py-2.5 rounded-full font-bold text-lg tracking-wide shadow-sm transition cursor-pointer flex items-center justify-center ${
                      scannerAction === 'upload'
                        ? 'bg-[#297006] text-black ring-2 ring-black/30 scale-102'
                        : 'bg-[#297006] text-black hover:bg-[#236005] opacity-90'
                    }`}
                  >
                    Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Central Royal Blue Viewfinder - Matches DocScanner.pdf */}
                <div className="relative w-full h-[280px] rounded-3xl bg-[#3f51b5] shadow-inner overflow-hidden flex flex-col justify-between p-3 border-2 border-[#303f9f]">
                  {/* Viewfinder Status */}
                  <div className="flex items-center justify-between text-white/90 text-xs font-semibold z-20">
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-0.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-[10px]">{isScanning ? 'OCR Processing...' : 'Optical Camera Active'}</span>
                    </div>
                    <span className="text-[9px] opacity-75">Auto-Border Detect</span>
                  </div>

                  {/* Corner Reticles */}
                  <div className="absolute inset-3 pointer-events-none z-10">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-white/80 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-white/80 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-white/80 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-white/80 rounded-br-lg"></div>
                  </div>

                  {/* Animated Laser Scan Beam */}
                  {isScanning && <div className="laser-line z-20"></div>}

                  {/* Viewfinder Screen Content */}
                  <div className="relative my-auto w-full h-[175px] bg-white/10 rounded-2xl border border-white/20 p-2.5 flex flex-col items-center justify-center text-center overflow-hidden">
                    {isScanning ? (
                      <div className="space-y-2 flex flex-col items-center z-20 animate-fade-in">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white animate-pulse">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-white font-bold text-xs">Parsing Document OCR...</span>
                        <div className="w-36 bg-black/40 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-400 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${scanProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-white/80 font-mono">{scanProgress}%</span>
                      </div>
                    ) : scannedDocResult ? (
                      <div className="w-full h-full bg-white text-gray-900 rounded-xl p-2.5 flex flex-col justify-between text-left text-xs shadow-inner overflow-y-auto z-20">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[#297006] uppercase text-[9px]">{scannedDocResult.doc_type}</span>
                            <span className="text-emerald-700 font-bold text-[9px] flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Synced to Django
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-gray-900 truncate">{scannedDocResult.title}</h5>
                          <p className="text-[10px] text-gray-500">{scannedDocResult.doctor} • {scannedDocResult.facility}</p>
                        </div>
                        <div className="bg-emerald-50 p-1.5 rounded-lg text-[10px] text-[#052e0a]">
                          <strong className="block text-gray-700">Diagnosis:</strong>
                          <p className="line-clamp-2">{scannedDocResult.diagnosis}</p>
                        </div>
                        <div className="flex justify-between items-center text-[9px] pt-1 border-t border-gray-100">
                          <span className="font-mono text-gray-500">Confidence: {scannedDocResult.confidence}</span>
                          <button
                            onClick={() => handleStartScan(presetTemplates[0])}
                            className="text-[#297006] font-bold hover:underline"
                          >
                            Re-Scan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col items-center text-white/90 z-10">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-white/90 font-medium">Position document inside viewfinder</p>
                        <button
                          onClick={() => handleStartScan(presetTemplates[0])}
                          className="px-3.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[10px] shadow-xs flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Start Live Scan & OCR</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-white/75 text-center z-20">
                    Resolution: 300 DPI Medical OCR
                  </div>
                </div>

                {/* Allergy Contraindication Alert (if antibiotic scanned) */}
                {allergyAlert && (
                  <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-md flex items-start gap-2 animate-bounce text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">⚠️ Drug Allergy Warning!</strong>
                      <span className="text-[11px] text-rose-100 leading-tight">
                        Scanned medication contains Amoxicillin. Patient has a Penicillin allergy.
                      </span>
                    </div>
                  </div>
                )}

                {/* Preset 1-Click Medical Document Test Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#052e0a] block">Quick Test Records (Django OCR):</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {presetTemplates.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleStartScan(item)}
                        className="p-1.5 bg-gray-50 hover:bg-[#cbf5d6]/40 active:scale-95 text-left rounded-xl border border-gray-200 text-xs flex flex-col justify-between h-16 transition"
                      >
                        <span className="font-bold text-[10px] text-[#052e0a] line-clamp-1">{item.doc_type}</span>
                        <span className="text-[9px] text-gray-500 line-clamp-1">{item.title}</span>
                        <span className="text-[8px] font-bold text-[#297006]">Scan →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ============================================================
                  COLUMN 3: CLINICAL AI HEALTH AGENT (From AgentWindow.pdf)
                  ============================================================ */}
              <div id="section-agent" className="lg:col-span-4 bg-white rounded-3xl p-4 shadow-md border border-[#297006]/20 space-y-3 flex flex-col justify-between h-full min-h-[580px]">
                
                {/* Agent Header - Matches AgentWindow.pdf Royal Blue, Orange Square & Circle */}
                <div className="w-full bg-[#3f51b5] -mt-4 -mx-4 w-[calc(100%+2rem)] p-3 rounded-t-3xl flex items-center justify-between text-white shadow-xs">
                  {/* Left Orange Square Icon */}
                  <div className="w-6 h-6 rounded-md bg-[#ff9800] flex items-center justify-center text-black font-black text-xs shadow-xs">
                    M
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Bot className="w-4 h-4 text-emerald-300" />
                    <span>AI Clinical Doctor Agent</span>
                  </div>

                  {/* Right Orange Circle Icon */}
                  <button
                    onClick={() => {
                      if (isSpeaking) window.speechSynthesis.cancel();
                      setVoiceMuted(!voiceMuted);
                    }}
                    className="w-6 h-6 rounded-full bg-[#ff9800] ring-2 ring-white/60 flex items-center justify-center text-black text-xs shadow-xs"
                    title={voiceMuted ? "Unmute Voice" : "Mute Voice"}
                  >
                    {voiceMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>

                {/* Agent Chat Message Stream */}
                <div className="flex-1 w-full max-h-[380px] overflow-y-auto space-y-2.5 p-1 pr-1.5">
                  {messages.map((msg) => {
                    const isAgent = msg.sender === 'agent';
                    const isAlert = msg.urgency === 'alert';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
                      >
                        <div className="flex items-end gap-1.5 max-w-[90%]">
                          {isAgent && (
                            <div className="w-6 h-6 rounded-full bg-[#052e0a] text-white flex items-center justify-center shrink-0 text-[10px]">
                              <Bot className="w-3 h-3 text-emerald-300" />
                            </div>
                          )}

                          <div
                            className={`p-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isAlert
                                ? 'bg-rose-50 text-rose-900 border border-rose-400 rounded-bl-xs'
                                : isAgent
                                ? 'bg-gray-50 text-gray-900 border border-gray-200 rounded-bl-xs'
                                : 'bg-[#052e0a] text-white rounded-br-xs'
                            }`}
                          >
                            {isAlert && (
                              <div className="flex items-center gap-1 font-bold text-rose-700 text-[10px] mb-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>ALLERGY CONTRAINDICATION</span>
                              </div>
                            )}
                            <p className="whitespace-pre-line">{msg.text}</p>
                            <span className={`block text-[8px] text-right mt-1 ${isAgent ? 'text-gray-400' : 'text-white/60'}`}>
                              {msg.time || '10:00 AM'}
                            </span>
                          </div>

                          {!isAgent && (
                            <div className="w-6 h-6 rounded-full bg-[#ff9800] text-black font-bold flex items-center justify-center shrink-0 text-[10px]">
                              {patient?.name?.[0] || 'U'}
                            </div>
                          )}
                        </div>

                        {/* Quick Prompt Chips */}
                        {isAgent && msg.quick_replies && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-7">
                            {msg.quick_replies.map((qr, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendChat(qr)}
                                className="px-2 py-0.5 bg-[#cbf5d6]/50 hover:bg-[#cbf5d6] text-[#052e0a] text-[9px] font-bold rounded-full border border-[#297006]/30 transition active:scale-95"
                              >
                                {qr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isAgentTyping && (
                    <div className="flex items-center gap-1.5 text-xs text-[#052e0a] font-medium p-1.5 bg-emerald-50 rounded-xl w-fit">
                      <Bot className="w-3.5 h-3.5 text-[#297006] animate-spin" />
                      <span className="text-[10px]">Django Clinical AI is thinking...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Bottom Royal Blue Prompt Bar - Exactly matches AgentWindow.pdf */}
                <div className="w-full pt-2">
                  <div className="w-full rounded-full bg-[#3f51b5] shadow-lg p-1 px-2.5 flex items-center gap-2 border-2 border-[#303f9f] focus-within:ring-2 focus-within:ring-[#ff9800]">
                    {/* Microphone */}
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-300'
                          : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Chat Input */}
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder={isListening ? "Listening to voice..." : "Ask your AI Doctor..."}
                      className="flex-1 bg-transparent text-white placeholder-white/70 text-xs font-medium focus:outline-none px-1"
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendChat()}
                      disabled={!chatInput.trim()}
                      className="w-8 h-8 rounded-full bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 disabled:opacity-40 text-black font-bold flex items-center justify-center transition shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* LOGIN & PATIENT SWITCH MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-[#297006] relative">
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-[#052e0a] mb-1">New Patient Registration</h3>
            <p className="text-xs text-gray-500 mb-4">Creates a record in Django database</p>

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

      {/* DOCUMENT DETAIL MODAL */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border-4 border-[#297006] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="font-bold text-sm text-gray-900 truncate">{showDocModal.title}</h4>
              <button
                onClick={() => setShowDocModal(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Provider</span>
                  <p className="font-semibold text-gray-800">{showDocModal.doctor}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Facility</span>
                  <p className="font-semibold text-gray-800">{showDocModal.facility}</p>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Extracted Clinical Content</span>
                <pre className="mt-1 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl whitespace-pre-wrap leading-relaxed">
                  {showDocModal.extracted_text}
                </pre>
              </div>
            </div>

            <button
              onClick={() => {
                const title = showDocModal.title;
                setShowDocModal(null);
                handleSendChat(`Explain this report: ${title}`);
              }}
              className="w-full py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ask AI Doctor to Explain This Report</span>
            </button>
          </div>
        </div>
      )}

      {/* NURSE ASSISTANCE MODAL */}
      {showNurseAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl border-4 border-[#ff9800] text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-[#ff9800] mx-auto flex items-center justify-center mb-2">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Nurse Call Activated</h4>
            <p className="text-xs text-gray-600 my-2">Station #04 alert dispatched to the cardiology wing.</p>
            <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl text-xs font-semibold mb-3">
              Nurse Station ETA: ~60s
            </div>
            <button
              onClick={() => setShowNurseAlert(false)}
              className="w-full py-2 rounded-full bg-[#052e0a] text-white font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
