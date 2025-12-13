// components/common/Input.js
import React from 'react';

const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2 
            ${Icon ? 'pl-10' : ''} 
            border rounded-xl
            bg-white dark:bg-slate-700
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            ${error 
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400' 
              : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 dark:focus:ring-blue-400'
            }
            focus:outline-none focus:ring-2 focus:border-transparent
            transition-all duration-200
            disabled:bg-slate-50 dark:disabled:bg-slate-800 
            disabled:text-slate-500 dark:disabled:text-slate-400 
            disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

export default Input;