import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, PlusCircle, ShieldCheck, ChevronDown, ChevronUp 
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { 
  ClinicalNoticeBanner, 
  PatientChartContext, 
  ChatHeader, 
  ChatMessageItem, 
  ChatInputBar 
} from '../components/agent';

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English', native: 'English', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
];

const QUICK_REPLIES_BY_LANG = {
  'en-IN': [
    "💧 Signs of dehydration",
    "🥗 Healthy diet tips",
    "😴 Sleep advice",
    "🏃 Exercise guidance",
    "🩺 Common symptoms",
    "🩺 What is high blood pressure?",
    "💊 When should I take my medicines?",
    "🩺 Are my vitals normal today?"
  ],
  'hi-IN': [
    "💧 डिहाइड्रेशन (पानी की कमी) के लक्षण",
    "🥗 स्वस्थ आहार के टिप्स",
    "😴 बेहतर नींद की सलाह",
    "🏃 व्यायाम मार्गदर्शन",
    "🩺 सामान्य लक्षण",
    "🩺 हाई बीपी का क्या मतलब है?",
    "💊 मुझे अपनी दवाइयाँ कब लेनी चाहिए?",
    "🩺 क्या मेरे वाइटल्स आज सामान्य हैं?"
  ],
  'bn-IN': [
    "💧 ডিহাইড্রেশনের লক্ষণ কি?",
    "🥗 স্বাস্থ্যকর খাবারের টিপস",
    "😴 ভালো ঘুমের পরামর্শ",
    "🩺 উচ্চ রক্তচাপ কি?",
    "💊 আমার কখন ওষুধ খাওয়া উচিত?",
    "🩺 আজ আমার ভাইটালס কি স্বাভাবিক?"
  ],
  'mr-IN': [
    "💧 डिहायड्रेशनची लक्षणे काय आहेत?",
    "🥗 निरोगी आहाराच्या टिप्स",
    "😴 चांगल्या झोपेसाठी सल्ला",
    "🩺 उच्च रक्तदाब म्हणजे काय?",
    "💊 मी माझी औषधे कधी घ्यावीत?",
    "🩺 आज माझे व्हायटल्स सामान्य आहेत का?"
  ],
  'gu-IN': [
    "💧 ડિહાઇડ્રેશનના લક્ષણો",
    "🥗 તંદુરસ્ત આહારની ટિપ્સ",
    "😴 સારી ઊંઘ માટે સલાહ",
    "🩺 હાઈ બ્લડ પ્રેશર એટલે શું?",
    "💊 મારે મારી દવાઓ ક્યારે લેવી જોઈએ?",
    "🩺 શું મારા વાઇટલ્સ આજે સામાન્ય છે?"
  ],
  'ta-IN': [
    "💧 நீரிழப்புக்கான அறிகுறிகள்",
    "🥗 ஆரோக்கியமான உணவு குறிப்புகள்",
    "😴 சிறந்த தூக்கத்திற்கான ஆலோசனை",
    "🩺 உயர் இரத்த அழுத்தம் என்றால் என்ன?",
    "💊 நான் எப்போது மருந்துகளை உட்கொள்ள வேண்டும்?",
    "🩺 எனது உடல்நிலைக் குறியீடுகள் இயல்பானதா?"
  ],
  'te-IN': [
    "💧 డీహైడ్రేషన్ లక్షణాలు",
    "🥗 ఆరోగ్యకరమైన ఆహార చిట్కాలు",
    "😴 మంచి నిద్ర కోసం సలహాలు",
    "🩺 అధిక రక్తపోటు అంటే ఏమిటి?",
    "💊 నేను నా మందులను ఎప్పుడు తీసుకోవాలి?",
    "🩺 నా వైటల్స్ ఈ రోజు సాధారణంగా ఉన్నాయా?"
  ],
  'kn-IN': [
    "💧 ನಿರ್ಜಲೀಕರಣದ ಲಕ್ಷಣಗಳು",
    "🥗 ಆರೋಗ್ಯಕರ ಆಹಾರದ ಸಲಹೆಗಳು",
    "😴 ಉತ್ತಮ ನಿದ್ರೆಯ ಸಲಹೆ",
    "🩺 ಅಧಿಕ ರಕ್ತದೊತ್ತಡ ಎಂದರೇನು?",
    "💊 ನಾನು ನನ್ನ ಔಷಧಿಗಳನ್ನು ಯಾವಾಗ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?",
    "🩺 ಇಂದು ನನ್ನ ವೈಟಲ್ಸ್ ಸಾಮಾನ್ಯವಾಗಿದೆಯೇ?"
  ],
  'pa-IN': [
    "💧 ਡੀਹਾਈਡ੍ਰੇਸ਼ਨ ਦੇ ਲੱਛਣ",
    "🥗 ਸਿਹਤਮੰਦ ਖੁਰਾਕ ਸੁਝਾਅ",
    "😴 ਚੰਗੀ ਨੀਂਦ ਦੀ ਸਲਾਹ",
    "🩺 ਹਾਈ ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ ਦਾ ਕੀ ਅਰਥ ਹੈ?",
    "💊 ਮੈਨੂੰ ਦਵਾਈਆਂ ਕਦੋਂ ਲੈਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ?",
    "🩺 ਕੀ ਮੇਰੇ ਵਾਈਟਲ ਅੱਜ ਆਮ ਹਨ?"
  ],
  'ml-IN': [
    "💧 നിർജ്ജലീകരണത്തിന്റെ ലക്ഷണങ്ങൾ",
    "🥗 ആരോഗ്യകരമായ ഭക്ഷണ നുറുങ്ങുകൾ",
    "😴 നല്ല ഉറക്കത്തിനുള്ള നിർദ്ദേശങ്ങൾ",
    "🩺 ഉയർന്ന രക്തസമ്മർദ്ദം എന്നാൽ എന്താണ്?",
    "💊 മരുന്നുകൾ എപ്പോഴാണ് കഴിക്കേണ്ടത്?",
    "🩺 ഇന്നത്തെ എന്റെ വൈറ്റലുകൾ സാധാരണമാണോ?"
  ]
};

export function AgentPage({ patient, vitals, medications = [] }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Multilingual State
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('medikiosk_assistant_lang');
      if (saved) return saved;
    } catch (e) {}
    if (patient?.preferred_language) {
      const match = SUPPORTED_LANGUAGES.find(
        (l) => l.code === patient.preferred_language || l.code.startsWith(patient.preferred_language)
      );
      if (match) return match.code;
    }
    return 'en-IN';
  });
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // Voice & Speech Recognition State
  const [speechState, setSpeechState] = useState('IDLE'); // 'IDLE' | 'LISTENING' | 'PROCESSING' | 'ERROR'
  const [speechError, setSpeechError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [voiceMuted, setVoiceMuted] = useState(false);

  // Interaction State
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [showMobileContext, setShowMobileContext] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // 1. Initial Load: Fetch Conversations and History
  useEffect(() => {
    async function initAgent() {
      try {
        const convList = await api.getConversations(patient?.patient_id || '');
        if (Array.isArray(convList) && convList.length > 0) {
          setConversations(convList);
          const activeId = convList[0].id;
          setCurrentConversationId(activeId);
          await loadHistory(activeId);
        } else {
          // No prior conversation exists yet
          await loadHistory(null);
        }
      } catch (err) {
        console.warn('Failed to load conversations:', err);
        await loadHistory(null);
      }
    }
    initAgent();
  }, [patient?.patient_id]);

  // Available voices for TTS
  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        setAvailableVoices(window.speechSynthesis.getVoices() || []);
      }
    };
    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    try {
      localStorage.setItem('medikiosk_assistant_lang', newLang);
    } catch (e) {}
    stopSpeaking();
    if (speechState === 'LISTENING') {
      stopListening();
    }
  };

  // Load chat messages for a specific conversation
  const loadHistory = async (convId) => {
    try {
      const history = await api.getChatHistory(convId || '', patient?.patient_id || '');
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
      } else {
        const patientFirstName = patient?.name ? patient.name.split(' ')[0] : 'there';
        const isHindi = selectedLanguage.startsWith('hi');
        const defaultText = isHindi
          ? `नमस्ते ${patientFirstName}! मैं आपका MediKiosk हेल्थ असिस्टेंट हूँ।\n\nआप मुझसे सामान्य स्वास्थ्य प्रश्न (जैसे खान-पान, नींद, या लक्षण) या अपने मेडिकल रिकॉर्ड और दवाओं के बारे में पूछ सकते हैं!\n\n⚠️ अस्वीकरण: यह स्वास्थ्य जानकारी केवल शैक्षिक उद्देश्यों के लिए है और डॉक्टर की सलाह का विकल्प नहीं है।`
          : `Hello ${patientFirstName}! I am your MediKiosk Health Assistant.\n\nYou can ask me general health questions (such as diet, sleep, symptoms, or medical terms) or ask about your personal medicines, vitals, and reports!\n\n⚠️ Disclaimer: Health information is for educational purposes and does not replace professional medical advice.`;

        setMessages([
          {
            id: 'init',
            sender: 'agent',
            text: defaultText,
            urgency: 'normal',
            query_mode: 'general',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            quick_replies: QUICK_REPLIES_BY_LANG[selectedLanguage] || QUICK_REPLIES_BY_LANG['en-IN']
          }
        ]);
      }
    } catch (err) {
      console.warn('Chat history load error:', err);
    }
  };

  // Switch Conversation
  const switchConversation = async (convId) => {
    setCurrentConversationId(convId);
    stopSpeaking();
    await loadHistory(convId);
  };

  // Start New Consultation
  const handleNewConversation = async () => {
    stopSpeaking();
    try {
      const res = await api.createConversation('New Consultation', patient?.patient_id || '');
      if (res && res.conversation) {
        setConversations(prev => [res.conversation, ...prev]);
        setCurrentConversationId(res.conversation.id);
        if (res.initial_message) {
          setMessages([res.initial_message]);
        } else {
          await loadHistory(res.conversation.id);
        }
      } else {
        // Fallback local reset
        setCurrentConversationId(null);
        await loadHistory(null);
      }
    } catch (err) {
      console.warn('Failed to create new conversation:', err);
      setCurrentConversationId(null);
      await loadHistory(null);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Text-To-Speech (TTS)
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  };

  const speakMessage = (text, msgId = null) => {
    if (!('speechSynthesis' in window)) return;
    
    if (isSpeaking && speakingMsgId === msgId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    // Clean text for speech (remove markdown symbols, emojis, and links)
    const cleanSpeech = text
      .replace(/[*_#`~•]/g, '')
      .replace(/🚨|⚠️|💊|🩺|🏥|📞|📍|✨|💬|🇮🇳/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanSpeech) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = selectedLanguage;

      const voices = availableVoices.length > 0 ? availableVoices : (window.speechSynthesis.getVoices() || []);
      const langPrefix = selectedLanguage.split('-')[0].toLowerCase();
      
      // Look for exact locale match or language prefix match
      const matchedVoice = voices.find(v => v.lang.toLowerCase() === selectedLanguage.toLowerCase()) 
        || voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix))
        || voices.find(v => v.lang.toLowerCase().includes(langPrefix));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingMsgId(msgId);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      };
      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS playback error:', e);
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }
  };

  // Speech Recognition (STT) with microphone permission check and interim streaming
  const startListening = async () => {
    stopSpeaking();
    setSpeechError('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechState('ERROR');
      setSpeechError("Voice typing isn't supported in this browser. You can type your message instead.");
      return;
    }

    // Step 1: Explicitly request/verify microphone permission via getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release the audio tracks so SpeechRecognition acquires mic cleanly
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr) {
        console.warn('Microphone permission request denied or failed:', permErr);
        setSpeechState('ERROR');
        setSpeechError("Microphone permission is required to use voice typing. Please allow microphone access in your browser settings and try again.");
        return;
      }
    }

    // Step 2: Initialize SpeechRecognition
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setSpeechState('LISTENING');
        setSpeechError('');
      };

      recognition.onresult = (e) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript + ' ';
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          setInputText(combined);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setSpeechState('ERROR');
          setSpeechError("Microphone permission is required to use voice typing. Please allow microphone access in your browser settings and try again.");
        } else if (e.error === 'no-speech') {
          // Patient hasn't spoken yet; keep waiting or listening
        } else {
          setSpeechState('ERROR');
          setSpeechError(
            e.error === 'network'
              ? 'Voice network recognition failed. Please check your internet connection or type.'
              : `Voice capture note: ${e.error}. Please try again or type.`
          );
        }
      };

      recognition.onend = () => {
        setSpeechState('IDLE');
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setSpeechState('ERROR');
      setSpeechError("Microphone could not be initialized. Please verify browser permissions and try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setSpeechState('IDLE');
  };

  // Send Message Handler
  const handleSend = async (customText) => {
    if (speechState === 'LISTENING') {
      stopListening();
    }

    let query = (customText || inputText).trim();
    if (query.toLowerCase() === 'retry' && lastQuery) {
      query = lastQuery;
    }
    if (!query || isAgentTyping) return;

    setSendError(null);
    setLastQuery(query);

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
      const res = await api.sendChatMessage({
        text: query,
        conversation_id: currentConversationId,
        patient_id: patient?.patient_id || '',
        language: selectedLanguage
      });
      setIsAgentTyping(false);
      setMessages((prev) => [...prev, res]);

      // If voice readout is enabled, speak assistant response
      if (!voiceMuted && res?.text) {
        speakMessage(res.text, res.id);
      }
      
      // Update active conversation ID if newly assigned
      if (res?.conversation && res.conversation !== currentConversationId) {
        setCurrentConversationId(res.conversation);
      }
    } catch (err) {
      setIsAgentTyping(false);
      setSendError("The health assistant could not connect to the clinical server. Please tap 'Retry' to try again.");
      console.error('Agent chat error:', err);
    }
  };

  const retryLastQuery = () => {
    if (lastQuery) {
      handleSend(lastQuery);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="w-full bg-gradient-to-b from-emerald-50/70 via-slate-50 to-emerald-50/40 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-6 flex-1 flex flex-col">
        
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Talk or Type with Your Health Assistant
              </h1>
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 hidden sm:inline" />
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Ask general health questions, explore wellness tips, or review your medicines and vitals. Tap the microphone to speak naturally.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleNewConversation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold shadow-xs shadow-emerald-700/20 transition cursor-pointer"
              title="Start a fresh health consultation"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Chat</span>
            </button>

            <div className="flex items-center gap-2 bg-white/95 px-3.5 py-2 rounded-full border border-emerald-200/80 text-xs font-bold text-emerald-950 shadow-xs backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>AI Ready</span>
            </div>
          </div>
        </header>

        {/* Clinical Safety Advisory Banner */}
        <ClinicalNoticeBanner />

        {/* Mobile Expandable Health Context Toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileContext(!showMobileContext)}
            className="w-full p-3.5 rounded-2xl bg-white/95 border border-emerald-200/80 text-xs font-bold text-emerald-950 flex items-center justify-between shadow-xs transition active:scale-[0.99] backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>View My Chart Info Known by Assistant</span>
            </div>
            {showMobileContext ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
        </div>

        {/* Main Agent Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 flex-1 items-start">
          
          {/* Left Column: Reusable Patient Chart Context */}
          <div className={`${showMobileContext ? 'flex' : 'hidden'} lg:flex lg:col-span-4 flex-col gap-4 animate-fade-in`}>
            <PatientChartContext
              patient={patient}
              vitals={vitals}
              medications={medications}
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={switchConversation}
            />
          </div>

          {/* Right Column: Reusable Chat Window */}
          <Card className="lg:col-span-8 shadow-sm border border-emerald-200/70 overflow-hidden flex flex-col h-[580px] sm:h-[620px] w-full rounded-3xl bg-white">
            
            {/* Top Bar / Header */}
            <ChatHeader
              title="Health Assistant"
              supportedLanguages={SUPPORTED_LANGUAGES}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              voiceMuted={voiceMuted}
              onToggleVoice={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceMuted(!voiceMuted);
              }}
              conversationId={currentConversationId}
            />

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/60 to-slate-50/95">
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isCurrentlySpeaking={speakingMsgId === msg.id && isSpeaking}
                  onSpeak={speakMessage}
                  onSendQuickReply={handleSend}
                  isAgentTyping={isAgentTyping}
                />
              ))}

              {/* Typing Indicator */}
              {isAgentTyping && (
                <div className="flex items-center gap-2 text-xs text-emerald-950 font-semibold p-2.5 bg-emerald-50/90 rounded-2xl w-fit border border-emerald-200/80 animate-pulse shadow-2xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-100"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-200"></span>
                  </div>
                  <span>
                    {selectedLanguage.startsWith('hi') 
                      ? "असिस्टेंट आपके मेडिकल रिकॉर्ड की समीक्षा कर रहा है..." 
                      : "Assistant is analyzing your medical chart & thinking..."}
                  </span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Reusable Input Bar with Speech Recognition & Send Controls */}
            <ChatInputBar
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              isAgentTyping={isAgentTyping}
              speechState={speechState}
              speechError={speechError}
              onClearSpeechError={() => setSpeechError('')}
              onStartListening={startListening}
              onStopListening={stopListening}
              currentLanguageCode={selectedLanguage}
              currentLanguageName={currentLangObj?.name || 'English'}
              sendError={sendError}
              onRetryLastQuery={retryLastQuery}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AgentPage;
