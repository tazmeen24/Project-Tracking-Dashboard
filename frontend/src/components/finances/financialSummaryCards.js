// frontend/src/components/finances/FinancialSummaryCards.js

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
    if (totalBalance < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (totalBalance < totalFunds * 0.1) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Funds Received */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500 dark:border-blue-400">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Funds Received
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalFunds)}
            </p>
          </div>
          <div className="text-4xl">💰</div>
        </div>
      </div>

      {/* Total Spent */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500 dark:border-purple-400">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Spent
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="text-4xl">💸</div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full"
              style={{ width: `${Math.min((totalSpent / totalFunds) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {((totalSpent / totalFunds) * 100).toFixed(1)}% utilized
          </p>
        </div>
      </div>

      {/* Available Balance */}
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 ${
        totalBalance < 0 ? 'border-red-500 dark:border-red-400' : 
        totalBalance < totalFunds * 0.1 ? 'border-yellow-500 dark:border-yellow-400' : 
        'border-green-500 dark:border-green-400'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
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
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
            ⚠️ Overspent
          </p>
        )}
        {totalBalance >= 0 && totalBalance < totalFunds * 0.1 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
            ⚠️ Low balance
          </p>
        )}
      </div>
    </div>
  );
};

export default FinancialSummaryCards;