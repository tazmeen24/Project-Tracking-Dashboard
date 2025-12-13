// components/common/Button.js
import React from 'react';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800';
  
  const variants = {
    primary: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-blue-300 dark:disabled:bg-blue-800',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 focus:ring-slate-500 dark:focus:ring-slate-400 disabled:bg-slate-50 dark:disabled:bg-slate-800',
    success: 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-emerald-500 dark:focus:ring-emerald-400 disabled:bg-emerald-300 dark:disabled:bg-emerald-800',
    danger: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-400 disabled:bg-red-300 dark:disabled:bg-red-800',
    warning: 'bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-700 focus:ring-amber-500 dark:focus:ring-amber-400 disabled:bg-amber-300 dark:disabled:bg-amber-800',
    ghost: 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-slate-500 dark:focus:ring-slate-400 disabled:bg-transparent disabled:text-slate-400 dark:disabled:text-slate-600',
    outline: 'bg-transparent border-2 border-slate-900 dark:border-slate-300 text-slate-900 dark:text-slate-100 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white focus:ring-slate-500 dark:focus:ring-slate-400 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:text-slate-400 dark:disabled:text-slate-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${
    disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
  }`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5 mr-2" />}
          {children}
          {IconRight && <IconRight className="w-5 h-5 ml-2" />}
        </>
      )}
    </button>
  );
};

export default Button;