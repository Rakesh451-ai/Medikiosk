import React from 'react';
import { Send, Mic, MicOff, RefreshCw, AlertCircle, Radio } from 'lucide-react';

export function ChatInputBar({
  inputText,
  setInputText,
  onSend,
  isAgentTyping = false,
  speechState = 'IDLE', // 'IDLE' | 'LISTENING' | 'PROCESSING' | 'ERROR'
  speechError = '',
  onClearSpeechError,
  onStartListening,
  onStopListening,
  currentLanguageCode = 'en-IN',
  currentLanguageName = 'English',
  sendError = null,
  onRetryLastQuery,
  className = ''
}) {
  const isListening = speechState === 'LISTENING';
  const isHindi = currentLanguageCode.startsWith('hi');

  const placeholderText = isAgentTyping
    ? (isHindi ? "असिस्टेंट सोच रहा है..." : "Assistant is thinking...")
    : (isHindi 
        ? "दवाइयों, खुराक या टेस्ट परिणामों के बारे में पूछें या बोलें..." 
        : "Ask about your medicines, dosage, or test results...");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSend) {
      onSend();
    }
  };

  return (
    <div className={`border-t border-slate-200/80 bg-white/95 backdrop-blur-md flex flex-col ${className}`}>
      {/* Speech Recognition Active Feedback Bar */}
      {isListening && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-rose-50 via-rose-100/70 to-rose-50 border-b border-rose-200 text-rose-950 text-xs font-bold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <span className="tracking-tight">
              Listening ({currentLanguageName})... Speak your question into microphone.
            </span>
          </div>
          <button
            type="button"
            onClick={onStopListening}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold cursor-pointer transition shadow-xs"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                if (onClearSpeechError) onClearSpeechError();
                if (onStartListening) onStartListening();
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={onClearSpeechError}
              className="text-amber-800 text-xs font-bold hover:underline px-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Send Failure Error Banner */}
      {sendError && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-950 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{sendError}</span>
          </div>
          <button
            type="button"
            onClick={onRetryLastQuery}
            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 active:scale-95 flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Form Input Controls */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 flex items-center gap-2.5">
        {/* Voice Input Trigger Button */}
        <button
          type="button"
          onClick={isListening ? onStopListening : onStartListening}
          aria-label={isListening ? "Stop voice listening" : "Start voice listening"}
          className={`p-3 rounded-2xl transition cursor-pointer shrink-0 active:scale-95 ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-md ring-4 ring-rose-200'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/80 shadow-2xs'
          }`}
          title={isListening ? "Click to stop listening" : "Tap to speak your question"}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText && setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isAgentTyping}
            placeholder={placeholderText}
            className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200/90 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 font-medium text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50 transition-all shadow-inner"
          />
        </div>

        {/* Send Action Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isAgentTyping}
          aria-label="Send message"
          className="p-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white transition cursor-pointer shrink-0 shadow-xs shadow-emerald-700/20"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default ChatInputBar;
