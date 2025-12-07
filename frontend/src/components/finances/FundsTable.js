// frontend/src/components/finances/FundsTable.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

const FundsTable = ({
  funds,
  head,
  canEdit,
  projectId,
  breakdownCache,
  onBreakdownExpand,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});
  const [deleteModal, setDeleteModal] = useState({ show: false, fund: null });
  const [deleting, setDeleting] = useState(false);

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

    // Detect type based on fields present
    const isManpower = head === "manpower" || breakdown[0]?.role !== undefined;
    const isEquipment =
      head === "equipment" || breakdown[0]?.item_name !== undefined;

    return (
      <div className="mt-4 space-y-6">
        {/* Manpower Table */}
        {isManpower && (
          <div className="border rounded-lg">
            <div className="bg-gray-100 px-4 py-2 font-semibold">
              Manpower Breakdown
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Salary/Month</th>
                  <th className="px-3 py-2 text-left">Months</th>
                  <th className="px-3 py-2 text-left">Personnel</th>
                  <th className="px-3 py-2 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((m, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{m.role}</td>
                    <td className="px-3 py-2">
                      ₹{m.salary_per_month?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{m.months}</td>
                    <td className="px-3 py-2">{m.num_personnel}</td>
                    <td className="px-3 py-2">
                      ₹{m.total_amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Equipment Table */}
        {isEquipment && (
          <div className="border rounded-lg">
            <div className="bg-gray-100 px-4 py-2 font-semibold">
              Equipment Breakdown
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Unit Cost</th>
                  <th className="px-3 py-2 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((e, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{e.item_name}</td>
                    <td className="px-3 py-2">{e.quantity}</td>
                    <td className="px-3 py-2">
                      ₹{e.unit_cost?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      ₹{e.total_amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const handleBreakdownToggle = async (fundId) => {
    console.log("🔍 Requesting breakdown for fund_id:", fundId);
    if (!expandedBreakdowns[fundId]) {
      // Expanding - fetch breakdown if not cached
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
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:8000/funds/received/${deleteModal.fund.fund_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to delete fund");
      }

      // Success - close modal and refresh
      setDeleteModal({ show: false, fund: null });
      onRefresh();
    } catch (err) {
      console.error("Error deleting fund:", err);
      alert("Failed to delete fund. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const hasBreakdown = (head) => {
    return head === "manpower" || head === "equipment";
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Date Received
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              {hasBreakdown(head) && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Breakdown
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Remarks
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {funds.map((fund) => (
              <React.Fragment key={fund.fund_id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(fund.date_received)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(fund.amount)}
                  </td>
                  {hasBreakdown(head) && (
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleBreakdownToggle(fund.fund_id)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {breakdownCache[fund.fund_id] &&
                        breakdownCache[fund.fund_id].length > 0 ? (
                          <>
                            {breakdownCache[fund.fund_id].length} item
                            {breakdownCache[fund.fund_id].length !== 1
                              ? "s"
                              : ""}
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                expandedBreakdowns[fund.fund_id]
                                  ? "rotate-180"
                                  : ""
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
                          </>
                        ) : (
                          <span>View breakdown ▼</span>
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {fund.remarks || "-"}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleEdit(fund.fund_id)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(fund)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>

                {/* Breakdown Row */}
                {expandedBreakdowns[fund.fund_id] && (
                  <tr>
                    <td colSpan="100%" className="bg-gray-50 px-6 py-4">
                      {renderBreakdownTables(
                        breakdownCache[fund.fund_id],
                        head
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <DeleteConfirmationModal
          title="Delete Fund Record"
          message={
            <>
              Are you sure you want to delete this fund record?
              <div className="mt-2 p-3 bg-gray-100 rounded">
                <p>
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(deleteModal.fund.amount)}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(deleteModal.fund.date_received)}
                </p>
                {deleteModal.fund.remarks && (
                  <p>
                    <strong>Remarks:</strong> {deleteModal.fund.remarks}
                  </p>
                )}
              </div>
              <p className="mt-2 text-red-600 font-semibold">
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
