import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, Camera, Bot, FileText } from 'lucide-react';

export function BottomNav({ documentsCount = 0 }) {
  const tabs = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/summary', label: 'Vitals', icon: Activity },
    { to: '/scanner', label: 'Scan', icon: Camera, isCenter: true },
    { to: '/agent', label: 'Assistant', icon: Bot },
    { to: '/records', label: 'Records', icon: FileText, badge: documentsCount },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-emerald-800/15 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.08)] select-none"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;

        if (tab.isCenter) {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative -top-5 flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-tr from-[#1f5705] to-[#297006] text-white ring-4 ring-emerald-200 scale-105 shadow-emerald-800/30'
                        : 'bg-[#052e0a] text-white hover:bg-[#297006]'
                    }`}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2px]" />
                  </div>
                  <span
                    className={`text-[10px] font-extrabold mt-1 transition-colors ${
                      isActive ? 'text-[#297006]' : 'text-slate-500'
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
              `relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all duration-150 cursor-pointer focus:outline-none ${
                isActive
                  ? 'text-[#297006] font-black'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-[#ff9800] text-gray-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#297006] mt-0.5"></span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
