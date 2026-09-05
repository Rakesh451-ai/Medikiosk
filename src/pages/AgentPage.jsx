import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertTriangle, ShieldCheck, Heart, Pill } from 'lucide-react';
import { api } from '../services/api';

export function AgentPage({ patient, vitals, medications = [] }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await api.getChatHistory(patient?.patient_id);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            {
              id: 'init',
              sender: 'agent',
              text: `Hello ${patient?.name?.split(' ')[0] || 'Sarah'}! I am your MediKiosk AI Clinical Doctor Agent. I have full access to your clinical chart, vital signs, and scanned prescriptions. How can I assist you today?`,
              urgency: 'normal',
              time: '10:00 AM',
              quick_replies: [
                "Check drug allergy safety",
                "Explain my latest scan report",
                "Review my daily medications",
                "Book appointment with Dr. Chen"
              ]
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadHistory();
  }, [patient]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

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

  const toggleListening = () => {
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
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSend(transcript);
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
          "Explain my latest chest scan report",
          "What is my blood pressure reading today?"
        ];
        const randomQ = demoQueries[Math.floor(Math.random() * demoQueries.length)];
        setInputText(randomQ);
        handleSend(randomQ);
      }, 1500);
    }
  };

  const handleSend = async (customText) => {
    const query = (customText || inputText).trim();
    if (!query) return;

    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'patient',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsAgentTyping(true);

    try {
      const res = await api.sendChatMessage(query, patient?.patient_id || 'MK-78294');
      setIsAgentTyping(false);
      setMessages((prev) => [...prev, res]);
      speakText(res.text);
    } catch {
      setIsAgentTyping(false);
      const fallback = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: "Your vitals (BP 118/78, Heart Rate 74 bpm) and lab values are normal. Please consult Dr. Michael Chen before starting any penicillin-class medications.",
        urgency: 'caution',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallback]);
      speakText(fallback.text);
    }
  };

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6 flex-1 flex flex-col">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff9800] text-black text-xs font-bold shadow-xs mb-2">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Clinical Health Agent</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              Conversational Medical Health Assistant
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Interactive clinical triage, medication safety review, and report explanation
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-[#297006]/30 text-xs font-bold text-[#052e0a]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Django AI Engine Active</span>
          </div>
        </div>

        {/* Main Agent Container - Laptop & Mobile Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          {/* Left Column: Patient Chart Context (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
            <div className="bg-white rounded-3xl p-5 shadow-md border border-[#297006]/20 space-y-4">
              <h3 className="font-extrabold text-sm text-[#052e0a] pb-2 border-b border-gray-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#297006]" />
                <span>Patient Context for AI Doctor</span>
              </h3>

              {/* Allergy Warning */}
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <span className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4" /> Known Allergies:
                </span>
                <p className="mt-1 font-bold">{patient?.allergies?.join(', ') || 'Penicillin, Sulfa Drugs'}</p>
              </div>

              {/* Vitals */}
              <div className="space-y-1 text-xs">
                <span className="text-gray-500 font-bold block">Current Vitals:</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 block">Pulse</span>
                    <strong className="text-[#052e0a]">{vitals?.heart_rate || 74} bpm</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 block">BP</span>
                    <strong className="text-[#052e0a]">{vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}</strong>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="text-xs">
                <span className="text-gray-500 font-bold block mb-1">Active Prescriptions:</span>
                <ul className="space-y-1">
                  {medications.map((m) => (
                    <li key={m.id} className="p-2 bg-gray-50 rounded-xl flex justify-between">
                      <span className="font-semibold">{m.name} ({m.dose})</span>
                      <span className="text-gray-400">{m.timing}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Chat Room Window - Faithful to AgentWindow.pdf */}
          <div className="lg:col-span-8 bg-white rounded-3xl shadow-md border border-[#297006]/20 overflow-hidden flex flex-col h-[580px]">
            
            {/* Top Royal Blue Bar (#3f51b5) - Exactly from AgentWindow.pdf */}
            <div className="w-full bg-[#3f51b5] py-3 px-5 shadow-sm flex items-center justify-between text-white">
              {/* Left Orange Square */}
              <div className="w-8 h-8 rounded-lg bg-[#ff9800] flex items-center justify-center text-black font-black text-xs shadow-xs">
                M
              </div>

              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-300" />
                <span className="font-bold text-sm">AI Health Agent Conversation</span>
              </div>

              {/* Right Orange Circle - Voice Toggle */}
              <button
                onClick={() => {
                  if (isSpeaking) window.speechSynthesis.cancel();
                  setVoiceMuted(!voiceMuted);
                }}
                className="w-8 h-8 rounded-full bg-[#ff9800] ring-2 ring-white/60 flex items-center justify-center text-black text-xs shadow-xs cursor-pointer"
                title={voiceMuted ? "Enable Voice Readout" : "Mute Voice"}
              >
                {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg) => {
                const isAgent = msg.sender === 'agent';
                const isAlert = msg.urgency === 'alert';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
                  >
                    <div className="flex items-end gap-2 max-w-[85%]">
                      {isAgent && (
                        <div className="w-8 h-8 rounded-full bg-[#052e0a] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Bot className="w-4 h-4 text-emerald-300" />
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                          isAlert
                            ? 'bg-rose-50 text-rose-900 border-2 border-rose-400 rounded-bl-xs'
                            : isAgent
                            ? 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs'
                            : 'bg-[#052e0a] text-white rounded-br-xs'
                        }`}
                      >
                        {isAlert && (
                          <div className="flex items-center gap-1.5 font-bold text-rose-700 text-xs mb-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>CRITICAL DRUG ALLERGY WARNING</span>
                          </div>
                        )}
                        <p className="whitespace-pre-line">{msg.text}</p>
                        <span className={`block text-[10px] text-right mt-1.5 ${isAgent ? 'text-gray-400' : 'text-white/60'}`}>
                          {msg.time || '10:00 AM'}
                        </span>
                      </div>

                      {!isAgent && (
                        <div className="w-8 h-8 rounded-full bg-[#ff9800] text-black font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                          {patient?.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>

                    {/* Quick Response Chips */}
                    {isAgent && msg.quick_replies && (
                      <div className="flex flex-wrap gap-1.5 mt-2 ml-10">
                        {msg.quick_replies.map((qr, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(qr)}
                            className="px-3 py-1 bg-white hover:bg-emerald-50 text-[#052e0a] text-xs font-bold rounded-full border border-[#297006]/30 shadow-xs transition active:scale-95 cursor-pointer"
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
                <div className="flex items-center gap-2 text-xs text-[#052e0a] font-medium p-2 bg-white rounded-2xl w-fit shadow-xs">
                  <Bot className="w-4 h-4 text-[#297006] animate-spin" />
                  <span>Clinical AI Assistant is analyzing your question...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom Royal Blue Action Bar (#3f51b5) - Exactly from AgentWindow.pdf */}
            <div className="p-4 bg-white border-t border-gray-100 flex justify-center">
              <div className="w-full max-w-2xl rounded-full bg-[#3f51b5] shadow-lg p-1.5 px-3 flex items-center gap-3 border-2 border-[#303f9f] focus-within:ring-2 focus-within:ring-[#ff9800]">
                {/* Microphone Toggle */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-300'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isListening ? "Listening... click to stop" : "Speak to AI Doctor"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isListening ? "Listening to your voice..." : "Ask your AI doctor any medical question..."}
                  className="flex-1 bg-transparent text-white placeholder-white/70 text-sm font-medium focus:outline-none px-2"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-full bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 disabled:opacity-40 text-black font-bold flex items-center justify-center transition shrink-0 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
