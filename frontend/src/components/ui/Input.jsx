import React from 'react';

export function Input({ 
  label, 
  icon: Icon,
  className = '', 
  ...props 
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="font-bold text-gray-700 block mb-1 text-xs">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006] transition-shadow text-sm`}
          {...props}
        />
      </div>
    </div>
  );
}

export function Select({
  label,
  options = [],
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="font-bold text-gray-700 block mb-1 text-xs">{label}</label>}
      <select
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#297006] transition-shadow text-sm"
        {...props}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
    </div>
  );
}
