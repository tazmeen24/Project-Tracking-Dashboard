/**
 * By Project Table Component
 * Dark mode ready with Tailwind's dark: variant
 */

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const ByProjectTable = ({
  data,
  expandedRows,
  toggleRowExpansion,
  formatCurrency,
  getBalanceColor,
  getUtilizationColor,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <thead className="bg-blue-600 dark:bg-blue-800 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold"></th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Project No
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Title</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Technical Group
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              Funding Agency
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Approved Budget
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Funds Received
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Expenditure
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Budget Balance
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Funds Balance
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold">
              Utilization
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((project) => (
            <React.Fragment key={project.project_id}>
              {/* Main Project Row */}
              <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(project.project_id);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none transition-colors"
                  >
                    {expandedRows.has(project.project_id) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {project.project_no}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {project.title}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {project.technical_group || "N/A"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {project.funding_agency || "N/A"}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(project.approved_budget)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                  {formatCurrency(project.funds_received)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                  {formatCurrency(project.expenditure)}
                </td>
                <td
                  className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(
                    project.budget_balance
                  )}`}
                >
                  {formatCurrency(project.budget_balance)}
                </td>
                <td
                  className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(
                    project.funds_balance
                  )}`}
                >
                  {formatCurrency(project.funds_balance)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(
                      project.utilization_percentage
                    )}`}
                  >
                    {project.utilization_percentage.toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Expanded Budget Head Breakdown */}
              {expandedRows.has(project.project_id) && project.budget_heads && (
                <tr>
                  <td colSpan="11" className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <div className="ml-8">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Budget Head Breakdown:
                      </h4>
                      <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                              Budget Head
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                              Approved
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                              Received
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                              Expended
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                              Budget Balance
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                              Funds Balance
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                              Utilization
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {[...project.budget_heads]
                            .sort((a, b) => {
                              const order = [
                                "manpower",
                                "equipment",
                                "travel & training",
                                "travel and training",
                                "consumables",
                                "contingency",
                                "overhead",
                              ];
                              return (
                                order.indexOf(a.name.toLowerCase()) -
                                order.indexOf(b.name.toLowerCase())
                              );
                            })
                            .map((head, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                                  {head.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                                  {formatCurrency(head.approved_budget)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                                  {formatCurrency(head.funds_received)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                                  {formatCurrency(head.expenditure)}
                                </td>
                                <td
                                  className={`px-4 py-2 text-sm text-right font-medium ${getBalanceColor(
                                    head.budget_balance
                                  )}`}
                                >
                                  {formatCurrency(head.budget_balance)}
                                </td>
                                <td
                                  className={`px-4 py-2 text-sm text-right font-medium ${getBalanceColor(
                                    head.funds_balance
                                  )}`}
                                >
                                  {formatCurrency(head.funds_balance)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(
                                      head.utilization_percentage
                                    )}`}
                                  >
                                    {head.utilization_percentage.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ByProjectTable;