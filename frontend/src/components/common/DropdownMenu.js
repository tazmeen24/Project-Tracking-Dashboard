// components/common/DropdownMenu.js
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

const DropdownMenu = ({ children, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-slate-600" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${alignmentClasses[align]} top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[100] animate-scaleIn`}
        >
          {React.Children.map(children, (child) =>
            React.cloneElement(child, {
              onClose: handleClose,
            })
          )}
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-scaleIn {
          animation: scaleIn 0.15s ease-out;
        }
      `}</style>
    </div>
  );
};

export const DropdownMenuItem = ({ icon: Icon, children, onClick, onClose, variant = 'default' }) => {
  const variantClasses = {
    default: 'text-slate-700 hover:bg-slate-50',
    danger: 'text-red-600 hover:bg-red-50',
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${variantClasses[variant]}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </button>
  );
};

export default DropdownMenu;