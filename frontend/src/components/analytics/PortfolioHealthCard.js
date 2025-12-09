import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Briefcase } from 'lucide-react';

const PortfolioHealthCard = ({ data }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const getBalanceColor = (balance) => {
    if (balance >= 0) return 'text-green-600';
    return 'text-red-600';
  };

  const getBalanceIcon = (balance) => {
    if (balance >= 0) return <TrendingUp className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Projects */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-600 rounded-lg p-2">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.total_projects}
          </div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>

        {/* Total Budget Value */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-600 rounded-lg p-2">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.total_budget_value)}
          </div>
          <div className="text-sm text-gray-600">Total Budget</div>
        </div>

        {/* Total Funds Received */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-600 rounded-lg p-2">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs font-medium text-green-700">
              {formatPercentage(data.funds_vs_budget_percentage)} of budget
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.total_funds_received)}
          </div>
          <div className="text-sm text-gray-600">Funds Received</div>
        </div>

        {/* Total Expenditure */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-orange-600 rounded-lg p-2">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.total_expenditure)}
          </div>
          <div className="text-sm text-gray-600">Total Expenditure</div>
        </div>
      </div>

      {/* Balance Information */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Funds Balance */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 mb-1">Current Funds Balance</div>
              <div className={`text-xl font-bold flex items-center gap-2 ${getBalanceColor(data.current_funds_balance)}`}>
                {getBalanceIcon(data.current_funds_balance)}
                {formatCurrency(data.current_funds_balance)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Actual cash position (funds - expenditure)
              </div>
            </div>
          </div>

          {/* Budget Balance */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 mb-1">Current Budget Balance</div>
              <div className={`text-xl font-bold flex items-center gap-2 ${getBalanceColor(data.current_budget_balance)}`}>
                {getBalanceIcon(data.current_budget_balance)}
                {formatCurrency(data.current_budget_balance)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Remaining budget authorization (budget - expenditure)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioHealthCard;