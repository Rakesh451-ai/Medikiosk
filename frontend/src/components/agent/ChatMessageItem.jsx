import React from 'react';
import { Bot, User, Volume2, StopCircle, PhoneCall, AlertTriangle } from 'lucide-react';

export function ChatMessageItem({
  message,
  isCurrentlySpeaking = false,
  onSpeak,
  onSendQuickReply,
  isAgentTyping = false
}) {
  const isAgent = message.sender === 'agent';
  const isCritical = message.urgency === 'critical' || message.is_emergency;
  const isWarning = message.urgency === 'warning';

  const formattedTime = message.time || (message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <article
      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} animate-fade-in`}
      aria-label={isAgent ? "Health assistant message" : "Patient message"}
    >
      <div className="flex items-end gap-2.5 max-w-[92%] sm:max-w-[85%]">
        {/* Agent Avatar */}
        {isAgent && (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-all ${
              isCritical
                ? 'bg-rose-600 text-white ring-2 ring-rose-300 animate-pulse'
                : 'bg-emerald-800 text-emerald-200 border border-emerald-700'
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-emerald-300" />
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13.5px] font-medium leading-relaxed shadow-xs relative group transition-all ${
            isAgent
              ? isCritical
                ? 'bg-rose-50/95 text-rose-950 border-2 border-rose-300 shadow-rose-100'
                : isWarning
                  ? 'bg-amber-50/95 text-amber-950 border-2 border-amber-300 shadow-amber-100'
                  : 'bg-white text-slate-800 border border-slate-200/80'
              : 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-br-xs shadow-emerald-900/10'
          }`}
        >
          <p className="whitespace-pre-line leading-relaxed">{message.text}</p>

          {/* Agent Action Bar (Read Aloud & Emergency Dial) */}
          {isAgent && (
            <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => onSpeak && onSpeak(message.text, message.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition cursor-pointer ${
                  isCurrentlySpeaking
                    ? 'bg-emerald-600 text-white font-bold animate-pulse shadow-xs'
                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95'
                }`}
                title={isCurrentlySpeaking ? "Stop speaking" : "Listen to this reply"}
                aria-label={isCurrentlySpeaking ? "Stop speaking" : "Read aloud"}
              >
                {isCurrentlySpeaking ? <StopCircle className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isCurrentlySpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
              </button>

              {isCritical && (
                <a
                  href="tel:112"
                  className="inline-flex items-center gap-1.5 font-bold text-rose-700 bg-rose-100/90 hover:bg-rose-200 px-2.5 py-1 rounded-full transition cursor-pointer"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call 112</span>
                </a>
              )}
            </div>
          )}

          {/* Quick Action Suggested Replies */}
          {message.quick_replies && message.quick_replies.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-emerald-100/80 flex flex-wrap gap-1.5">
              {message.quick_replies.map((qr, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSendQuickReply && onSendQuickReply(qr)}
                  disabled={isAgentTyping}
                  className="px-3 py-1 rounded-full bg-emerald-50/90 hover:bg-emerald-100 active:scale-95 border border-emerald-200/90 text-xs font-bold text-emerald-950 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Avatar */}
        {!isAgent && (
          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs border border-emerald-600">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Timestamp */}
      {formattedTime && (
        <span className="text-[10px] text-slate-400 mt-1 px-11 select-none">
          {formattedTime}
        </span>
      )}
    </article>
  );
}

export default ChatMessageItem;
