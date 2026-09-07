import React from 'react';

export function Badge({ 
  children, 
  variant = 'default',
  className = '',
  ...props
}) {
  const variants = {
    default: 'bg-[#cbf5d6] text-[#052e0a]',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    blue: 'bg-blue-100 text-blue-800 border border-blue-200',
  };

  return (
    <span 
      className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold leading-none inline-flex items-center justify-center ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
