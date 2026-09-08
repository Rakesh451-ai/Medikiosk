import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  AlertTriangle, ShieldCheck, Heart, Pill, ChevronDown, ChevronUp,
  AlertCircle, Info, PlusCircle, MessageSquare, RefreshCw, PhoneCall, StopCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

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
    "💊 When should I take my medicines?",
    "🩺 Are my vitals normal today?",
    "⚠️ Are my medicines safe with my allergies?",
    "🏥 How do I see a doctor or nurse?"
  ],
  'hi-IN': [
    "💊 मुझे अपनी दवाइयाँ कब लेनी चाहिए?",
    "🩺 क्या मेरे वाइटल्स आज सामान्य हैं?",
    "⚠️ क्या मेरी दवाइयाँ मेरी एलर्जी के साथ सुरक्षित हैं?",
    "🏥 मुझे डॉक्टर या नर्स से कैसे परामर्श लेना चाहिए?"
  ],
  'bn-IN': [
    "💊 আমার কখন ওষুধ খাওয়া উচিত?",
    "🩺 আজ আমার ভাইটালס কি স্বাভাবিক?",
    "⚠️ আমার ওষুধের কি কোনো অ্যালার্জি ঝুঁকি আছে?",
    "🏥 আমি কীভাবে ডাক্তারের সাথে দেখা করব?"
  ],
  'mr-IN': [
    "💊 मी माझी औषधे कधी घ्यावीत?",
    "🩺 आज माझे व्हायटल्स सामान्य आहेत का?",
    "⚠️ औषधे माझ्या ऍलर्जीसाठी सुरक्षित आहेत का?",
    "🏥 डॉक्टरांचा सल्ला कसा घ्यावा?"
  ],
  'gu-IN': [
    "💊 મારે મારી દવાઓ ક્યારે લેવી જોઈએ?",
    "🩺 શું મારા વાઇટલ્સ આજે સામાન્ય છે?",
    "⚠️ શું મારી દવાઓ એલર્જી સાથે સુરક્ષિત છે?",
    "🏥 મારે ડૉક્ટર સાથે કેવી રીતે વાત કરવી?"
  ],
  'ta-IN': [
    "💊 நான் எப்போது மருந்துகளை உட்கொள்ள வேண்டும்?",
    "🩺 எனது உடல்நிலைக் குறியீடுகள் இயல்பானதா?",
    "⚠️ ஒவ்வாமைகளுக்கு மருந்துகள் பாதுகாப்பானவையா?",
    "🏥 மருத்துவரை எவ்வாறு அணுகுவது?"
  ],
  'te-IN': [
    "💊 నేను నా మందులను ఎప్పుడు తీసుకోవాలి?",
    "🩺 నా వైటల్స్ ఈ రోజు సాధారణంగా ఉన్నాయా?",
    "⚠️ అలెర్జీలతో నా మందులు సురక్షితమేనా?",
    "🏥 నేను వైద్యుడిని ఎలా సంప్రదించాలి?"
  ],
  'kn-IN': [
    "💊 ನಾನು ನನ್ನ ಔಷಧಿಗಳನ್ನು ಯಾವಾಗ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?",
    "🩺 ಇಂದು ನನ್ನ ವೈಟಲ್ಸ್ ಸಾಮಾನ್ಯವಾಗಿದೆಯೇ?",
    "⚠️ ಅಲರ್ಜಿಗಳೊಂದಿಗೆ ಔಷಧಿಗಳು ಸುರಕ್ಷಿತವೇ?",
    "🏥 ವೈದ್ಯರನ್ನು ಹೇಗೆ ಸಂಪರ್ಕಿಸುವುದು?"
  ],
  'pa-IN': [
    "💊 ਮੈਨੂੰ ਦਵਾਈਆਂ ਕਦੋਂ ਲੈਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ?",
    "🩺 ਕੀ ਮੇਰੇ ਵਾਈਟਲ ਅੱਜ ਆਮ ਹਨ?",
    "⚠️ ਕੀ ਮੇਰੀਆਂ ਦਵਾਈਆਂ ਐਲਰਜੀ ਲਈ ਸੁਰੱਖਿਅਤ ਹਨ?",
    "🏥 ਡਾਕਟਰ ਨੂੰ ਕਿਵੇਂ ਮਿਲਣਾ ਹੈ?"
  ],
  'ml-IN': [
    "💊 മരുന്നുകൾ എപ്പോഴാണ് കഴിക്കേണ്ടത്?",
    "🩺 ഇന്നത്തെ എന്റെ വൈറ്റലുകൾ സാധാരണമാണോ?",
    "⚠️ അലർജിയുള്ള മരുന്നുകൾ സുരക്ഷിതമാണോ?",
    "🏥 ഡോക്ടറെ എങ്ങനെ കാണാം?"
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
  const [showConvDropdown, setShowConvDropdown] = useState(false);

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
          ? `नमस्ते ${patientFirstName}! मैं आपका MediKiosk हेल्थ असिस्टेंट हूँ। आपके स्वास्थ्य आंकड़े और दवाइयाँ तैयार हैं।\n\nमैं आज आपकी क्या मदद कर सकता हूँ? आप नीचे दिए गए किसी प्रश्न पर टैप कर सकते हैं, या बोलने के लिए माइक दबा सकते हैं!`
          : `Hello ${patientFirstName}! I am your MediKiosk Health Assistant. I have your health records, medicines, and vitals ready.\n\nHow can I help you today? You can tap any question below, or tap the microphone to speak with me!`;

        setMessages([
          {
            id: 'init',
            sender: 'agent',
            text: defaultText,
            urgency: 'normal',
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
    setShowConvDropdown(false);
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

    const query = (customText || inputText).trim();
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

  const getBpDisplay = () => {
    if (vitals?.bp_systolic && vitals?.bp_diastolic) {
      return `${vitals.bp_systolic}/${vitals.bp_diastolic}`;
    }
    if (vitals?.blood_pressure) {
      return vitals.blood_pressure;
    }
    return null;
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Start a fresh health consultation"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Chat</span>
            </button>

            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-emerald-300 text-xs font-bold text-[#052e0a] shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>AI Ready</span>
            </div>
          </div>
        </div>

        {/* Clinical Advisory Banner */}
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Clinical Notice:</strong> This assistant provides information based on your uploaded records and does not replace emergency medical care. For severe chest pain, shortness of breath, or bleeding, please alert hospital triage immediately.
            </span>
          </div>
          <a
            href="tel:112"
            className="shrink-0 px-3 py-1 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-extrabold text-[11px] flex items-center gap-1 transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency 112</span>
          </a>
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
          
          {/* Left Column: Patient Chart Context */}
          <div className={`${showMobileContext ? 'flex' : 'hidden'} lg:flex lg:col-span-4 flex-col gap-4 animate-fade-in`}>
            <Card className="p-4 sm:p-5 shadow-md border-2 border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-extrabold text-sm text-[#052e0a] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#297006]" />
                  <span>What the Assistant Knows</span>
                </h3>
              </div>

              {/* Allergy Warning */}
              {patient?.allergies && patient.allergies.length > 0 ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4" /> Known Drug Allergies:
                  </span>
                  <p className="font-black text-rose-950">{patient.allergies.join(', ')}</p>
                  <p className="text-[10px] text-rose-700">The assistant checks every question against this.</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-0.5">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" /> Documented Allergies:
                  </span>
                  <p className="font-bold text-slate-700">No known drug allergies recorded.</p>
                </div>
              )}

              {/* Vitals */}
              <div className="space-y-1 text-xs">
                <span className="text-gray-700 font-bold block">Your Current Vitals:</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-gray-500 font-bold block">Heart Rate</span>
                    <strong className="text-[#052e0a] text-sm">
                      {vitals?.heart_rate ? `${vitals.heart_rate} bpm` : '—'}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      {vitals?.heart_rate ? '✓ Normal' : 'Not recorded'}
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-gray-500 font-bold block">Blood Pressure</span>
                    <strong className="text-[#052e0a] text-sm">
                      {getBpDisplay() || '—'}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      {getBpDisplay() ? '✓ Target' : 'Not recorded'}
                    </span>
                  </div>
                  {vitals?.spo2 ? (
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-gray-500 font-bold block">Oxygen (SpO2)</span>
                      <strong className="text-[#052e0a] text-sm">{vitals.spo2}%</strong>
                      <span className="text-[10px] text-emerald-700 font-bold block">Target 95-100%</span>
                    </div>
                  ) : null}
                  {vitals?.temperature ? (
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-gray-500 font-bold block">Temperature</span>
                      <strong className="text-[#052e0a] text-sm">{vitals.temperature}°F</strong>
                      <span className="text-[10px] text-emerald-700 font-bold block">Body Temp</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Medications */}
              <div className="text-xs">
                <span className="text-gray-700 font-bold block mb-1">Your Prescribed Medicines:</span>
                {medications && medications.length > 0 ? (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {medications.map((m) => (
                      <li key={m.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-900">{m.name}</span>
                          <span className="text-[10px] text-gray-500 block">{m.timing || 'Daily'}</span>
                        </div>
                        <Badge variant="success" className="text-[10px]">
                          {m.dose || m.dosage}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl text-center text-slate-500 font-medium">
                    No active medications recorded yet.
                  </div>
                )}
              </div>

              {/* Past Consultations Quick Selector */}
              {conversations.length > 1 && (
                <div className="pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-700 font-bold block mb-1.5">Past Consultations:</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => switchConversation(c.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] truncate flex items-center justify-between transition cursor-pointer ${
                          currentConversationId === c.id
                            ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="truncate">{c.title || 'Consultation'}</span>
                        {c.message_count ? (
                          <span className="text-[9px] bg-white px-1.5 py-0.5 rounded-full text-gray-500 border border-gray-200">
                            {c.message_count}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Chat Room Window */}
          <Card className="lg:col-span-8 shadow-md border-2 border-emerald-200/80 overflow-hidden flex flex-col h-[560px] sm:h-[600px] w-full">
            
            {/* Top Bar */}
            <div className="w-full bg-[#3f51b5] py-3 px-4 sm:px-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between text-white gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff9800] flex items-center justify-center text-gray-950 font-black text-sm shadow-xs">
                  💬
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm block leading-tight">Health Assistant</span>
                    {conversations.length > 0 && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-blue-100 hidden md:inline">
                        Thread #{currentConversationId || 'Active'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-blue-200">
                    {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.native || 'Multilingual'} Consultation
                  </span>
                </div>
              </div>

              {/* Action Buttons: Language Selector + Voice Readout Toggle */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Language Dropdown */}
                <div className="relative inline-flex items-center">
                  <label htmlFor="assistant-language-select" className="sr-only">Choose Language</label>
                  <select
                    id="assistant-language-select"
                    aria-label="Select Consultation Language"
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 pl-3 pr-7 rounded-full border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#ff9800] cursor-pointer appearance-none shadow-xs"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="text-gray-900 bg-white font-medium">
                        {lang.native} ({lang.name})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white absolute right-2 pointer-events-none" />
                </div>

                {/* Voice Readout Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setVoiceMuted(!voiceMuted);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    voiceMuted
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-[#ff9800] text-gray-950 font-black ring-2 ring-white/60'
                  }`}
                  aria-label={voiceMuted ? "Unmute voice responses" : "Mute voice responses"}
                  title={voiceMuted ? "Click to have replies spoken aloud" : "Voice is ON (click to mute)"}
                >
                  {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="text-[11px] sm:text-xs">{voiceMuted ? "Voice Muted" : "Voice ON"}</span>
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg) => {
                const isAgent = msg.sender === 'agent';
                const isCritical = msg.urgency === 'critical' || msg.is_emergency;
                const isWarning = msg.urgency === 'warning';
                const isCurrentlySpeaking = speakingMsgId === msg.id && isSpeaking;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
                  >
                    <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[85%]">
                      {isAgent && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                          isCritical ? 'bg-rose-700 text-white animate-pulse' : 'bg-[#052e0a] text-white'
                        }`}>
                          {isCritical ? <AlertTriangle className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-emerald-300" />}
                        </div>
                      )}

                      <div
                        className={`p-3.5 sm:p-4 rounded-3xl text-xs sm:text-sm font-medium leading-relaxed shadow-xs relative group ${
                          isAgent
                            ? isCritical
                              ? 'bg-rose-50 text-rose-950 border-2 border-rose-400'
                              : isWarning
                                ? 'bg-amber-50 text-amber-950 border-2 border-amber-300'
                                : 'bg-white text-gray-900 border border-gray-200'
                            : 'bg-[#184a32] text-white rounded-br-xs'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        {/* Read Aloud Button on Agent Messages */}
                        {isAgent && (
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                            <button
                              onClick={() => speakMessage(msg.text, msg.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition cursor-pointer ${
                                isCurrentlySpeaking
                                  ? 'bg-emerald-600 text-white animate-pulse font-bold'
                                  : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={isCurrentlySpeaking ? "Stop speaking" : "Listen to this reply"}
                            >
                              {isCurrentlySpeaking ? <StopCircle className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                              <span>{isCurrentlySpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
                            </button>

                            {isCritical && (
                              <a
                                href="tel:112"
                                className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full hover:bg-rose-200"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>Call 112</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Quick Action Suggested Replies */}
                        {msg.quick_replies && msg.quick_replies.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-emerald-100 flex flex-wrap gap-1.5">
                            {msg.quick_replies.map((qr, i) => (
                              <button
                                key={i}
                                onClick={() => handleSend(qr)}
                                disabled={isAgentTyping}
                                className="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-[#052e0a] transition cursor-pointer disabled:opacity-50"
                              >
                                {qr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {!isAgent && (
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-10">
                      {msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                    </span>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isAgentTyping && (
                <div className="flex items-center gap-2 text-xs text-[#052e0a] font-semibold italic p-2 bg-emerald-50/80 rounded-2xl w-fit border border-emerald-200 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce delay-200"></div>
                  <span>
                    {selectedLanguage.startsWith('hi') 
                      ? "असिस्टेंट आपके मेडिकल रिकॉर्ड की समीक्षा कर रहा है..." 
                      : "Assistant is analyzing your medical chart & thinking..."}
                  </span>
                </div>
              )}

              {/* Send Error Notice with Retry */}
              {sendError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                  <button
                    onClick={retryLastQuery}
                    className="px-3 py-1 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Speech State Feedback Bar */}
            {speechState === 'LISTENING' && (
              <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                  <span>
                    Listening ({SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'Audio'})... Speak your question into microphone.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition shadow-xs"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {speechError && (
              <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{speechError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechError('');
                      startListening();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Try Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeechError('')}
                    className="text-amber-800 text-xs font-bold hover:underline px-1 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 sm:p-4 bg-white border-t border-gray-200 flex items-center gap-2">
              <button
                type="button"
                onClick={speechState === 'LISTENING' ? stopListening : startListening}
                aria-label={speechState === 'LISTENING' ? "Stop voice listening" : "Start voice listening"}
                className={`p-3 rounded-2xl transition cursor-pointer shrink-0 ${
                  speechState === 'LISTENING'
                    ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                    : 'bg-emerald-100 text-[#052e0a] hover:bg-emerald-200'
                }`}
                title={speechState === 'LISTENING' ? "Click to stop listening" : "Tap to speak your question"}
              >
                {speechState === 'LISTENING' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isAgentTyping}
                placeholder={
                  isAgentTyping
                    ? (selectedLanguage.startsWith('hi') ? "असिस्टेंट सोच रहा है..." : "Assistant is thinking...")
                    : (selectedLanguage.startsWith('hi') 
                        ? "दवाइयों, खुराक या टेस्ट परिणामों के बारे में पूछें या बोलें..." 
                        : "Ask about your medicines, dosage, or test results...")
                }
                className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-gray-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isAgentTyping}
                aria-label="Send message"
                className="p-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white transition cursor-pointer shrink-0 shadow-xs"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
