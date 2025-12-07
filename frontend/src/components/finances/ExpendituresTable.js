// frontend/src/components/finances/ExpendituresTable.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ExpendituresTable = ({
  expenditures,
  head,
  canEdit,
  projectId,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState({ show: false, expenditure: null });
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

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
      const token = localStorage.getItem('token');
      let url;
      
      if (head === 'manpower') {
        url = `http://localhost:8000/manpower/${deleteModal.expenditure.manpower_id}`;
      } else if (head === 'equipment') {
        url = `http://localhost:8000/equipment/${deleteModal.expenditure.equipment_id}`;
      } else {
        url = `http://localhost:8000/expenditure/${deleteModal.expenditure.expenditure_id}`;
      }

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to delete expenditure');
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
        <div className="mt-2 p-3 bg-gray-100 rounded">
          {head === 'manpower' && (
            <>
              <p><strong>Role:</strong> {exp.role}</p>
              <p><strong>Salary:</strong> {formatCurrency(exp.salary_per_month)}/month</p>
              <p><strong>Duration:</strong> {exp.months} month{exp.months !== 1 ? 's' : ''}</p>
              <p><strong>Personnel:</strong> {exp.num_personnel}</p>
            </>
          )}
          {head === 'equipment' && (
            <>
              <p><strong>Item:</strong> {exp.name}</p>
              <p><strong>Quantity:</strong> {exp.quantity}</p>
              <p><strong>Unit Cost:</strong> {formatCurrency(exp.unit_cost)}</p>
            </>
          )}
          {head !== 'manpower' && head !== 'equipment' && (
            <>
              <p><strong>Description:</strong> {exp.description || '-'}</p>
            </>
          )}
          <p className="mt-2"><strong>Total Amount:</strong> {formatCurrency(getExpenditureAmount(exp))}</p>
        </div>
        <p className="mt-2 text-red-600 font-semibold">This action cannot be undone.</p>
      </>
    );
  };

  // Render breakdown table for Equipment
  const renderEquipmentBreakdown = (exp) => {
    return (
      <div className="px-4 py-3 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Equipment Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Item</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Unit Cost</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">{exp.name}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700">{exp.quantity}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700">{formatCurrency(exp.unit_cost)}</td>
                <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">{formatCurrency(exp.total_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {exp.justification && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
            <strong>Justification:</strong> {exp.justification}
          </div>
        )}
      </div>
    );
  };

  // Render breakdown table for Manpower
  const renderManpowerBreakdown = (exp) => {
    return (
      <div className="px-4 py-3 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Manpower Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Salary/Month</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Months</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Personnel</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">{exp.role}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700">{formatCurrency(exp.salary_per_month)}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700">{exp.months}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-700">{exp.num_personnel}</td>
                <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">{formatCurrency(exp.total_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {exp.justification && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
            <strong>Justification:</strong> {exp.justification}
          </div>
        )}
      </div>
    );
  };

  // Render breakdown for other expenditures
  const renderOtherBreakdown = (exp) => {
    return (
      <div className="px-4 py-3 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Description</p>
            <p className="text-sm text-gray-900 mt-1">{exp.description || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Amount</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(exp.amount)}</p>
          </div>
          {exp.vendor && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Vendor</p>
              <p className="text-sm text-gray-900 mt-1">{exp.vendor}</p>
            </div>
          )}
          {exp.invoice_number && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Invoice Number</p>
              <p className="text-sm text-gray-900 mt-1">{exp.invoice_number}</p>
            </div>
          )}
        </div>
        {exp.justification && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700">
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
    } else {
      return renderOtherBreakdown(exp);
    }
  };

  const getRowSummary = (exp) => {
    if (head === 'manpower') {
      return (
        <div>
          <div className="font-medium text-gray-900">{exp.role}</div>
          <div className="text-xs text-gray-500">
            {exp.num_personnel} personnel × {exp.months} months
          </div>
        </div>
      );
    } else if (head === 'equipment') {
      return (
        <div>
          <div className="font-medium text-gray-900">{exp.name}</div>
          <div className="text-xs text-gray-500">
            Qty: {exp.quantity} × {formatCurrency(exp.unit_cost)}
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <div className="font-medium text-gray-900">{exp.description || 'Expenditure'}</div>
          {exp.vendor && (
            <div className="text-xs text-gray-500">Vendor: {exp.vendor}</div>
          )}
        </div>
      );
    }
  };

  if (!expenditures || expenditures.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No expenditures recorded yet
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-10">
                {/* Expand icon column */}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Details
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenditures.map((exp, idx) => {
              const uniqueKey = getExpenditureKey(exp);
              const isExpanded = expandedRows[uniqueKey];
              
              return (
                <React.Fragment key={uniqueKey}>
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRowExpansion(uniqueKey)}
                  >
                    <td className="px-4 py-3 text-sm">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getExpenditureDate(exp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getRowSummary(exp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(getExpenditureAmount(exp))}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={(e) => handleEdit(exp, e)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(exp, e)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
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