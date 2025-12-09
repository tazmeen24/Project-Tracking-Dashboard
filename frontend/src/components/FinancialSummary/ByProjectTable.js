/**
 * By Project Table Component
 * Shows projects with expandable budget head breakdown
 * Place in: frontend/src/components/FinancialSummary/ByProjectTable.jsx
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
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-blue-600 text-white">
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
        <tbody>
          {data.map((project) => (
            <React.Fragment key={project.project_id}>
              {/* Main Project Row */}
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(project.project_id);
                    }}
                    className="text-blue-600 hover:text-blue-800 focus:outline-none"
                  >
                    {expandedRows.has(project.project_id) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {project.project_no}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {project.title}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.technical_group || "N/A"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {project.funding_agency || "N/A"}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold">
                  {formatCurrency(project.approved_budget)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatCurrency(project.funds_received)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
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
                  <td colSpan="11" className="px-4 py-2 bg-gray-50">
                    <div className="ml-8">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Budget Head Breakdown:
                      </h4>
                      <table className="min-w-full bg-white border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                              Budget Head
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                              Approved
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                              Received
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                              Expended
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                              Budget Balance
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                              Funds Balance
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                              Utilization
                            </th>
                          </tr>
                        </thead>
                        <tbody>
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
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="px-4 py-2 text-sm text-gray-700 capitalize">
                                  {head.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {formatCurrency(head.approved_budget)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {formatCurrency(head.funds_received)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
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
                                    className={`px-2 py-1 rounded-full text-xs ${getUtilizationColor(
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
