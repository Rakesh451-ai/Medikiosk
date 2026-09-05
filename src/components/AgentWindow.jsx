import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Bot, User, Sparkles, 
  AlertTriangle, ShieldCheck, RefreshCw, Pill, ArrowRight, CornerDownLeft 
} from 'lucide-react';
import { initialAgentMessages } from '../data/mockData';

export function AgentWindow({ patient, scannedDocs, onNavigateToSummary }) {
  const [messages, setMessages] = useState(initialAgentMessages);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Speech synthesis for agent response
  const speakText = (text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Speech recognition
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      // Fallback simulation
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const demoQueries = [
          "Explain my latest scan report",
          "Can you check if my medications are safe?",
          "When should I take my morning pills?"
        ];
        const randomQuery = demoQueries[Math.floor(Math.random() * demoQueries.length)];
        setInputText(randomQuery);
      }, 1800);
    }
  };

  const handleSendMessage = (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'patient',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // AI Medical Assistant Intelligence Engine
    setTimeout(() => {
      let agentReply = '';
      const lower = query.toLowerCase();

      if (lower.includes('scan') || lower.includes('report') || lower.includes('x-ray') || lower.includes('cbc')) {
        agentReply = `I've analyzed your scanned records. Your Chest X-Ray shows completely clear lung fields with normal cardiothoracic ratio. Your lipid panel is overall healthy, with HDL at 58 mg/dL. All vital signs at this kiosk are within target ranges.`;
      } else if (lower.includes('amoxicillin') || lower.includes('allergy') || lower.includes('safe') || lower.includes('penicillin')) {
        agentReply = `⚠️ Clinical Safety Alert: Your profile lists a known allergy to Penicillin. Amoxicillin belongs to the penicillin class. Please consult Dr. Michael Chen before ingesting this prescription to verify an alternative non-beta-lactam antibiotic!`;
      } else if (lower.includes('schedule') || lower.includes('take') || lower.includes('dose') || lower.includes('medication')) {
        agentReply = `According to your active medications:\n• Amoxicillin 500mg: 3x daily with meals (Every 8h)\n• Levocetirizine 5mg: 1x nightly at bedtime\n• Fluticasone: 2 sprays/nostril morning\nRemember to drink plenty of fluids.`;
      } else if (lower.includes('doctor') || lower.includes('appointment')) {
        agentReply = `Dr. Michael Chen has an open consultation slot tomorrow at 11:30 AM at Metro General Cardiology Suite 3B. Would you like me to reserve this kiosk check-in slot for you?`;
      } else {
        agentReply = `Thank you for your question. I am monitoring your vital signs (BP 118/78, Heart Rate 74 bpm, SpO2 99%). Your symptoms appear mild and stable. Let me know if you would like me to explain any specific medication or print a summary for your physician.`;
      }

      const replyMsg = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'agent',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: agentReply,
        quickReplies: [
          "Check drug interactions",
          "Explain my latest scan",
          "Print summary for doctor"
        ]
      };

      setMessages((prev) => [...prev, replyMsg]);
      setIsTyping(false);
      speakText(agentReply);
    }, 900);
  };

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col bg-[#cbf5d6] select-none font-sans overflow-hidden">
      
      {/* Voice Readout Banner */}
      <div className="w-full px-4 py-1 bg-[#cbf5d6] flex items-center justify-between text-[11px] text-[#052e0a]/80 border-b border-[#297006]/10 z-10">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-[#297006]" />
          <span className="font-bold">MediKiosk Clinical AI Agent</span>
        </div>
        <button
          onClick={() => {
            if (isSpeaking) window.speechSynthesis.cancel();
            setVoiceEnabled(!voiceEnabled);
          }}
          className="flex items-center gap-1 hover:text-[#297006] font-semibold transition cursor-pointer"
        >
          {voiceEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#297006]" />
              <span>Voice Readout On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500">Voice Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-4 overflow-y-auto space-y-3 z-10">
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                {isAgent && (
                  <div className="w-8 h-8 rounded-full bg-[#052e0a] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4 text-emerald-300" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-3xl text-xs md:text-sm leading-relaxed shadow-sm ${
                    isAgent
                      ? 'bg-white text-gray-900 border border-emerald-100 rounded-bl-sm'
                      : 'bg-[#052e0a] text-white rounded-br-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <div
                    className={`mt-1 text-[10px] text-right ${
                      isAgent ? 'text-gray-400' : 'text-white/60'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>

                {!isAgent && (
                  <div className="w-8 h-8 rounded-full bg-[#ff9800] text-black font-bold flex items-center justify-center shrink-0 shadow-sm text-xs">
                    {patient?.name?.[0] || 'U'}
                  </div>
                )}
              </div>

              {/* Agent Quick Reply Chips */}
              {isAgent && msg.quickReplies && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-10">
                  {msg.quickReplies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qr)}
                      className="px-2.5 py-1 bg-white/90 hover:bg-white text-[#052e0a] hover:text-[#297006] text-[11px] font-semibold rounded-full border border-[#297006]/30 shadow-xs transition active:scale-95"
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
          <div className="flex items-center gap-2 text-xs text-[#052e0a] font-medium p-2 bg-white/80 rounded-2xl w-fit">
            <Bot className="w-4 h-4 text-[#297006] animate-spin" />
            <span>MediKiosk Agent is analyzing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Royal Blue Pill Action Bar - Faithfully matches AgentWindow.pdf */}
      <div className="w-full px-5 py-5 z-20 flex justify-center">
        <div className="w-full max-w-lg rounded-full bg-[#3f51b5] shadow-xl p-2 px-3 flex items-center gap-2 border-2 border-[#303f9f] transition-all focus-within:ring-2 focus-within:ring-[#ff9800]">
          
          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Listening... click to stop" : "Speak to Agent"}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-300'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input inside the Pill */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder={isListening ? "Listening to your voice..." : "Ask your health agent or type symptom..."}
            className="flex-1 bg-transparent text-white placeholder-white/70 text-sm font-medium focus:outline-none px-2 py-1"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#ff9800] text-black font-bold flex items-center justify-center transition shrink-0 shadow-sm cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
