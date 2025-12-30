// pages/InstallmentsList.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import projectService from "../services/projectService";
import installmentService from "../services/installmentService";
import Button from "../components/common/Button";
import { formatCurrency } from "../utils/helpers";

const InstallmentsList = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [projectData, installmentsData, budgetAllocations] =
        await Promise.all([
          projectService.getProject(projectId),
          installmentService.getInstallments(projectId),
          projectService.getBudgetAllocations(projectId),
        ]);

      // Calculate total allocation from budget allocations
      const totalAllocation = budgetAllocations.reduce(
        (sum, allocation) => sum + parseFloat(allocation.allocated_amount || 0),
        0
      );

      // Add total_allocation to project data
      setProject({ ...projectData, total_allocation: totalAllocation });
      setInstallments(installmentsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (installmentId) => {
    if (
      window.confirm(
        "Are you sure? This will delete the installment and all associated funds."
      )
    ) {
      try {
        await installmentService.deleteInstallment(installmentId);
        fetchData();
      } catch (error) {
        console.error("Failed to delete:", error);
        alert("Failed to delete installment");
      }
    }
  };

  const getTotalReceived = () => {
    return installments.reduce(
      (sum, inst) => sum + parseFloat(inst.total_amount || 0),
      0
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Project Installments
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              {project?.title}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/projects/${projectId}/installments/new`)}
          icon={Plus}
        >
          New Installment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Installments
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {installments.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Received
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(getTotalReceived())}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Project Budget
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(project?.total_allocation || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Utilization
            </span>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {project?.total_allocation
              ? ((getTotalReceived() / project.total_allocation) * 100).toFixed(
                  1
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Installments List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        {installments.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {installments.map((installment) => (
              <InstallmentCard
                key={installment.installment_id}
                installment={installment}
                projectId={projectId}
                onEdit={() =>
                  navigate(
                    `/projects/${projectId}/installments/${installment.installment_id}/edit`
                  )
                }
                onDelete={() => handleDelete(installment.installment_id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No installments yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Add your first installment to start tracking funds received
            </p>
            <Button
              onClick={() =>
                navigate(`/projects/${projectId}/installments/new`)
              }
              icon={Plus}
            >
              Add First Installment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Installment Card Component
const InstallmentCard = ({ installment, projectId, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold">
              {installment.installment_number}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Installment #{installment.installment_number}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sanction: {installment.sanction_number}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Sanction Date
              </span>
              <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                {new Date(installment.sanction_date).toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Date Received
              </span>
              <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                {new Date(installment.date_received).toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Total Amount
              </span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(installment.total_amount)}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Fund Allocations
              </span>
              <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                {installment.funds_count || 0} heads
              </p>
            </div>
          </div>

          {installment.remarks && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Remarks:</span>{" "}
                {installment.remarks}
              </p>
            </div>
          )}

          {/* Fund Breakdown Toggle */}
          {installment.funds_count > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {expanded ? "− Hide" : "+ Show"} fund allocations (
              {installment.funds_count})
            </button>
          )}

          {expanded && installment.fund_allocations && (
            <div className="mt-4 space-y-2">
              {installment.fund_allocations.map((fund, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                      {fund.head}
                    </span>
                    {fund.has_breakdown && (
                      <span className="ml-2 text-xs text-slate-500">
                        ({fund.breakdown_count} items)
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(fund.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallmentsList;
