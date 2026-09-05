import React, { useState } from 'react';
import { 
  Globe, QrCode, UserCheck, ShieldCheck, Volume2, ArrowRight, 
  Check, Phone, User, Calendar, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

const I18N = {
  en: {
    welcome: "Welcome to MediKiosk",
    tagline: "Your AI-Assisted Clinical Outpatient Check-In",
    step1Title: "Step 1: Patient Identification",
    step1Sub: "Choose how you would like to identify yourself today.",
    scanAbhaTab: "Scan / Enter ABHA ID",
    registerTab: "New Patient Registration",
    instantDemo: "Instant 1-Tap Demo (Sarah Jenkins)",
    abhaLabel: "Enter 14-digit ABHA ID or Mobile Number",
    abhaPlaceholder: "e.g. 14-8921-3490-1284 or 9123456780",
    nameLabel: "Full Name",
    phoneLabel: "Phone Number",
    ageLabel: "Age",
    genderLabel: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    continueBtn: "Continue to Privacy Consent",
    consentTitle: "Patient Privacy & Data Consent",
    consentReadAloud: "Read Aloud",
    readingAloud: "Reading Consent Aloud...",
    consentBody: "I agree to share my health symptoms, past medical history, and scanned prescriptions with MediKiosk and the consulting physician under ABDM digital health guidelines. All records are stored securely and only accessible by authorized medical staff.",
    consentPoints: [
      "AI assists in clinical transcription for your doctor.",
      "You retain full ownership and rights to your health data.",
      "Emergency red-flags will alert hospital triage staff immediately."
    ],
    agreeBtn: "I Agree & Begin Clinical Consultation",
  },
  hi: {
    welcome: "मेडीकियोस्क में आपका स्वागत है",
    tagline: "आपका डिजिटल स्वास्थ्य चेक-इन केंद्र",
    step1Title: "चरण 1: मरीज़ पहचान (Identification)",
    step1Sub: "कृपया अपनी पहचान का तरीका चुनें।",
    scanAbhaTab: "आभा (ABHA) आईडी दर्ज करें",
    registerTab: "नया मरीज़ पंजीकरण",
    instantDemo: "त्वरित डेमो (सारा जेनकिंस - MK-78294)",
    abhaLabel: "14 अंकों की आभा आईडी या मोबाइल नंबर",
    abhaPlaceholder: "उदा. 14-8921-3490-1284 या 9123456780",
    nameLabel: "पूरा नाम",
    phoneLabel: "मोबाइल नंबर",
    ageLabel: "उम्र (वर्ष)",
    genderLabel: "लिंग",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    continueBtn: "गोपनीयता सहमति के लिए आगे बढ़ें",
    consentTitle: "मरीज़ गोपनीयता एवं स्वास्थ्य सहमति",
    consentReadAloud: "सहमति सुनें (Read Aloud)",
    readingAloud: "सहमति पढ़ी जा रही है...",
    consentBody: "मैं अपने लक्षण, पुरानी बीमारियां और दवा की पर्ची डॉक्टर के साथ साझा करने की सहमति देता/देती हूँ। यह डेटा केवल अधिकृत डॉक्टरों और क्लिनिकल स्टाफ द्वारा ही देखा जा सकता है।",
    consentPoints: [
      "एआई डॉक्टर के लिए आपका क्लिनिकल रिकॉर्ड तैयार करेगा।",
      "आपका डेटा पूरी तरह सुरक्षित और गोपनीय रहेगा।",
      "गंभीर स्थिति होने पर तुरंत इमरजेंसी स्टाफ को सूचित किया जाएगा।"
    ],
    agreeBtn: "मैं सहमत हूँ और बातचीत शुरू करें",
  },
  bn: {
    welcome: "মেডিকিয়স্কে আপনাকে স্বাগতম",
    tagline: "আপনার ডিজিটাল স্বাস্থ্য চেক-ইন কেন্দ্র",
    step1Title: "ধাপ ১: রোগীর পরিচয় (Identification)",
    step1Sub: "কীভাবে পরিচয় দিতে চান তা নির্বাচন করুন।",
    scanAbhaTab: "ABHA আইডি লিখুন",
    registerTab: "নতুন রোগীর নিবন্ধন",
    instantDemo: "তাত্ক্ষণিক ডেমো (সারাহ জেনকিন্স)",
    abhaLabel: "১৪ ডিজিট ABHA আইডি বা মোবাইল নম্বর",
    abhaPlaceholder: "যেমন: 14-8921-3490-1284 বা 9123456780",
    nameLabel: "পুরো নাম",
    phoneLabel: "ফোন নম্বর",
    ageLabel: "বয়স",
    genderLabel: "লিঙ্গ",
    male: "পুরুষ",
    female: "মহিলা",
    other: "অন্যান্য",
    continueBtn: "সম্মতি পত্রে এগিয়ে যান",
    consentTitle: "রোগীর গোপনীয়তা ও সম্মতি",
    consentReadAloud: "পড়ে শোনান (Read Aloud)",
    readingAloud: "পড়া হচ্ছে...",
    consentBody: "আমি আমার লক্ষণ ও প্রেসক্রিপশন ডাক্তারের সাথে শেয়ার করার সম্মতি দিচ্ছি।",
    consentPoints: [
      "AI ডাক্তারের জন্য আপনার ক্লিনিক্যাল রিপোর্ট প্রস্তুত করবে।",
      "আপনার সমস্ত তথ্য সম্পূর্ণ সুরক্ষিত থাকবে।",
      "জরুরি অবস্থায় ট্রায়াজ স্টাফকে জানানো হবে।"
    ],
    agreeBtn: "আমি সম্মত ও পরামর্শ শুরু করুন",
  }
};

export default function IdentifyScreen({ onComplete }) {
  const [lang, setLang] = useState('en');
  const [stage, setStage] = useState('identify'); // 'identify' | 'consent'
  const [mode, setMode] = useState('abha'); // 'abha' | 'register'
  
  // ABHA / Direct check-in state
  const [abhaInput, setAbhaInput] = useState('');
  
  // Registration state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('FEMALE');
  
  const [isSpeakingConsent, setIsSpeakingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = I18N[lang] || I18N.en;

  // Text-To-Speech for low-literacy read-aloud
  const speakConsent = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeakingConsent) {
      setIsSpeakingConsent(false);
      return;
    }

    setIsSpeakingConsent(true);
    const textToRead = `${t.consentTitle}. ${t.consentBody}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'bn' ? 'bn-IN' : 'en-US';
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeakingConsent(false);
    utterance.onerror = () => setIsSpeakingConsent(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleInstantDemo = () => {
    setAbhaInput('14-8921-3490-1284');
    setName('Sarah Jenkins');
    setPhone('9123456780');
    setAge('38');
    setGender('FEMALE');
    setStage('consent');
  };

  const handleProceedToConsent = () => {
    if (mode === 'abha' && !abhaInput.trim()) return;
    if (mode === 'register' && (!name.trim() || !phone.trim())) return;
    setStage('consent');
  };

  const handleFinalAgree = async () => {
    setIsSubmitting(true);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    try {
      if (mode === 'register') {
        const regRes = await api.registerPatient({
          name,
          phone,
          age: parseInt(age) || 30,
          gender,
          preferred_language: lang,
          mock_abha_id: abhaInput || undefined
        });
        onComplete({
          patientId: regRes.user?.username || 'MK-NEW',
          name,
          phone,
          age,
          gender,
          language: lang,
          mockAbhaId: regRes.user?.patient_profile?.mock_abha_id || '14-8921-3490-1284'
        });
      } else {
        // Fast ABHA lookup or default demo
        onComplete({
          patientId: abhaInput.includes('14-') ? 'MK-78294' : 'MK-' + abhaInput.slice(-5),
          name: name || (abhaInput.includes('14-8921') ? 'Sarah Jenkins' : 'Outpatient Citizen'),
          phone: phone || '9123456780',
          age: age || 38,
          gender,
          language: lang,
          mockAbhaId: abhaInput || '14-8921-3490-1284'
        });
      }
    } catch (err) {
      console.warn('Registration fallback', err);
      onComplete({
        patientId: 'MK-78294',
        name: name || 'Sarah Jenkins',
        phone: phone || '9123456780',
        age: 38,
        gender: 'FEMALE',
        language: lang,
        mockAbhaId: abhaInput || '14-8921-3490-1284'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 animate-fadeIn">
      {/* Visual Calm Banner & Language Switcher */}
      <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Stage 1 of 5: Identify
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {t.welcome}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            {t.tagline}
          </p>
        </div>

        {/* Large Touch Target Language Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-300">
          {[
            { code: 'en', label: 'English' },
            { code: 'hi', label: 'हिंदी' },
            { code: 'bn', label: 'বাংলা' }
          ].map((item) => (
            <button
              key={item.code}
              onClick={() => setLang(item.code)}
              className={`px-5 py-3 rounded-xl text-base font-extrabold transition-all min-w-[80px] min-h-[50px] ${
                lang === item.code
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* STAGE A: IDENTIFICATION */}
      {stage === 'identify' && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t.step1Title}
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              {t.step1Sub}
            </p>
          </div>

          {/* Quick Demo 1-Tap Pill */}
          <div className="max-w-xl mx-auto">
            <button
              onClick={handleInstantDemo}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-400 font-extrabold text-lg flex items-center justify-center space-x-3 transition-all kiosk-touch-target shadow-sm"
            >
              <Sparkles className="w-6 h-6 text-emerald-600" />
              <span>⚡ {t.instantDemo}</span>
            </button>
          </div>

          {/* Mode Tabs: Scan ABHA vs Manual Registration */}
          <div className="max-w-xl mx-auto grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setMode('abha')}
              className={`py-3.5 px-4 rounded-xl text-base font-bold transition-all min-h-[56px] flex items-center justify-center space-x-2 ${
                mode === 'abha'
                  ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>{t.scanAbhaTab}</span>
            </button>
            <button
              onClick={() => setMode('register')}
              className={`py-3.5 px-4 rounded-xl text-base font-bold transition-all min-h-[56px] flex items-center justify-center space-x-2 ${
                mode === 'register'
                  ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span>{t.registerTab}</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="max-w-xl mx-auto space-y-6">
            {mode === 'abha' ? (
              <div className="space-y-4">
                <label className="block text-lg font-extrabold text-slate-800">
                  {t.abhaLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <input
                    type="text"
                    value={abhaInput}
                    onChange={(e) => setAbhaInput(e.target.value)}
                    placeholder={t.abhaPlaceholder}
                    className="w-full pl-14 pr-4 py-4 text-xl font-bold bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs sm:text-sm text-blue-900 font-medium">
                  💡 Tip: You can type a mock ABHA (e.g. <code>14-8921-3490-1284</code>) or a 10-digit mobile number.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-bold text-slate-700 mb-1">
                    {t.nameLabel} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-4 py-3.5 text-lg font-semibold bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-bold text-slate-700 mb-1">
                      {t.phoneLabel} *
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9123456780"
                      className="w-full px-4 py-3.5 text-lg font-semibold bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-bold text-slate-700 mb-1">
                      {t.ageLabel}
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="38"
                      className="w-full px-4 py-3.5 text-lg font-semibold bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-700 mb-2">
                    {t.genderLabel}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: 'FEMALE', label: t.female },
                      { val: 'MALE', label: t.male },
                      { val: 'OTHER', label: t.other }
                    ].map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => setGender(g.val)}
                        className={`py-3 px-4 rounded-xl text-base font-extrabold border-2 transition-all min-h-[50px] ${
                          gender === g.val
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleProceedToConsent}
              disabled={mode === 'abha' ? !abhaInput.trim() : (!name.trim() || !phone.trim())}
              className="w-full py-5 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl text-xl font-extrabold shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center space-x-3 kiosk-touch-target min-h-[64px]"
            >
              <span>{t.continueBtn}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE B: PRIVACY CONSENT SCREEN */}
      {stage === 'consent' && (
        <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {t.consentTitle}
                </h2>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ABDM Compliant Consent Artifact
                </span>
              </div>
            </div>

            {/* Read Aloud Button (TTS) */}
            <button
              onClick={speakConsent}
              className={`py-3 px-5 rounded-2xl text-base font-extrabold flex items-center space-x-2 transition-all min-h-[54px] ${
                isSpeakingConsent
                  ? 'bg-red-600 text-white animate-pulse shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              <Volume2 className="w-6 h-6 text-emerald-700" />
              <span>{isSpeakingConsent ? t.readingAloud : t.consentReadAloud}</span>
            </button>
          </div>

          {/* Consent Text Card (High Contrast, Large Typography) */}
          <div className="p-6 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 space-y-4">
            <p className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed">
              "{t.consentBody}"
            </p>
            <ul className="space-y-2 pt-2 border-t border-emerald-200/60 text-sm sm:text-base text-slate-700">
              {t.consentPoints.map((point, idx) => (
                <li key={idx} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Patient Details Snapshot */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 flex flex-wrap justify-between gap-2">
            <div><strong>Patient:</strong> {name || 'Sarah Jenkins'}</div>
            <div><strong>Language:</strong> {lang.toUpperCase()}</div>
            <div><strong>Mock ABHA ID:</strong> {abhaInput || '14-8921-3490-1284'}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={() => setStage('identify')}
              className="sm:w-1/3 py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg font-bold min-h-[64px]"
            >
              Back
            </button>

            <button
              onClick={handleFinalAgree}
              disabled={isSubmitting}
              className="flex-1 py-5 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-extrabold shadow-xl shadow-emerald-700/25 transition-all flex items-center justify-center space-x-3 min-h-[64px] kiosk-touch-target"
            >
              <Check className="w-7 h-7" />
              <span>{isSubmitting ? "Initializing Consultation..." : t.agreeBtn}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
