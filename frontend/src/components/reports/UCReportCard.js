// frontend/src/components/UCReportCard.js
import React from 'react';
import { FileCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UCReportCard = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/uc-management');
  };

  const colorConfig = {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
    text: 'text-emerald-600 dark:text-emerald-400'
  };

  return (
    <div
      onClick={handleClick}
      className={`
        ${colorConfig.bg} ${colorConfig.border} backdrop-blur-sm rounded-xl shadow-sm border-2 p-6 
        cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
      `}
    >
      <div className={`${colorConfig.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
        <FileCheck className={colorConfig.icon} size={24} />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Utilization Certificates (UC)
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Generate GFR 12-A format utilization certificates for financial year reporting
      </p>

      <div className={`flex items-center text-sm font-medium ${colorConfig.text}`}>
        <span>Manage UCs</span>
        <ChevronRight size={16} className="ml-1" />
      </div>
    </div>
  );
};

export default UCReportCard;