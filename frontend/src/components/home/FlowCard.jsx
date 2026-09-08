import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function FlowCard({
  to,
  icon: Icon,
  title,
  routeBadge,
  description,
  features = [],
  actionLabel,
  colorScheme = 'emerald', // 'emerald' | 'blue'
  className = ''
}) {
  const isBlue = colorScheme === 'blue';

  const themeClasses = isBlue ? {
    border: 'border-blue-200/90 hover:border-blue-500',
    shadowHover: 'hover:shadow-blue-600/15',
    iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-500/20',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200',
    actionText: 'text-blue-700 group-hover:text-blue-800',
    cornerGlow: 'from-blue-50/50',
    ringFocus: 'focus:ring-blue-400'
  } : {
    border: 'border-emerald-200/90 hover:border-emerald-500',
    shadowHover: 'hover:shadow-emerald-600/15',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-emerald-500/20',
    badge: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
    actionText: 'text-emerald-700 group-hover:text-emerald-800',
    cornerGlow: 'from-emerald-50/50',
    ringFocus: 'focus:ring-emerald-400'
  };

  return (
    <Link
      to={to}
      className={`group relative bg-white/95 backdrop-blur-sm border-2 ${themeClasses.border} rounded-3xl p-7 sm:p-8 shadow-md shadow-slate-900/5 hover:-translate-y-1 hover:shadow-2xl ${themeClasses.shadowHover} transition-all duration-300 flex flex-col justify-between overflow-hidden focus:outline-none focus:ring-4 ${themeClasses.ringFocus} ${className}`}
    >
      {/* Decorative ambient corner glow */}
      <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl ${themeClasses.cornerGlow} to-transparent rounded-bl-full pointer-events-none opacity-80 group-hover:scale-125 transition-transform duration-500`} />

      <div className="space-y-5 relative z-10">
        {/* Flow Icon */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${themeClasses.iconBg} flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:rotate-1 transition-all duration-300`}>
          {Icon && <Icon className="w-7 h-7 sm:w-8 sm:h-8" />}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            {routeBadge && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full ${themeClasses.badge} font-bold border shadow-2xs`}>
                {routeBadge}
              </span>
            )}
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
            {description}
          </p>
        </div>

        {/* Feature Highlights Checklist */}
        {features && features.length > 0 && (
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-100">
            {features.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <li key={idx} className="flex items-center gap-2.5">
                  {ItemIcon && <ItemIcon className={`w-4 h-4 shrink-0 ${item.iconColor || (isBlue ? 'text-blue-600' : 'text-emerald-600')}`} />}
                  <span className="leading-tight">{item.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Action Footer Link */}
      <div className={`mt-8 pt-4 border-t border-slate-100/80 flex items-center justify-between font-extrabold text-sm sm:text-base ${themeClasses.actionText} transition-colors relative z-10`}>
        <span>{actionLabel}</span>
        <div className="w-8 h-8 rounded-full bg-slate-100/80 group-hover:bg-current/10 flex items-center justify-center transition-colors">
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default FlowCard;
