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
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2 
            ${Icon ? 'pl-10' : ''} 
            border rounded-xl
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-slate-500'}
            focus:outline-none focus:ring-2 focus:border-transparent
            transition-all duration-200
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;