import React from 'react';
import { Home, ScanLine, Bot, FileText, Sparkles } from 'lucide-react';

export function MobileNavBar({ activeTab, onSelectTab, unreadAgent = 0, docCount = 0 }) {
  const tabs = [
    { id: 'summary', label: 'Summary', icon: Home },
    { id: 'doc', label: 'Scanner', icon: ScanLine, isCenter: true },
    { id: 'agent', label: 'AI Agent', icon: Bot, badge: unreadAgent },
    { id: 'records', label: 'Records', icon: FileText, badge: docCount },
  ];

  return (
    <nav className="w-full bg-white/95 backdrop-blur-md border-t border-[#297006]/20 px-3 py-2 flex items-center justify-around shadow-lg z-40 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="relative -top-5 flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#297006] text-white ring-4 ring-[#cbf5d6] scale-105'
                    : 'bg-[#052e0a] text-white hover:bg-[#297006]'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-bold mt-1 transition-colors ${
                  isActive ? 'text-[#297006]' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all duration-150 cursor-pointer ${
              isActive
                ? 'text-[#297006] font-bold'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#ff9800] text-black font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">{tab.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#297006] mt-0.5"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
