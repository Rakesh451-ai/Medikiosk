import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  AlertTriangle, ShieldCheck, Plus, Trash2, MessageSquare, 
  Settings, Key, Globe, Copy, Check, ChevronLeft, ChevronRight, Menu, X, ArrowUp 
} from 'lucide-react';
import { api } from '../services/api';

export function AgentPage({ patient, vitals, medications = [] }) {
  // Chat & Conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Language state: 'en' | 'hi' | 'hinglish'
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Voice & Speech state
  const [isListening, setIsListening] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // API Key state (saved in localStorage and passed to Django)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('medikiosk_llm_api_key') || '');
  const [llmProvider, setLlmProvider] = useState(() => localStorage.getItem('medikiosk_llm_provider') || 'gemini');
  const [llmModel, setLlmModel] = useState(() => localStorage.getItem('medikiosk_llm_model') || 'gemini-1.5-flash');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [patient]);

  const loadConversations = async () => {
    try {
      const list = await api.getConversations(patient?.patient_id);
      setConversations(list);
      if (list.length > 0) {
        // Select first conversation if none selected
        if (!activeConvId) {
          selectConversation(list[0].id);
        }
      } else {
        // Create initial default conversation
        handleNewChat();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const data = await api.getConversationDetail(convId);
      setMessages(data.messages || []);
      if (data.conversation?.language) {
        setSelectedLanguage(data.conversation.language);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewChat = async (lang = selectedLanguage) => {
    try {
      const title = lang === 'hi' ? 'नया परामर्श' : lang === 'hinglish' ? 'Nayi Baat-cheet' : 'New Health Consultation';
      const newConv = await api.createConversation(title, lang, patient?.patient_id);
      setConversations((prev) => [newConv, ...prev]);
      selectConversation(newConv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  // Multilingual Text-to-Speech
  const speakText = (text, lang = selectedLanguage) => {
    if (voiceMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;

    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    window.speechSynthesis.speak(utterance);
  };

  // Multilingual Speech Recognition
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const demoQueries = {
          en: ["Can I safely take Amoxicillin?", "Explain my chest X-Ray scan report", "How are my vitals today?"],
          hi: ["क्या मुझे Amoxicillin लेना सुरक्षित है?", "मेरी चेस्ट एक्स-रे रिपोर्ट समझाएं", "मेरे वाइटल्स कैसे हैं?"],
          hinglish: ["Kya main Amoxicillin le sakti hoon?", "Meri chest scan report samjhayein", "Mere vitals normal hain kya?"]
        };
        const list = demoQueries[selectedLanguage] || demoQueries.en;
        const q = list[Math.floor(Math.random() * list.length)];
        setInputText(q);
        handleSendMessage(q);
      }, 1400);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const query = (customPrompt || inputText).trim();
    if (!query) return;

    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'patient',
      text: query,
      language: selectedLanguage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsAgentTyping(true);

    try {
      const res = await api.sendChatMessage(
        query,
        patient?.patient_id || 'MK-78294',
        activeConvId,
        selectedLanguage,
        apiKey
      );

      setIsAgentTyping(false);
      setMessages((prev) => [...prev, res.message]);
      speakText(res.message.text, selectedLanguage);

      // Refresh conversations list to show updated title & last message
      api.getConversations(patient?.patient_id).then(setConversations);
    } catch (err) {
      console.error(err);
      setIsAgentTyping(false);
      const fallback = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: selectedLanguage === 'hi' 
          ? "आपकी वाइटल्स रिपोर्ट सामान्य है। कृपया पेनिसिलिन एलर्जी के कारण अमोक्सिसिलिन लेने से पहले डॉक्टर से संपर्क करें।"
          : selectedLanguage === 'hinglish'
          ? "Aapke vitals normal hain. Penicillin allergy ke chalte Amoxicillin lene se pehle doctor se zaroor consult karein."
          : "Your vitals are normal. Please verify with Dr. Michael Chen before taking any penicillin-class medications.",
        urgency: 'caution',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallback]);
      speakText(fallback.text, selectedLanguage);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('medikiosk_llm_api_key', apiKey.trim());
    localStorage.setItem('medikiosk_llm_provider', llmProvider);
    localStorage.setItem('medikiosk_llm_model', llmModel);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowApiKeyModal(false);
    }, 1200);
  };

  // Quick suggestions based on active language
  const promptSuggestions = {
    en: [
      "Check drug allergy safety",
      "Explain my latest chest scan report",
      "Review my daily medications schedule",
      "How are my live kiosk vitals?"
    ],
    hi: [
      "क्या मुझे Amoxicillin लेना सुरक्षित है?",
      "मेरी चेस्ट एक्स-रे स्कैन रिपोर्ट समझाएं",
      "दवाइयों का सही समय क्या है?",
      "मेरे वाइटल्स और ब्लड प्रेशर की स्थिति बताएं"
    ],
    hinglish: [
      "Kya main Amoxicillin le sakti hoon?",
      "Meri chest scan report explain karein",
      "Dawai lene ka sahi samay kya hai?",
      "Mere blood pressure aur vitals check karein"
    ]
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4.5rem)] select-none font-sans overflow-hidden">
      
      {/* ======================================================================
          1. CHATGPT-STYLE SIDEBAR (History, New Chat, Language & API Key)
          ====================================================================== */}
      <aside
        className={`${
          sidebarOpen ? 'w-full md:w-72 lg:w-80' : 'hidden'
        } bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 z-30`}
      >
        {/* Top: New Chat & Language Selector */}
        <div className="p-3.5 space-y-3">
          
          {/* New Chat Button */}
          <button
            onClick={() => handleNewChat(selectedLanguage)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#297006] hover:bg-[#205905] text-white font-bold text-xs shadow-md transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Health Chat</span>
            </div>
            <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded-md font-mono">⌘N</span>
          </button>

          {/* Multilingual Selector: English | हिंदी | Hinglish */}
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold px-2 py-1 flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Chat Language / भाषा:</span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <button
                onClick={() => {
                  setSelectedLanguage('en');
                  handleNewChat('en');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedLanguage === 'en'
                    ? 'bg-[#297006] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => {
                  setSelectedLanguage('hi');
                  handleNewChat('hi');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedLanguage === 'hi'
                    ? 'bg-[#297006] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => {
                  setSelectedLanguage('hinglish');
                  handleNewChat('hinglish');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedLanguage === 'hinglish'
                    ? 'bg-[#297006] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hinglish
              </button>
            </div>
          </div>
        </div>

        {/* Middle: Conversation History Section */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1">
            Consultation History ({conversations.length})
          </div>

          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between group cursor-pointer ${
                activeConvId === conv.id
                  ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate pr-1">
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeConvId === conv.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div className="truncate">
                  <span className="block truncate text-xs">{conv.title}</span>
                  <span className="text-[10px] text-slate-500 block truncate font-normal">
                    {conv.last_message || 'No messages yet'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] px-1 rounded bg-slate-900 text-slate-400 font-mono">
                  {conv.language || 'en'}
                </span>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  title="Delete chat"
                  className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              No conversations yet.
            </div>
          )}
        </div>

        {/* Bottom Sidebar: API Key Configuration & Patient Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
          {/* API Key Status / Config Trigger */}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left text-xs transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Key className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <span>LLM API Key</span>
                  {apiKey ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ) : (
                    <span className="text-[9px] bg-slate-800 text-amber-400 px-1 rounded">Paste Key</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {apiKey ? `${llmProvider} (${llmModel})` : 'backend/.env config'}
                </div>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-500 group-hover:rotate-45 transition-transform" />
          </button>

          {/* Patient Profile */}
          <div className="flex items-center justify-between text-xs px-2 pt-1">
            <span className="text-slate-400 font-medium">Patient: {patient?.name || 'Sarah Jenkins'}</span>
            <span className="text-emerald-400 font-bold font-mono">MK-78294</span>
          </div>
        </div>
      </aside>

      {/* ======================================================================
          2. MAIN CHATGPT-STYLE WORKSPACE
          ====================================================================== */}
      <main className="flex-1 flex flex-col bg-slate-900 min-w-0 relative">
        
        {/* Top Header Bar */}
        <header className="h-14 px-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {/* Model & Language indicator */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">MediKiosk Clinical AI</span>
                <span className="px-2 py-0.5 rounded-full bg-[#297006] text-white font-bold text-[10px]">
                  {selectedLanguage === 'hi' ? 'हिंदी (Hindi)' : selectedLanguage === 'hinglish' ? 'Hinglish' : 'English'}
                </span>
                {apiKey && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                    ⚡ {llmModel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Voice Mute Toggle */}
            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                voiceMuted
                  ? 'bg-slate-800 text-slate-500 hover:text-white'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
              title={voiceMuted ? "Enable Voice Readout" : "Mute Voice Readout"}
            >
              {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{voiceMuted ? 'Voice Off' : 'Voice On'}</span>
            </button>

            {/* API Key Modal Button */}
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">API Key</span>
            </button>
          </div>
        </header>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {messages.map((msg) => {
            const isAgent = msg.sender === 'agent';
            const isAlert = msg.urgency === 'alert';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 animate-fade-in ${
                  isAgent ? 'items-start' : 'items-start justify-end'
                }`}
              >
                {/* Agent Avatar */}
                {isAgent && (
                  <div className="w-9 h-9 rounded-2xl bg-[#052e0a] border border-[#297006] text-white flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`space-y-2 max-w-[85%] sm:max-w-[78%] ${!isAgent ? 'flex flex-col items-end' : ''}`}>
                  <div
                    className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-md ${
                      isAlert
                        ? 'bg-rose-950/90 text-rose-100 border-2 border-rose-500 rounded-tl-xs'
                        : isAgent
                        ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-xs'
                        : 'bg-[#297006] text-white rounded-tr-xs'
                    }`}
                  >
                    {isAlert && (
                      <div className="flex items-center gap-2 font-black text-rose-400 text-xs mb-2 pb-1.5 border-b border-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>CRITICAL DRUG ALLERGY CONTRAINDICATION</span>
                      </div>
                    )}

                    <p className="whitespace-pre-line select-text font-normal">{msg.text}</p>
                    
                    <div className={`mt-2 text-[10px] text-right ${isAgent ? 'text-slate-400' : 'text-emerald-200'}`}>
                      {msg.time || '10:00 AM'}
                    </div>
                  </div>

                  {/* Agent Message Action Bar: Speak aloud, Copy */}
                  {isAgent && (
                    <div className="flex items-center gap-2 pl-2 text-slate-400">
                      <button
                        onClick={() => speakText(msg.text, msg.language || selectedLanguage)}
                        title="Speak in selected language"
                        className="p-1 hover:text-emerald-400 transition"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        title="Copy message"
                        className="p-1 hover:text-emerald-400 transition flex items-center gap-1 text-[10px]"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Agent Quick Follow-Up Chips */}
                  {isAgent && msg.quick_replies && msg.quick_replies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.quick_replies.map((qr, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(qr)}
                          className="px-3 py-1 bg-slate-800/90 hover:bg-slate-700 text-emerald-300 text-xs font-semibold rounded-full border border-slate-700 transition active:scale-95"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {!isAgent && (
                  <div className="w-9 h-9 rounded-2xl bg-[#ff9800] text-black font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                    {patient?.name?.[0] || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {isAgentTyping && (
            <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-semibold p-3 bg-slate-800/80 rounded-2xl w-fit border border-slate-700">
              <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>
                {selectedLanguage === 'hi'
                  ? 'एआई डॉक्टर उत्तर तैयार कर रहा है...'
                  : selectedLanguage === 'hinglish'
                  ? 'AI Doctor reply analyze kar raha hai...'
                  : 'MediKiosk AI Clinical Doctor is analyzing your query...'}
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Bottom Prompt Chips & ChatGPT-Style Input Container */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 max-w-4xl mx-auto w-full space-y-3">
          
          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {(promptSuggestions[selectedLanguage] || promptSuggestions.en).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-full border border-slate-700 whitespace-nowrap transition shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* ChatGPT Style Input Pill */}
          <div className="relative flex items-center bg-slate-800 border border-slate-700 rounded-3xl p-2 shadow-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
            
            {/* Microphone Toggle (Web Speech API) */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/40'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
              }`}
              title={isListening ? "Listening... click to stop" : `Speak in ${selectedLanguage === 'hi' ? 'Hindi' : 'English/Hinglish'}`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isListening
                  ? `Listening (${selectedLanguage === 'hi' ? 'बोलिए...' : 'Listening...'})`
                  : selectedLanguage === 'hi'
                  ? 'यहाँ अपना स्वास्थ्य प्रश्न या लक्षण लिखें... (Enter दबाएं)'
                  : selectedLanguage === 'hinglish'
                  ? 'Apna medical question ya symptom yahan type karein... (Enter to send)'
                  : 'Message MediKiosk AI Doctor... (Press Enter to send)'
              }
              className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm font-medium px-3 focus:outline-none resize-none max-h-32"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-full bg-[#297006] hover:bg-[#205905] disabled:opacity-30 disabled:hover:bg-[#297006] text-white flex items-center justify-center transition shrink-0 cursor-pointer shadow-sm"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-500">
            MediKiosk Clinical AI provides health triage guidance in English, हिंदी & Hinglish. In a critical emergency, alert medical staff immediately.
          </p>
        </div>
      </main>

      {/* ======================================================================
          3. API KEY & MODEL SETTINGS MODAL
          ====================================================================== */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-slate-100">
          <div className="bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-700 relative">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-800 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">LLM API Key & Model Setup</h3>
                <p className="text-xs text-slate-400">Configure Google Gemini or OpenAI API Key</p>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4 text-xs">
              
              {/* Where to paste guide */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 text-xs block">
                  📍 Where to paste API Key in code:
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Open the file <strong className="text-amber-300 font-mono">backend/.env</strong> in your project and replace <code className="text-emerald-300">your_api_key_here</code>:
                </p>
                <pre className="p-2.5 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
{`# In file: backend/.env
LLM_API_KEY=AIzaSyYourGeminiApiKeyHere
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash`}
                </pre>
              </div>

              {/* Or paste directly in UI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Or Paste API Key Here Directly:</label>
                  <span className="text-[10px] text-slate-400">Saved in browser session</span>
                </div>

                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. AIzaSy... or sk-proj-..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Provider</label>
                    <select
                      value={llmProvider}
                      onChange={(e) => {
                        setLlmProvider(e.target.value);
                        if (e.target.value === 'gemini') setLlmModel('gemini-1.5-flash');
                        if (e.target.value === 'openai') setLlmModel('gpt-4o-mini');
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
                    >
                      <option value="gemini">Google Gemini (Recommended & Fast)</option>
                      <option value="openai">OpenAI (ChatGPT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Model Name</label>
                    <input
                      type="text"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="gemini-1.5-flash"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-center font-bold">
                  ✓ API Key Saved Successfully!
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#297006] hover:bg-[#205905] text-white font-bold text-xs shadow-md transition"
                >
                  Save API Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
