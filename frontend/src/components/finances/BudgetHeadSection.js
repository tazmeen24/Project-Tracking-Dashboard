// frontend/src/components/finances/BudgetHeadSection.js

import React from "react";
import FundsTable from "./FundsTable.js";
import ExpendituresTable from "./ExpendituresTable";

const BudgetHeadSection = ({
  head,
  label,
  icon,
  summary,
  expanded,
  loading,
  details,
  breakdownCache,
  canEdit,
  projectId,
  onExpand,
  onBreakdownExpand,
  onRefresh,
  onEditFund,
  onEditExpenditure,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBalanceColor = () => {
    if (summary.balance < 0) return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
    if (summary.balance < summary.fundsReceived * 0.1)
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
    return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
  };

  const getBalanceIcon = () => {
    if (summary.balance < 0) return "🔴";
    if (summary.balance < summary.fundsReceived * 0.1) return "🟡";
    return "🟢";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-slate-700">
      {/* Header - Always Visible */}
      <button
        onClick={onExpand}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {summary.fundsCount || 0} fund
              {summary.fundsCount !== 1 ? "s" : ""} •{" "}
              {summary.expendituresCount || 0} transaction
              {summary.expendituresCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary Numbers */}
          <div className="text-right hidden md:block">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Received:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.fundsReceived || 0)}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Spent:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.expendituresTotal || 0)}
              </span>
            </p>
          </div>

          {/* Balance Badge */}
          <div
            className={`px-4 py-2 rounded-lg font-semibold ${getBalanceColor()}`}
          >
            <div className="flex items-center gap-2">
              <span>{getBalanceIcon()}</span>
              <span>{formatCurrency(summary.balance || 0)}</span>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <svg
            className={`w-6 h-6 text-gray-400 dark:text-gray-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading details...</span>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Funds Received Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <span>💰</span>
                  Funds Received
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                    (Total: {formatCurrency(summary.fundsReceived || 0)})
                  </span>
                </h4>
                {details.funds && details.funds.length > 0 ? (
                  <FundsTable
                    funds={details.funds}
                    head={head}
                    canEdit={canEdit}
                    projectId={projectId}
                    breakdownCache={breakdownCache}
                    onBreakdownExpand={onBreakdownExpand}
                    onRefresh={onRefresh}
                    onEditFund={onEditFund}
                  />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic py-4">
                    No funds received yet
                  </p>
                )}
              </div>

              {/* Expenditures Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <span>💸</span>
                  Expenditures
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                    (Total: {formatCurrency(summary.expendituresTotal || 0)})
                  </span>
                </h4>
                {details.expenditures && details.expenditures.length > 0 ? (
                  <ExpendituresTable
                    expenditures={details.expenditures}
                    head={head}
                    canEdit={canEdit}
                    projectId={projectId}
                    onRefresh={onRefresh}
                    onEditExpenditure={onEditExpenditure}
                  />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic py-4">
                    No expenditures recorded yet
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic py-4">
              No data available
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetHeadSection;