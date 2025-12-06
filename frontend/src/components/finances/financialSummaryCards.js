// frontend/src/components/finances/FinancialSummaryCards.jsx

import React from 'react';

const FinancialSummaryCards = ({ totalFunds, totalSpent, totalBalance }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getBalanceColor = () => {
    if (totalBalance < 0) return 'text-red-600 bg-red-50';
    if (totalBalance < totalFunds * 0.1) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Funds Received */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Total Funds Received
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalFunds)}
            </p>
          </div>
          <div className="text-4xl">💰</div>
        </div>
      </div>

      {/* Total Spent */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Total Spent
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="text-4xl">💸</div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${Math.min((totalSpent / totalFunds) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {((totalSpent / totalFunds) * 100).toFixed(1)}% utilized
          </p>
        </div>
      </div>

      {/* Available Balance */}
      <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
        totalBalance < 0 ? 'border-red-500' : 
        totalBalance < totalFunds * 0.1 ? 'border-yellow-500' : 
        'border-green-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Available Balance
            </p>
            <p className={`text-2xl font-bold ${getBalanceColor()}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="text-4xl">
            {totalBalance < 0 ? '🔴' : totalBalance < totalFunds * 0.1 ? '🟡' : '🟢'}
          </div>
        </div>
        {totalBalance < 0 && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ⚠️ Overspent
          </p>
        )}
        {totalBalance >= 0 && totalBalance < totalFunds * 0.1 && (
          <p className="text-xs text-yellow-600 mt-2 font-medium">
            ⚠️ Low balance
          </p>
        )}
      </div>
    </div>
  );
};

export default FinancialSummaryCards;