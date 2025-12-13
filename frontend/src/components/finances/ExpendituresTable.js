// frontend/src/components/finances/ExpendituresTable.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import projectService from '../../services/projectService';

const ExpendituresTable = ({
  expenditures,
  head,
  canEdit,
  projectId,
  onRefresh,
  onEditExpenditure,
}) => {
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState({ show: false, expenditure: null });
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  const hasBreakdown = head === 'manpower' || head === 'equipment';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleRowExpansion = (key) => {
    if (!hasBreakdown) return;
    
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getExpenditureKey = (exp) => {
    return exp.manpower_id || exp.equipment_id || exp.expenditure_id;
  };

  const getExpenditureAmount = (exp) => {
    return exp.total_cost || exp.amount;
  };

  const getExpenditureDate = (exp) => {
    if (head === 'manpower' || head === 'equipment') {
      return formatDate(exp.date_incurred || exp.purchase_date);
    } else {
      return formatDate(exp.date_incurred);
    }
  };

  const handleEdit = (exp, e) => {
    e.stopPropagation();
    if (head === 'manpower') {
      navigate(`/projects/${projectId}/finances/manpower/edit/${exp.manpower_id}`);
    } else if (head === 'equipment') {
      navigate(`/projects/${projectId}/finances/equipment/edit/${exp.equipment_id}`);
    } else {
      navigate(`/projects/${projectId}/finances/expenditure/edit/${exp.expenditure_id}`);
    }
  };

  const handleDeleteClick = (exp, e) => {
    e.stopPropagation();
    setDeleteModal({ show: true, expenditure: exp });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.expenditure) return;

    setDeleting(true);
    try {
      if (head === 'manpower') {
        await projectService.deleteManpower(deleteModal.expenditure.manpower_id);
      } else if (head === 'equipment') {
        await projectService.deleteEquipment(deleteModal.expenditure.equipment_id);
      } else {
        await projectService.deleteExpenditure(deleteModal.expenditure.expenditure_id);
      }

      setDeleteModal({ show: false, expenditure: null });
      onRefresh();

    } catch (err) {
      console.error('Error deleting expenditure:', err);
      alert('Failed to delete expenditure. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getDeleteModalContent = () => {
    const exp = deleteModal.expenditure;
    if (!exp) return null;

    return (
      <>
        Are you sure you want to delete this expenditure?
        <div className="mt-2 p-3 bg-gray-100 dark:bg-slate-700 rounded">
          {head === 'manpower' && (
            <>
              <p className="text-gray-900 dark:text-gray-100"><strong>Role:</strong> {exp.role}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Salary:</strong> {formatCurrency(exp.salary_per_month)}/month</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Duration:</strong> {exp.months} month{exp.months !== 1 ? 's' : ''}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Personnel:</strong> {exp.num_personnel}</p>
            </>
          )}
          {head === 'equipment' && (
            <>
              <p className="text-gray-900 dark:text-gray-100"><strong>Item:</strong> {exp.name}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Quantity:</strong> {exp.quantity}</p>
              <p className="text-gray-900 dark:text-gray-100"><strong>Unit Cost:</strong> {formatCurrency(exp.unit_cost)}</p>
            </>
          )}
          {head !== 'manpower' && head !== 'equipment' && (
            <>
              <p className="text-gray-900 dark:text-gray-100"><strong>Description:</strong> {exp.description || '-'}</p>
            </>
          )}
          <p className="mt-2 text-gray-900 dark:text-gray-100"><strong>Total Amount:</strong> {formatCurrency(getExpenditureAmount(exp))}</p>
        </div>
        <p className="mt-2 text-red-600 dark:text-red-400 font-semibold">This action cannot be undone.</p>
      </>
    );
  };

  // Render breakdown table for Equipment
  const renderEquipmentBreakdown = (exp) => {
    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Equipment Breakdown</h4>
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
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{exp.name}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{exp.quantity}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{formatCurrency(exp.unit_cost)}</td>
                <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(exp.total_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {exp.justification && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-gray-700 dark:text-gray-300">
            <strong>Justification:</strong> {exp.justification}
          </div>
        )}
      </div>
    );
  };

  // Render breakdown table for Manpower
  const renderManpowerBreakdown = (exp) => {
    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Manpower Breakdown</h4>
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
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{exp.role}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{formatCurrency(exp.salary_per_month)}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{exp.months}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{exp.num_personnel}</td>
                <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(exp.total_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {exp.justification && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-gray-700 dark:text-gray-300">
            <strong>Justification:</strong> {exp.justification}
          </div>
        )}
      </div>
    );
  };

  const renderBreakdown = (exp) => {
    if (head === 'equipment') {
      return renderEquipmentBreakdown(exp);
    } else if (head === 'manpower') {
      return renderManpowerBreakdown(exp);
    }
    return null;
  };

  const getRowSummary = (exp) => {
    if (head === 'manpower') {
      return (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{exp.role}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {exp.num_personnel} personnel × {exp.months} months
          </div>
        </div>
      );
    } else if (head === 'equipment') {
      return (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{exp.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Qty: {exp.quantity} × {formatCurrency(exp.unit_cost)}
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{exp.description || 'Expenditure'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
            {exp.vendor && <div>Vendor: {exp.vendor}</div>}
            {exp.invoice_number && <div>Invoice: {exp.invoice_number}</div>}
            {exp.justification && <div>Justification: {exp.justification}</div>}
          </div>
        </div>
      );
    }
  };

  if (!expenditures || expenditures.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No expenditures recorded yet
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
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Details
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {expenditures.map((exp, idx) => {
              const uniqueKey = getExpenditureKey(exp);
              const isExpanded = expandedRows[uniqueKey];
              
              return (
                <React.Fragment key={uniqueKey}>
                  <tr 
                    className={hasBreakdown ? "hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" : "hover:bg-gray-50 dark:hover:bg-slate-700/50"}
                    onClick={() => hasBreakdown && toggleRowExpansion(uniqueKey)}
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
                      {getExpenditureDate(exp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {getRowSummary(exp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(getExpenditureAmount(exp))}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditExpenditure({ ...exp, head });
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(exp, e)}
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
                        {renderBreakdown(exp)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <DeleteConfirmationModal
          title="Delete Expenditure"
          message={getDeleteModalContent()}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal({ show: false, expenditure: null })}
          loading={deleting}
        />
      )}
    </>
  );
};

export default ExpendituresTable;