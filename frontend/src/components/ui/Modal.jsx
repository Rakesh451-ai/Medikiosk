import React from 'react';
import { X } from 'lucide-react';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  icon: Icon,
  iconBg = 'bg-[#cbf5d6]',
  iconColor = 'text-[#297006]',
  borderColor = 'border-[#297006]',
  children,
  className = ''
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-gray-900">
      <div className={`bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 ${borderColor} relative max-h-[90vh] overflow-y-auto custom-scrollbar ${className}`}>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {(title || Icon) && (
          <div className="flex items-center gap-3 mb-5">
            {Icon && (
              <div className={`w-12 h-12 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center font-bold shadow-inner`}>
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              {title && <h3 className="text-xl font-bold text-[#052e0a]">{title}</h3>}
              {subtitle && <p className="text-xs text-gray-500 font-medium">{subtitle}</p>}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
