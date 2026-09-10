import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Camera, Bot, FileText } from 'lucide-react';

export function BottomNav({ documentsCount = 0 }) {
  const tabs = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/summary', label: 'Doctor Summary', icon: ClipboardList },
    { to: '/scanner', label: 'Scan', icon: Camera, isCenter: true },
    { to: '/agent', label: 'Assistant', icon: Bot },
    { to: '/records', label: 'Records', icon: FileText, badge: documentsCount },
  ];

  return (
    <nav
      aria-label="Universal Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 select-none 
                 bg-white/95 backdrop-blur-2xl border-t border-emerald-800/15 px-3 py-2
                 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl lg:max-w-3xl md:w-[92%]
                 md:rounded-full md:border-2 md:border-emerald-700/20 md:shadow-[0_14px_45px_rgba(18,56,38,0.18)]
                 md:px-8 md:py-2.5 transition-all duration-300"
    >
      <div className="flex items-center justify-around w-full md:gap-4 lg:gap-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="relative flex flex-col items-center group cursor-pointer focus:outline-none"
                title="Scan Doctor Slip or Prescription"
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`w-13 h-13 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 ${isActive
                        ? 'bg-gradient-to-tr from-[#143d03] via-[#1f5705] to-[#297006] text-white ring-4 ring-emerald-300 scale-105 shadow-emerald-900/40'
                        : 'bg-[#052e0a] text-white hover:bg-[#297006] shadow-md'
                        }`}
                    >
                      <Icon className="w-6 h-6 md:w-7 md:h-7 stroke-[2.2px]" />
                    </div>
                    <span
                      className={`text-[10px] md:text-xs font-black mt-1 transition-colors ${isActive ? 'text-[#184a32]' : 'text-slate-600'
                        }`}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
              className={({ isActive }) =>
                `relative flex flex-col items-center py-1 px-3 md:px-5 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none hover:scale-105 ${isActive
                  ? 'text-[#184a32] font-black'
                  : 'text-slate-500 hover:text-slate-900 font-bold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    {tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 bg-[#ff9800] text-gray-950 font-black text-[9px] md:text-[10px] rounded-full flex items-center justify-center shadow-xs">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs mt-0.5">{tab.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#184a32] mt-0.5"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
