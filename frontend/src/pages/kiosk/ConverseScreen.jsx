import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Send, HeartPulse, AlertTriangle, 
  CheckCircle, ArrowRight, Activity, Sparkles, Stethoscope, ChevronRight, FileText
} from 'lucide-react';
import { api } from '../../services/api';

export default function ConverseScreen({ patientSession, onComplete }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [suggestedAnswers, setSuggestedAnswers] = useState([]);
  const [currentStage, setCurrentStage] = useState('CHIEF_COMPLAINT');
  const [progressPercent, setProgressPercent] = useState(15);
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [draftData, setDraftData] = useState({});
  const [isAyushEnabled, setIsAyushEnabled] = useState(false);

  // ASR (Speech-to-Text) state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Initialize intake session on mount
  useEffect(() => {
    initSession();
    setupSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening]);

  const initSession = async (ayushMode = false) => {
    const sessionRes = await api.createIntakeSession({
      patientId: patientSession?.patientId || '',
      department: ayushMode ? 'AYUSH / Ayurveda Department' : 'General Medicine',
      language: patientSession?.language || 'en',
      isAyush: ayushMode
    });

    setSessionId(sessionRes.session_id);
    setCurrentStage(sessionRes.stage || 'CHIEF_COMPLAINT');
    setProgressPercent(sessionRes.progress_percent || 15);
    setSuggestedAnswers(sessionRes.suggested_answers || []);
    setIsAyushEnabled(ayushMode);

    const initialAiMsg = {
      id: 1,
      sender: 'ai',
      text: sessionRes.initial_prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialAiMsg]);

    // Read initial greeting aloud
    speak(sessionRes.initial_prompt);
  };

  // Real Web Speech API (ASR) setup for Chrome/Edge/modern browsers
  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = patientSession?.language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSendMessage(transcript, 'voice');
        }
      };
      recognitionRef.current = recognition;
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      // Fallback if browser doesn't support Web Speech API
      alert("Speech recognition is not natively supported in this browser. Please type or tap suggested answers.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
      }
    }
  };

  // Web Speech Synthesis (TTS)
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = patientSession?.language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend, inputMode = 'touch') => {
    const message = textToSend || inputText;
    if (!message.trim() || !sessionId) return;

    // Add patient message to UI
    const patientMsg = {
      id: Date.now(),
      sender: 'patient',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, patientMsg]);
    setInputText('');

    // Call Module A backend endpoint: POST /api/intake/sessions/{id}/message/
    const response = await api.sendIntakeSessionMessage(sessionId, message, inputMode);

    if (response) {
      setCurrentStage(response.stage);
      setProgressPercent(response.progress_percent);
      setSuggestedAnswers(response.ai_message?.suggested_answers || []);
      setDraftData(response.draft || {});

      if (response.flagged) {
        setIsFlagged(true);
        setFlagReason(response.flag_reason);
      }

      const aiReply = {
        id: response.ai_message?.id || Date.now() + 1,
        sender: 'ai',
        text: response.ai_message?.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiReply]);

      // Read AI answer aloud
      if (response.ai_message?.text) {
        speak(response.ai_message.text);
      }
    }
  };

  const toggleAyushMode = () => {
    const nextMode = !isAyushEnabled;
    setIsAyushEnabled(nextMode);
    initSession(nextMode);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 animate-fadeIn">
      {/* Subtle Conversational Progress Ribbon */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold text-slate-900">
                Stage 2: Conversational History Intake
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                SOCRATES Framework
              </span>
              {isAyushEnabled && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  AYUSH Enabled
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Patient: <strong className="text-slate-700">{patientSession?.name || 'Outpatient'}</strong> {patientSession?.patientId ? `(${patientSession.patientId})` : ''}
            </div>
          </div>
        </div>

        {/* Conversational Progress Gauge */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={toggleAyushMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isAyushEnabled 
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
            }`}
            title="Toggle Ayurvedic clinical history questions"
          >
            {isAyushEnabled ? '🌿 AYUSH Branch: ON' : '+ AYUSH Branch'}
          </button>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-700">
              {progressPercent}% Complete
            </div>
            <div className="w-28 sm:w-36 bg-slate-200 h-2.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Red-Flag Alert Indicator (if triggered) */}
      {isFlagged && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 shadow-md text-red-950 flex items-start space-x-3 animate-bounce">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-extrabold text-red-700">
              TRIAGE SIGNAL ACTIVATED: Red-Flag Clinical Condition Detected
            </div>
            <div className="font-medium text-red-900 mt-0.5">
              {flagReason || 'Acute symptoms detected. Hospital clinical triage staff notified.'}
            </div>
          </div>
        </div>
      )}

      {/* Main Conversational Chat Container (High Contrast, Large Targets) */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col h-[600px] justify-between">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-5 rounded-3xl text-lg sm:text-xl font-medium shadow-sm leading-relaxed relative group ${
                  m.sender === 'patient'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span>{m.text}</span>
                  {m.sender === 'ai' && (
                    <button
                      onClick={() => speak(m.text)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-white transition-all flex-shrink-0"
                      title="Read aloud"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className={`text-[10px] mt-2 font-mono ${m.sender === 'patient' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Active Listening Indicator */}
          {isListening && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 font-bold flex items-center space-x-3 animate-pulse">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping" />
              <span className="text-base">Listening to your voice (Web Speech API)... Speak now</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Touch Quick-Picks (Provided by AI for Low-Literacy / Touch Convenience) */}
        {suggestedAnswers.length > 0 && (
          <div className="pt-3 pb-2 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Suggested Touch Answers:
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestedAnswers.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(opt, 'touch')}
                  className="px-5 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-950 border-2 border-emerald-300 text-base font-bold transition-all kiosk-touch-target shadow-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multimodal Input Controls (Mic + Text + Send) */}
        <div className="pt-3 border-t border-slate-200 flex items-center space-x-3">
          {/* Large Microphone Touch Target */}
          <button
            onClick={toggleListen}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white transition-all kiosk-touch-target flex-shrink-0 ${
              isListening
                ? 'bg-red-600 ring-4 ring-red-300 animate-pulse shadow-lg'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20'
            }`}
            title={isListening ? "Listening... click to stop" : "Click to speak with microphone"}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          {/* Text input for manual or corrected entry */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? "Listening to your voice..." : "Tap to speak or type your answer..."}
            className="flex-1 py-4 px-5 text-lg font-semibold bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
          />

          {/* Send button */}
          <button
            onClick={() => handleSendMessage()}
            className="h-16 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-base flex items-center justify-center space-x-2 transition-all kiosk-touch-target flex-shrink-0"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      {/* Completion & Next Stage Transition */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-500">
          Module A generates structured clinical draft for Module B (OCR) and Module C (Summary).
        </div>

        <button
          onClick={onComplete}
          className="w-full sm:w-auto py-4 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-extrabold rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition-all kiosk-touch-target min-h-[58px]"
        >
          <span>Proceed to Document Scanner (Stage 3)</span>
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
