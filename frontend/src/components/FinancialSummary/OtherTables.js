/**
 * Additional Table Components for Financial Summary
 * All dark mode compatible with Tailwind dark: variants
 * Place in: frontend/src/components/FinancialSummary/
 */

import React from 'react';
import { Package, Wrench, Beaker, DollarSign, Plane, Building } from 'lucide-react';
import { Users } from 'lucide-react';
import { Building2 } from 'lucide-react';

// ==================================================================
// ByBudgetHeadTable.jsx
// ==================================================================

const budgetHeadIcons = {
  'manpower': Package,
  'equipment': Wrench,
  'consumables': Beaker,
  'contingency': DollarSign,
  'travel & training': Plane,
  'travel and training': Plane,
  'overhead': Building
};

export const ByBudgetHeadTable = ({ data, formatCurrency, getBalanceColor, getUtilizationColor }) => {
  const getIcon = (headName) => {
    const Icon = budgetHeadIcons[(headName || "").toLowerCase()] || DollarSign;
    return <Icon size={20} className="inline mr-2 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <thead className="bg-blue-600 dark:bg-blue-800 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Budget Head</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Projects</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Approved</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Received</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Expended</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Budget Balance
              <div className="text-xs font-normal">(Approved - Expended)</div>
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Funds Balance
              <div className="text-xs font-normal">(Received - Expended)</div>
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                {getIcon(item.budget_head)}
                {item.budget_head}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                  {item.project_count}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(item.total_approved)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(item.total_funds_received)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(item.total_expenditure)}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(item.budget_balance)}`}>
                {formatCurrency(item.budget_balance)}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(item.funds_balance)}`}>
                {formatCurrency(item.funds_balance)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(item.utilization_percentage)}`}>
                  {item.utilization_percentage.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================================================================
// ByTechnicalGroupTable.jsx
// ==================================================================

export const ByTechnicalGroupTable = ({ data, formatCurrency, getBalanceColor, getUtilizationColor }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <thead className="bg-purple-600 dark:bg-purple-800 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Technical Group</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Projects</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Approved</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Received</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Expended</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Budget Balance</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Funds Balance</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                <Users size={18} className="inline mr-2 text-purple-600 dark:text-purple-400" />
                {item.group_name}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">
                  {item.project_count}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(item.total_approved)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(item.total_funds_received)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(item.total_expenditure)}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(item.budget_balance)}`}>
                {formatCurrency(item.budget_balance)}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(item.funds_balance)}`}>
                {formatCurrency(item.funds_balance)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(item.utilization_percentage)}`}>
                  {item.utilization_percentage.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================================================================
// ByFundingAgencyTable.jsx
// ==================================================================

export const ByFundingAgencyTable = ({ data, formatCurrency, getBalanceColor, getUtilizationColor }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <thead className="bg-green-600 dark:bg-green-800 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Funding Agency</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Projects</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Approved</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Received</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Total Expended</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Budget Balance</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Funds Balance</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                <Building2 size={18} className="inline mr-2 text-green-600 dark:text-green-400" />
                {item.agency_name}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-xs font-semibold">
                  {item.project_count}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(item.total_approved)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(item.total_funds_received)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(item.total_expenditure)}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(item.budget_balance)}`}>
                {formatCurrency(item.budget_balance)}
              </td>
              <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(item.funds_balance)}`}>
                {formatCurrency(item.funds_balance)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(item.utilization_percentage)}`}>
                  {item.utilization_percentage.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};