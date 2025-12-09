import React from 'react';
import { CheckCircle, TrendingUp, Clock, Activity } from 'lucide-react';

const KPICards = ({ data }) => {
  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const getComplianceColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationColor = (rate) => {
    if (rate >= 80 && rate <= 100) return 'text-green-600';
    if (rate > 100) return 'text-red-600';
    return 'text-yellow-600';
  };

  const kpiCards = [
    {
      title: 'Budget Compliance Rate',
      value: formatPercentage(data.budget_compliance_rate),
      description: 'Projects within approved budget',
      icon: CheckCircle,
      colorClass: getComplianceColor(data.budget_compliance_rate),
      bgGradient: 'from-green-50 to-green-100',
      iconBg: 'bg-green-600',
      detail: `${Math.round((data.budget_compliance_rate / 100) * (data.active_projects_count + data.completed_projects_count))} compliant projects`
    },
    {
      title: 'Funds Utilization Rate',
      value: formatPercentage(data.funds_utilization_rate),
      description: 'Funds spent vs received',
      icon: TrendingUp,
      colorClass: getUtilizationColor(data.funds_utilization_rate),
      bgGradient: 'from-blue-50 to-blue-100',
      iconBg: 'bg-blue-600',
      detail: data.funds_utilization_rate > 100 ? 'Over-utilized' : 'Within limits'
    },
    {
      title: 'Avg Time to First Funds',
      value: data.avg_time_to_first_funds 
        ? `${Math.round(data.avg_time_to_first_funds)} days`
        : 'N/A',
      description: 'From project start to first payment',
      icon: Clock,
      colorClass: 'text-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      iconBg: 'bg-purple-600',
      detail: data.avg_time_to_first_funds 
        ? `~${Math.round(data.avg_time_to_first_funds / 30)} months`
        : 'No data available'
    },
    {
      title: 'Active Projects',
      value: data.active_projects_count,
      description: 'Currently running projects',
      icon: Activity,
      colorClass: 'text-orange-600',
      bgGradient: 'from-orange-50 to-orange-100',
      iconBg: 'bg-orange-600',
      detail: `${data.completed_projects_count} completed`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${kpi.bgGradient} rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${kpi.iconBg} rounded-lg p-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className={`text-3xl font-bold mb-2 ${kpi.colorClass}`}>
              {kpi.value}
            </div>
            
            <div className="text-sm font-medium text-gray-700 mb-1">
              {kpi.title}
            </div>
            
            <div className="text-xs text-gray-600 mb-2">
              {kpi.description}
            </div>
            
            <div className="pt-3 mt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {kpi.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;