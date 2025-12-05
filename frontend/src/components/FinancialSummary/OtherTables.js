/**
 * Additional Table Components for Financial Summary
 * Place all in: frontend/src/components/FinancialSummary/
 */

// ==================================================================
// ByBudgetHeadTable.js
// ==================================================================

import React from 'react';
import { Package, Wrench, Beaker, DollarSign, Plane, Building } from 'lucide-react';
import { Users } from 'lucide-react';
import { Building2 } from 'lucide-react';

const budgetHeadIcons = {
  'manpower': Package,
  'equipment': Wrench,
  'consumables': Beaker,
  'contingency': DollarSign,
  'travel & training': Plane,
  'overhead': Building
};

export const ByBudgetHeadTable = ({ data, formatCurrency, getBalanceColor, getUtilizationColor }) => {
  const getIcon = (headName) => {
    const Icon = budgetHeadIcons[(headName || "").toLowerCase()] || DollarSign;
    return <Icon size={20} className="inline mr-2 text-blue-600" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-blue-600 text-white">
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
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                {getIcon(item.budget_head)}
                {item.budget_head}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  {item.project_count}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold">
                {formatCurrency(item.total_approved)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(item.total_funds_received)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
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
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-purple-600 text-white">
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
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                <Users size={18} className="inline mr-2 text-purple-600" />
                {item.group_name}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                  {item.project_count}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold">
                {formatCurrency(item.total_approved)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(item.total_funds_received)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
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
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-green-600 text-white">
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
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                <Building2 size={18} className="inline mr-2 text-green-600" />
                {item.agency_name}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  {item.project_count}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold">
                {formatCurrency(item.total_approved)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(item.total_funds_received)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
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