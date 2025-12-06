// frontend/src/components/finances/ExpendituresTable.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const getExpenditureDetails = (exp) => {
    if (head === 'manpower') {
      return (
        <>
          <div><strong>Role:</strong> {exp.role}</div>
          <div className="text-xs text-gray-600">
            {formatCurrency(exp.salary_per_month)}/month × {exp.months} month{exp.months !== 1 ? 's' : ''} × {exp.num_personnel} person{exp.num_personnel !== 1 ? 'nel' : ''}
          </div>
        </>
      );
    } else if (head === 'equipment') {
      return (
        <>
          <div><strong>{exp.name}</strong></div>
          <div className="text-xs text-gray-600">
            {exp.quantity} unit{exp.quantity !== 1 ? 's' : ''} × {formatCurrency(exp.unit_cost)}
          </div>
        </>
      );
    } else {
      return exp.description || '-';
    }
  };

  const getExpenditureDate = (exp) => {
    if (head === 'manpower' || head === 'equipment') {
      return formatDate(exp.date_incurred || exp.purchase_date);
    } else {
      return formatDate(exp.date_incurred);
    }
  };

  const getExpenditureAmount = (exp) => {
    return exp.total_cost || exp.amount;
  };

  const handleEdit = (exp) => {
    if (head === 'manpower') {
      navigate(`/projects/${projectId}/finances/manpower/edit/${exp.manpower_id}`);
    } else if (head === 'equipment') {
      navigate(`/projects/${projectId}/finances/equipment/edit/${exp.equipment_id}`);
    } else {
      navigate(`/projects/${projectId}/finances/expenditure/edit/${exp.expenditure_id}`);
    }
  };

  const handleDeleteClick = (exp) => {
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

      // Success - close modal and refresh
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

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
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
              const uniqueKey = exp.manpower_id || exp.equipment_id || exp.expenditure_id || idx;
              
              return (
                <tr key={uniqueKey} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {getExpenditureDate(exp)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getExpenditureDetails(exp)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(getExpenditureAmount(exp))}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleEdit(exp)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(exp)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
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