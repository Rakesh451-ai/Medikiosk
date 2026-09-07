import React from 'react';
import { Link } from 'react-router-dom';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  to,
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary: 'bg-[#052e0a] hover:bg-[#0a4213] text-white shadow-md',
    secondary: 'bg-[#297006] hover:bg-[#1f5705] text-white shadow-md',
    accent: 'bg-[#ff9800] hover:bg-[#f57c00] text-gray-950 shadow-md',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md',
    outline: 'bg-transparent border-2 border-emerald-200 text-[#052e0a] hover:bg-emerald-50',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-none shadow-none active:scale-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base md:text-lg gap-2.5',
    icon: 'p-2'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`;

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon className={size === 'sm' || size === 'icon' ? 'w-4 h-4' : 'w-5 h-5'} />}
      {children && <span>{children}</span>}
      {Icon && iconPosition === 'right' && <Icon className={size === 'sm' || size === 'icon' ? 'w-4 h-4' : 'w-5 h-5'} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {content}
    </button>
  );
}
