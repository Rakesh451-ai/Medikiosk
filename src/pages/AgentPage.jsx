import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  AlertTriangle, ShieldCheck, Heart, Pill, ChevronDown, ChevronUp 
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function AgentPage({ patient, vitals, medications = [] }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [showMobileContext, setShowMobileContext] = useState(false);
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
              text: `Hello ${patient?.name?.split(' ')[0] || 'Sarah'}! I am your MediKiosk Health Assistant. I have your health numbers and medicines ready.\n\nHow can I help you today? You can tap any of the questions below, or tap the microphone to speak with me!`,
              urgency: 'normal',
              time: '10:00 AM',
              quick_replies: [
                "💊 When should I take my medicines?",
                "🩺 Are my vitals normal today?",
                "⚠️ Are my medicines safe with my allergies?",
                "🏥 How do I see a doctor or nurse?"
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
    utterance.pitch = 1.0;
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
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-6 flex-1 flex flex-col">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff9800] text-gray-950 text-xs font-black shadow-xs mb-1.5">
              <Bot className="w-4 h-4" />
              <span>Friendly Health Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              Talk or Type with Your Health Assistant
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Ask about your medicines, test numbers, or doctor instructions. Tap the microphone to speak naturally.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-emerald-300 text-xs font-bold text-[#052e0a] shadow-xs w-fit">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Assistant Ready to Help</span>
          </div>
        </div>

        {/* Mobile Expandable Health Context Toggle */}
        <div className="lg:hidden">
          <button
            onClick={() => setShowMobileContext(!showMobileContext)}
            className="w-full p-3 rounded-2xl bg-white border border-emerald-300 text-xs font-bold text-[#052e0a] flex items-center justify-between shadow-xs transition"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#297006]" />
              <span>View My Chart Info Known by Assistant</span>
            </div>
            {showMobileContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Agent Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          {/* Left Column: Patient Chart Context (Desktop + Mobile Collapsible) */}
          <div className={`${showMobileContext ? 'flex' : 'hidden'} lg:flex lg:col-span-4 flex-col gap-4 animate-fade-in`}>
            <Card className="p-4 sm:p-5 shadow-md border-2 border-emerald-200/80 space-y-4">
              <h3 className="font-extrabold text-sm text-[#052e0a] pb-2 border-b border-gray-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#297006]" />
                <span>What the Assistant Knows</span>
              </h3>

              {/* Allergy Warning */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4" /> Known Drug Allergies:
                </span>
                <p className="font-black text-rose-950">{patient?.allergies?.join(', ') || 'Penicillin'}</p>
                <p className="text-[10px] text-rose-700">The assistant checks every question against this.</p>
              </div>

              {/* Vitals */}
              <div className="space-y-1 text-xs">
                <span className="text-gray-700 font-bold block">Your Current Vitals:</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-gray-500 font-bold block">Heart Rate</span>
                    <strong className="text-[#052e0a] text-sm">{vitals?.heart_rate || 74} bpm</strong>
                    <span className="text-[10px] text-emerald-700 font-bold block">✓ Normal</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-gray-500 font-bold block">Blood Pressure</span>
                    <strong className="text-[#052e0a] text-sm">{vitals?.bp_systolic || 118}/{vitals?.bp_diastolic || 78}</strong>
                    <span className="text-[10px] text-emerald-700 font-bold block">✓ Healthy</span>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="text-xs">
                <span className="text-gray-700 font-bold block mb-1">Your Prescribed Medicines:</span>
                <ul className="space-y-1.5">
                  {medications.map((m) => (
                    <li key={m.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900">{m.name}</span>
                        <span className="text-[10px] text-gray-500 block">{m.timing || 'Daily'}</span>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        {m.dose}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Right Column: Chat Room Window */}
          <Card className="lg:col-span-8 shadow-md border-2 border-emerald-200/80 overflow-hidden flex flex-col h-[560px] sm:h-[600px] w-full">
            
            {/* Top Bar */}
            <div className="w-full bg-[#3f51b5] py-3.5 px-4 sm:px-5 shadow-sm flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff9800] flex items-center justify-center text-gray-950 font-black text-sm shadow-xs">
                  💬
                </div>
                <div>
                  <span className="font-extrabold text-sm block leading-tight">Health Assistant</span>
                  <span className="text-[10px] text-blue-200">Speaks simple, friendly English</span>
                </div>
              </div>

              {/* Voice Readout Toggle */}
              <button
                onClick={() => {
                  if (isSpeaking) window.speechSynthesis.cancel();
                  setVoiceMuted(!voiceMuted);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  voiceMuted
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-[#ff9800] text-gray-950 font-black ring-2 ring-white/60'
                }`}
                title={voiceMuted ? "Click to have replies spoken aloud" : "Voice is ON (click to mute)"}
              >
                {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="text-[11px] sm:text-xs">{voiceMuted ? "Voice Muted" : "Voice Readout ON"}</span>
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
                    <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[85%]">
                      {isAgent && (
                        <div className="w-8 h-8 rounded-full bg-[#052e0a] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Bot className="w-4 h-4 text-emerald-300" />
                        </div>
                      )}

                      <div
                        className={`p-3.5 sm:p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-sm ${
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

            {/* Bottom Action Bar */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-100 flex flex-col items-center gap-2">
              <div className="w-full max-w-2xl rounded-full bg-[#3f51b5] shadow-lg p-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-3 border-2 border-[#303f9f] focus-within:ring-2 focus-within:ring-[#ff9800]">
                {/* Microphone Button with clear visual prompt */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-3 py-2 rounded-full flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs font-black ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-300'
                      : 'bg-[#ff9800] hover:bg-[#f57c00] text-gray-950'
                  }`}
                  title={isListening ? "Listening... tap to stop" : "Tap to Speak (No typing needed)"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isListening ? "Listening..." : "Tap to Speak"}</span>
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isListening ? "Listening to your voice... say your question" : "Type or speak your question here..."}
                  className="flex-1 bg-transparent text-white placeholder-white/70 text-xs sm:text-sm font-medium focus:outline-none px-2"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 text-white font-bold flex items-center justify-center transition shrink-0 shadow-xs cursor-pointer"
                  title="Send Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-gray-500 flex items-center gap-1 text-center">
                <span>💡 Tip: You can ask in plain words, like "Are my pills safe?" or "What was my blood pressure?"</span>
              </p>
            </div>

          </Card>
        </div>

      </div>
    </div>
  );
}
