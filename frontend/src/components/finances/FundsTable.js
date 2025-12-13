// frontend/src/components/finances/FundsTable.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from 'lucide-react';
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import fundsService from '../../services/fundsService';

const FundsTable = ({
  funds,
  head,
  canEdit,
  projectId,
  breakdownCache,
  onBreakdownExpand,
  onRefresh,
  onEditFund,
}) => {
  const navigate = useNavigate();
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});
  const [deleteModal, setDeleteModal] = useState({ show: false, fund: null });
  const [deleting, setDeleting] = useState(false);

  const hasBreakdown = head === "manpower" || head === "equipment";

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderBreakdownTables = (breakdown, head) => {
    if (!breakdown || breakdown.length === 0) return null;

    const isManpower = head === "manpower" || breakdown[0]?.role !== undefined;
    const isEquipment =
      head === "equipment" || breakdown[0]?.item_name !== undefined;

    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50">
        {/* Manpower Table */}
        {isManpower && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Manpower Breakdown
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                <thead className="bg-gray-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Role</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Salary/Month</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Months</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Personnel</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {breakdown.map((m, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{m.role}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(m.salary_per_month)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{m.months}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{m.num_personnel}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(m.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Equipment Table */}
        {isEquipment && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Equipment Breakdown
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                <thead className="bg-gray-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Item</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Unit Cost</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {breakdown.map((e, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{e.item_name}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{e.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(e.unit_cost)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(e.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleBreakdownToggle = async (fundId) => {
    if (!hasBreakdown) return;

    if (!expandedBreakdowns[fundId]) {
      if (!breakdownCache[fundId]) {
        await onBreakdownExpand(fundId);
      }
    }

    setExpandedBreakdowns({
      ...expandedBreakdowns,
      [fundId]: !expandedBreakdowns[fundId],
    });
  };

  const handleEdit = (fundId) => {
    navigate(`/projects/${projectId}/finances/funds/edit/${fundId}`);
  };

  const handleDeleteClick = (fund) => {
    setDeleteModal({ show: true, fund });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.fund) return;

    setDeleting(true);
    try {
      await fundsService.deleteFund(deleteModal.fund.fund_id);
      setDeleteModal({ show: false, fund: null });
      onRefresh();
    } catch (err) {
      console.error("Error deleting fund:", err);
      alert(err.message || "Failed to delete fund. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const getFundRowSummary = (fund) => {
    if (hasBreakdown) {
      const breakdownCount = breakdownCache[fund.fund_id]?.length || 0;
      return (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(fund.amount)}</div>
          {breakdownCount > 0 && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {breakdownCount} item{breakdownCount !== 1 ? 's' : ''} breakdown
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(fund.amount)}</div>
    );
  };

  if (!funds || funds.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No funds received yet
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-100 dark:bg-slate-700">
            <tr>
              {hasBreakdown && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-10">
                  {/* Expand icon column */}
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Date Received
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Remarks
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {funds.map((fund) => {
              const isExpanded = expandedBreakdowns[fund.fund_id];
              
              return (
                <React.Fragment key={fund.fund_id}>
                  <tr
                    className={hasBreakdown ? "hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" : "hover:bg-gray-50 dark:hover:bg-slate-700/50"}
                    onClick={() => hasBreakdown && handleBreakdownToggle(fund.fund_id)}
                  >
                    {hasBreakdown && (
                      <td className="px-4 py-3 text-sm">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(fund.date_received)}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {getFundRowSummary(fund)}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {fund.remarks || "-"}
                    </td>

                    {canEdit && (
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFund({ ...fund, head });
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(fund);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>

                  {hasBreakdown && isExpanded && (
                    <tr>
                      <td colSpan={canEdit ? 5 : 4} className="p-0">
                        {renderBreakdownTables(breakdownCache[fund.fund_id], head)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteModal.show && (
        <DeleteConfirmationModal
          title="Delete Fund Record"
          message={
            <>
              Are you sure you want to delete this fund record?
              <div className="mt-2 p-3 bg-gray-100 dark:bg-slate-700 rounded">
                <p className="text-gray-900 dark:text-gray-100">
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(deleteModal.fund.amount)}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  <strong>Date:</strong>{" "}
                  {formatDate(deleteModal.fund.date_received)}
                </p>
                {deleteModal.fund.remarks && (
                  <p className="text-gray-900 dark:text-gray-100">
                    <strong>Remarks:</strong> {deleteModal.fund.remarks}
                  </p>
                )}
              </div>
              <p className="mt-2 text-red-600 dark:text-red-400 font-semibold">
                This action cannot be undone.
              </p>
            </>
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal({ show: false, fund: null })}
          loading={deleting}
        />
      )}
    </>
  );
};

export default FundsTable;