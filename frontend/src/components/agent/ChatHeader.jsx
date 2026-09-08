import React from 'react';
import { Volume2, VolumeX, ChevronDown, Sparkles, Bot } from 'lucide-react';

export function ChatHeader({
  supportedLanguages = [],
  selectedLanguage,
  onLanguageChange,
  voiceMuted,
  onToggleVoice,
  conversationId,
  title = "Health Assistant",
  className = ""
}) {
  const currentLangObj = supportedLanguages.find(l => l.code === selectedLanguage);

  return (
    <header className={`w-full bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 py-3 px-4 sm:px-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between text-white gap-3 border-b border-emerald-700/50 ${className}`}>
      {/* Assistant Title & Status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-emerald-300 font-bold shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-900 animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-sm sm:text-base block leading-tight text-white tracking-tight">
              {title}
            </h2>
            {conversationId && (
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-emerald-100 font-medium border border-white/10 hidden md:inline">
                Thread #{conversationId}
              </span>
            )}
          </div>
          <span className="text-[11px] text-emerald-200/90 font-medium flex items-center gap-1 mt-0.5">
            <Sparkles className="w-3 h-3 text-emerald-300 inline" />
            <span>{currentLangObj?.native || 'Multilingual'} Consultation</span>
          </span>
        </div>
      </div>

      {/* Action Controls: Language Selector & Voice Toggle */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
        {/* Language Dropdown */}
        <div className="relative inline-flex items-center">
          <label htmlFor="assistant-language-select" className="sr-only">Choose Language</label>
          <select
            id="assistant-language-select"
            aria-label="Select Consultation Language"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            className="bg-white/15 hover:bg-white/25 active:bg-white/20 text-white text-xs font-semibold py-1.5 pl-3 pr-7 rounded-full border border-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer appearance-none shadow-xs transition backdrop-blur-sm"
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code} className="text-slate-900 bg-white font-medium">
                {lang.native} ({lang.name})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Voice Readout Toggle */}
        <button
          type="button"
          onClick={onToggleVoice}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
            voiceMuted
              ? 'bg-white/15 text-white/90 hover:bg-white/25 border border-white/20'
              : 'bg-emerald-400 text-emerald-950 font-black shadow-emerald-400/20 ring-2 ring-white/50'
          }`}
          aria-label={voiceMuted ? "Unmute voice responses" : "Mute voice responses"}
          title={voiceMuted ? "Click to have replies spoken aloud" : "Voice is ON (click to mute)"}
        >
          {voiceMuted ? <VolumeX className="w-3.5 h-3.5 text-white/80" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-950" />}
          <span className="text-[11px] sm:text-xs tracking-tight">{voiceMuted ? "Voice Muted" : "Voice ON"}</span>
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;
