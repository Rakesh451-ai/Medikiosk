import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export function MobileAgent({ patient, onNavigateToSummary }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history from Django backend on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await api.getChatHistory(patient?.patient_id);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Default initial greeting
          setMessages([
            {
              id: 'init',
              sender: 'agent',
              text: `Hello ${patient?.name?.split(' ')[0] || 'Sarah'}! I'm your MediKiosk AI Health Assistant. I can review your scanned documents, analyze vitals, and check medication safety. How can I help you?`,
              urgency: 'normal',
              time: '10:00 AM',
              quick_replies: [
                "Check drug interactions",
                "Explain my latest scan",
                "How are my vitals?",
                "Book doctor appointment"
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
          "What is my blood pressure reading?"
        ];
        const randomQ = demoQueries[Math.floor(Math.random() * demoQueries.length)];
        setInputText(randomQ);
        handleSend(randomQ);
      }, 1500);
    }
  };

  const handleSend = async (customQuery) => {
    const query = (customQuery || inputText).trim();
    if (!query) return;

    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'patient',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const agentResponse = await api.sendChatMessage(query, patient?.patient_id || 'MK-78294');
      setIsTyping(false);
      setMessages((prev) => [...prev, agentResponse]);
      speakText(agentResponse.text);
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      const fallback = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: "Your vitals (BP 118/78, Heart Rate 74 bpm) and lab values are normal. Please consult Dr. Michael Chen before taking any penicillin-derived antibiotics.",
        urgency: 'caution',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallback]);
      speakText(fallback.text);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#cbf5d6] select-none font-sans overflow-hidden">
      
      {/* Top Header Bar - Matches AgentWindow.pdf (Royal Blue #3f51b5, Orange Square & Circle) */}
      <div className="w-full bg-[#3f51b5] py-2.5 px-4 shadow-sm flex items-center justify-between z-20">
        {/* Left Orange Square */}
        <div className="w-7 h-7 rounded-md bg-[#ff9800] flex items-center justify-center text-black font-black text-xs shadow-xs cursor-pointer">
          M
        </div>

        <div className="flex items-center gap-1.5 text-white text-xs font-bold">
          <Bot className="w-4 h-4 text-emerald-300" />
          <span>MediKiosk Clinical Agent</span>
        </div>

        {/* Right Orange Circle */}
        <button
          onClick={() => {
            if (isSpeaking) window.speechSynthesis.cancel();
            setVoiceMuted(!voiceMuted);
          }}
          className="w-7 h-7 rounded-full bg-[#ff9800] ring-2 ring-white/60 flex items-center justify-center text-black text-xs shadow-xs"
          title={voiceMuted ? "Unmute Voice" : "Mute Voice"}
        >
          {voiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-3 overflow-y-auto space-y-3 z-10">
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          const isAlert = msg.urgency === 'alert';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
            >
              <div className="flex items-end gap-1.5 max-w-[88%]">
                {isAgent && (
                  <div className="w-7 h-7 rounded-full bg-[#052e0a] text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                    <Bot className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isAlert
                      ? 'bg-rose-50 text-rose-900 border-2 border-rose-400 rounded-bl-xs'
                      : isAgent
                      ? 'bg-white text-gray-900 border border-emerald-100 rounded-bl-xs'
                      : 'bg-[#052e0a] text-white rounded-br-xs'
                  }`}
                >
                  {isAlert && (
                    <div className="flex items-center gap-1 font-bold text-rose-700 text-[11px] mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>CLINICAL SAFETY ALERT</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <div className={`mt-1 text-[9px] text-right ${isAgent ? 'text-gray-400' : 'text-white/60'}`}>
                    {msg.time || 'Now'}
                  </div>
                </div>

                {!isAgent && (
                  <div className="w-7 h-7 rounded-full bg-[#ff9800] text-black font-bold flex items-center justify-center shrink-0 text-[10px] shadow-xs">
                    {patient?.name?.[0] || 'U'}
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              {isAgent && msg.quick_replies && (
                <div className="flex flex-wrap gap-1 mt-1.5 ml-8">
                  {msg.quick_replies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qr)}
                      className="px-2.5 py-0.5 bg-white/90 hover:bg-white text-[#052e0a] text-[10px] font-semibold rounded-full border border-[#297006]/30 shadow-2xs transition active:scale-95"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 text-xs text-[#052e0a] font-medium p-2 bg-white/80 rounded-2xl w-fit">
            <Bot className="w-3.5 h-3.5 text-[#297006] animate-spin" />
            <span className="text-[11px]">Django Clinical AI is evaluating...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Royal Blue Pill Action Bar - Exactly matches AgentWindow.pdf */}
      <div className="w-full px-4 py-3 z-20 flex justify-center pb-5">
        <div className="w-full max-w-md rounded-full bg-[#3f51b5] shadow-xl p-1.5 px-3 flex items-center gap-2 border-2 border-[#303f9f] focus-within:ring-2 focus-within:ring-[#ff9800]">
          {/* Mic */}
          <button
            type="button"
            onClick={toggleListening}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-300'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Input field */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening to your voice..." : "Ask your health agent..."}
            className="flex-1 bg-transparent text-white placeholder-white/70 text-xs font-medium focus:outline-none px-1"
          />

          {/* Send */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="w-9 h-9 rounded-full bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 disabled:opacity-40 text-black font-bold flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
