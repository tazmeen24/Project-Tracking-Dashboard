// pages/InstallmentForm.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Calendar,
  Package,
  Users,
  Trash2,
} from "lucide-react";
import projectService from "../services/projectService";
import fundsService from "../services/fundsService";
import installmentService from "../services/installmentService";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { formatCurrency } from "../utils/helpers";

const BUDGET_HEADS = [
  { value: "manpower", label: "Manpower", icon: Users, color: "blue" },
  { value: "equipment", label: "Equipment", icon: Package, color: "green" },
  {
    value: "consumables",
    label: "Consumables",
    icon: FileText,
    color: "purple",
  },
  {
    value: "travel & training",
    label: "Travel & Training",
    icon: FileText,
    color: "orange",
  },
  {
    value: "contingency",
    label: "Contingency",
    icon: FileText,
    color: "yellow",
  },
  { value: "overhead", label: "Overhead", icon: FileText, color: "gray" },
];

const InstallmentForm = () => {
  const { projectId, installmentId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!installmentId;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  // Approved breakdowns (for dropdowns)
  const [approvedManpower, setApprovedManpower] = useState([]);
  const [approvedEquipment, setApprovedEquipment] = useState([]);
  const [budgetInfo, setBudgetInfo] = useState(null);

  // Installment data
  const [installmentData, setInstallmentData] = useState({
    installment_number: "",
    sanction_number: "",
    sanction_date: "",
    date_received: "",
    total_amount: "",
    remarks: "",
  });

  // Fund allocations
  const [fundAllocations, setFundAllocations] = useState([]);

  useEffect(() => {
    fetchData();
  }, [projectId, installmentId]);

  const fetchData = async () => {
    try {
      const [projectData, allocations, manpowerRes, equipmentRes] =
        await Promise.all([
          projectService.getProject(projectId),
          projectService.getBudgetAllocations(projectId),
          projectService.getManpowerBreakdown(projectId),
          projectService.getEquipmentBreakdown(projectId),
        ]);

      setProject(projectData);
      setBudgetInfo(allocations);
      setApprovedManpower(manpowerRes);
      setApprovedEquipment(equipmentRes);

      if (isEdit) {
        const installmentData = await installmentService.getInstallmentById(
          installmentId
        );
        setInstallmentData({
          installment_number: installmentData.installment_number,
          sanction_number: installmentData.sanction_number,
          sanction_date: installmentData.sanction_date,
          date_received: installmentData.date_received,
          total_amount: installmentData.total_amount,
          remarks: installmentData.remarks || "",
        });

        if (installmentData.fund_allocations) {
          setFundAllocations(
            installmentData.fund_allocations.map((fund) => ({
              fund_id: fund.fund_id,
              head: fund.head,
              amount: fund.amount,
              breakdown: fund.breakdown || [],
              showBreakdown: false,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setErrors(["Failed to load data. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const getTotalAllocated = () => {
    return fundAllocations.reduce((sum, fund) => {
      return sum + (parseFloat(fund.amount) || 0);
    }, 0);
  };

  const getRemaining = () => {
    return parseFloat(installmentData.total_amount || 0) - getTotalAllocated();
  };

  const addFundAllocation = () => {
    setFundAllocations([
      ...fundAllocations,
      {
        head: "consumables",
        amount: "",
        breakdown: [],
        showBreakdown: false,
      },
    ]);
  };

  const removeFundAllocation = (index) => {
    setFundAllocations(fundAllocations.filter((_, i) => i !== index));
  };

  const updateFundAllocation = (index, field, value) => {
    const updated = [...fundAllocations];
    updated[index][field] = value;

    // Reset breakdown when head changes
    if (field === "head") {
      updated[index].breakdown = [];
      updated[index].showBreakdown = false;
    }

    setFundAllocations(updated);
  };

  const validateForm = () => {
    const newErrors = [];

    // Installment validation
    if (
      !installmentData.installment_number ||
      installmentData.installment_number <= 0
    ) {
      newErrors.push("Valid installment number is required");
    }
    if (!installmentData.sanction_number) {
      newErrors.push("Sanction number is required");
    }
    if (!installmentData.sanction_date) {
      newErrors.push("Sanction date is required");
    }
    if (!installmentData.date_received) {
      newErrors.push("Date received is required");
    }
    if (!installmentData.total_amount || installmentData.total_amount <= 0) {
      newErrors.push("Valid total amount is required");
    }

    // Fund allocation validation
    if (fundAllocations.length === 0) {
      newErrors.push("At least one fund allocation is required");
    }

    const remaining = getRemaining();
    if (Math.abs(remaining) > 0.01) {
      // Allow for small floating point errors
      newErrors.push(
        `${
          remaining > 0 ? "Unallocated" : "Over-allocated"
        } amount: ₹${Math.abs(
          remaining
        ).toLocaleString()}. All funds must be fully allocated.`
      );
    }

    fundAllocations.forEach((fund, idx) => {
      if (!fund.head) {
        newErrors.push(`Allocation ${idx + 1}: Budget head is required`);
      }
      if (!fund.amount || fund.amount <= 0) {
        newErrors.push(`Allocation ${idx + 1}: Valid amount is required`);
      }

      // Validate breakdowns if present
      if (fund.head === "manpower" && fund.breakdown.length > 0) {
        fund.breakdown.forEach((item, bIdx) => {
          if (!item.role)
            newErrors.push(
              `Allocation ${idx + 1}, Row ${bIdx + 1}: Role is required`
            );
          if (!item.salary_per_month || item.salary_per_month <= 0) {
            newErrors.push(
              `Allocation ${idx + 1}, Row ${bIdx + 1}: Valid salary is required`
            );
          }
          if (!item.months || item.months <= 0) {
            newErrors.push(
              `Allocation ${idx + 1}, Row ${bIdx + 1}: Valid months is required`
            );
          }
          if (!item.num_personnel || item.num_personnel <= 0) {
            newErrors.push(
              `Allocation ${idx + 1}, Row ${
                bIdx + 1
              }: Valid personnel count is required`
            );
          }
        });
      }

      if (fund.head === "equipment" && fund.breakdown.length > 0) {
        fund.breakdown.forEach((item, bIdx) => {
          if (!item.item_name)
            newErrors.push(
              `Allocation ${idx + 1}, Row ${bIdx + 1}: Item name is required`
            );
          if (!item.quantity || item.quantity <= 0) {
            newErrors.push(
              `Allocation ${idx + 1}, Row ${
                bIdx + 1
              }: Valid quantity is required`
            );
          }
          if (!item.unit_cost || item.unit_cost <= 0) {
            newErrors.push(
              `Allocation ${idx + 1}, Row ${
                bIdx + 1
              }: Valid unit cost is required`
            );
          }
        });
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setWarnings([]);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const data = {
        installment: {
          installment_number: parseInt(installmentData.installment_number),
          sanction_number: installmentData.sanction_number,
          sanction_date: installmentData.sanction_date,
          total_amount: parseFloat(installmentData.total_amount),
          date_received: installmentData.date_received,
          remarks: installmentData.remarks,
        },
        fund_allocations: fundAllocations.map((fund) => ({
          head: fund.head,
          amount: parseFloat(fund.amount),
          breakdown: fund.breakdown,
        })),
      };

      if (isEdit) {
        await installmentService.updateInstallmentWithFunds(
          installmentId,
          data
        );
      } else {
        await installmentService.createInstallmentWithFunds(
          parseInt(projectId),
          data
        );
      }

      navigate(`/projects/${projectId}/installments`);
    } catch (error) {
      console.error("Failed to save installment:", error);
      setErrors([error.response?.data?.detail || "Failed to save installment"]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  const totalAllocated = getTotalAllocated();
  const remaining = getRemaining();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/projects/${projectId}/installments`)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit" : "Add"} Installment
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            {project?.title}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-2">
                  Please fix the following errors:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                  Warnings:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Installment Details */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Installment Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Installment Number *"
              type="number"
              value={installmentData.installment_number}
              onChange={(e) =>
                setInstallmentData({
                  ...installmentData,
                  installment_number: e.target.value,
                })
              }
              placeholder="1, 2, 3..."
              required
            />

            <Input
              label="Sanction Number *"
              type="text"
              value={installmentData.sanction_number}
              onChange={(e) =>
                setInstallmentData({
                  ...installmentData,
                  sanction_number: e.target.value,
                })
              }
              placeholder="e.g., SO/2025/123"
              required
            />

            <Input
              label="Sanction Date *"
              type="date"
              value={installmentData.sanction_date}
              onChange={(e) =>
                setInstallmentData({
                  ...installmentData,
                  sanction_date: e.target.value,
                })
              }
              required
            />

            <Input
              label="Date Received *"
              type="date"
              value={installmentData.date_received}
              onChange={(e) =>
                setInstallmentData({
                  ...installmentData,
                  date_received: e.target.value,
                })
              }
              required
            />

            <Input
              label="Total Amount *"
              type="number"
              step="0.01"
              value={installmentData.total_amount}
              onChange={(e) =>
                setInstallmentData({
                  ...installmentData,
                  total_amount: e.target.value,
                })
              }
              placeholder="Enter total installment amount"
              required
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Remarks
            </label>
            <textarea
              value={installmentData.remarks}
              onChange={(e) =>
                setInstallmentData({
                  ...installmentData,
                  remarks: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              rows="3"
              placeholder="Optional notes about this installment"
            />
          </div>
        </div>

        {/* Fund Allocations Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-6 rounded-xl">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-blue-900 dark:text-blue-300">
                Total Installment
              </span>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(parseFloat(installmentData.total_amount || 0))}
              </p>
            </div>
            <div>
              <span className="text-sm text-blue-900 dark:text-blue-300">
                Allocated
              </span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalAllocated)}
              </p>
            </div>
            <div>
              <span className="text-sm text-blue-900 dark:text-blue-300">
                Remaining
              </span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  Math.abs(remaining) < 0.01
                    ? "text-emerald-600 dark:text-emerald-400"
                    : remaining < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>
        </div>

        {/* Fund Allocations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fund Allocations
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addFundAllocation}
              icon={Plus}
            >
              Add Budget Head
            </Button>
          </div>

          <div className="space-y-4">
            {fundAllocations.map((fund, idx) => (
              <FundAllocationSection
                key={idx}
                fund={fund}
                index={idx}
                approvedManpower={approvedManpower}
                approvedEquipment={approvedEquipment}
                budgetInfo={budgetInfo}
                onUpdate={(updatedFund) => {
                  const updated = [...fundAllocations];
                  updated[idx] = updatedFund;
                  setFundAllocations(updated);
                }}
                onRemove={() => removeFundAllocation(idx)}
              />
            ))}

            {fundAllocations.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
                <DollarSign className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  No fund allocations yet
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addFundAllocation}
                  icon={Plus}
                >
                  Add First Budget Head
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/installments`)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={Save}
            disabled={saving || Math.abs(remaining) > 0.01}
          >
            {saving
              ? "Saving..."
              : isEdit
              ? "Update Installment"
              : "Create Installment"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Fund Allocation Section Component
const FundAllocationSection = ({
  fund,
  index,
  approvedManpower,
  approvedEquipment,
  budgetInfo,
  onUpdate,
  onRemove,
}) => {
  const getBudgetForHead = (head) => {
    if (!budgetInfo) return null;
    return budgetInfo.find((b) => b.head === head);
  };

  const budget = getBudgetForHead(fund.head);
  const needsBreakdown = fund.head === "manpower" || fund.head === "equipment";
  const headConfig =
    BUDGET_HEADS.find((h) => h.value === fund.head) || BUDGET_HEADS[2];

  // CALCULATION HELPER
  const calculateBreakdownTotal = (breakdown, head) => {
    if (!breakdown || breakdown.length === 0) return 0;

    return breakdown.reduce((total, item) => {
      if (head === "manpower") {
        const salary = parseFloat(item.salary_per_month) || 0;
        const months = parseInt(item.months) || 0;
        const count = parseInt(item.num_personnel) || 0;
        return total + salary * months * count;
      } else if (head === "equipment") {
        const quantity = parseInt(item.quantity) || 0;
        const unitCost = parseFloat(item.unit_cost) || 0;
        return total + quantity * unitCost;
      }
      return total;
    }, 0);
  };

  // Manpower handlers
  const addManpowerRow = () => {
    const newBreakdown = [
      ...fund.breakdown,
      { role: "", salary_per_month: 0, months: 12, num_personnel: 1 }
    ];
    onUpdate({
      ...fund,
      breakdown: newBreakdown,
      showBreakdown: true
    });
  };

  const removeManpowerRow = (rowIdx) => {
    const newBreakdown = fund.breakdown.filter((_, i) => i !== rowIdx);
    const calculatedAmount = calculateBreakdownTotal(newBreakdown, 'manpower');
    
    onUpdate({
      ...fund,
      breakdown: newBreakdown,
      amount: calculatedAmount
    });
  };

  const updateManpowerRow = (rowIdx, field, value) => {
    const updated = [...fund.breakdown];
    updated[rowIdx][field] = field === 'role' ? value : parseFloat(value) || 0;
    
    // AUTO-CALCULATE
    const calculatedAmount = calculateBreakdownTotal(updated, 'manpower');
    
    onUpdate({ 
      ...fund, 
      breakdown: updated,
      amount: calculatedAmount
    });
  };

  const handleManpowerRoleSelect = (rowIdx, role) => {
    if (role === "__custom__") {
      updateManpowerRow(rowIdx, "role", "");
      return;
    }

    const approved = approvedManpower.find((m) => m.role === role);
    if (approved) {
      const updated = [...fund.breakdown];
      updated[rowIdx] = {
        role: approved.role,
        salary_per_month: parseFloat(approved.salary_per_month) || 0,
        months: parseInt(approved.months) || 0,
        num_personnel: parseInt(approved.num_personnel) || 0,
      };
      
      // AUTO-CALCULATE
      const calculatedAmount = calculateBreakdownTotal(updated, 'manpower');
      
      onUpdate({ 
        ...fund, 
        breakdown: updated,
        amount: calculatedAmount
      });
    } else {
      updateManpowerRow(rowIdx, "role", role);
    }
  };

  // Equipment handlers
  const addEquipmentRow = () => {
    const newBreakdown = [
      ...fund.breakdown,
      { item_name: "", quantity: 1, unit_cost: 0 }
    ];
    onUpdate({
      ...fund,
      breakdown: newBreakdown,
      showBreakdown: true
    });
  };

  const removeEquipmentRow = (rowIdx) => {
    const newBreakdown = fund.breakdown.filter((_, i) => i !== rowIdx);
    const calculatedAmount = calculateBreakdownTotal(newBreakdown, 'equipment');
    
    onUpdate({
      ...fund,
      breakdown: newBreakdown,
      amount: calculatedAmount
    });
  };

  const updateEquipmentRow = (rowIdx, field, value) => {
    const updated = [...fund.breakdown];
    updated[rowIdx][field] = field === 'item_name' ? value : parseFloat(value) || 0;
    
    // AUTO-CALCULATE
    const calculatedAmount = calculateBreakdownTotal(updated, 'equipment');
    
    onUpdate({ 
      ...fund, 
      breakdown: updated,
      amount: calculatedAmount
    });
  };

  const handleEquipmentSelect = (rowIdx, itemName) => {
    if (itemName === "__custom__") {
      updateEquipmentRow(rowIdx, "item_name", "");
      return;
    }

    const approved = approvedEquipment.find((e) => e.item_name === itemName);
    if (approved) {
      const updated = [...fund.breakdown];
      updated[rowIdx] = {
        item_name: approved.item_name,
        quantity: parseInt(approved.quantity) || 0,
        unit_cost: parseFloat(approved.unit_cost) || 0,
      };
      
      // AUTO-CALCULATE
      const calculatedAmount = calculateBreakdownTotal(updated, 'equipment');
      
      onUpdate({ 
        ...fund, 
        breakdown: updated,
        amount: calculatedAmount
      });
    } else {
      updateEquipmentRow(rowIdx, "item_name", itemName);
    }
  };

  const Icon = headConfig.icon;

  return (
    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-900/30">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {/* Header Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Budget Head *
              </label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <select
                  value={fund.head}
                  onChange={(e) =>
                    onUpdate({ ...fund, head: e.target.value, breakdown: [], amount: 0 })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none"
                >
                  {BUDGET_HEADS.map((head) => (
                    <option key={head.value} value={head.value}>
                      {head.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              {budget && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Allocated: ₹{budget.allocated_amount.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={fund.amount}
                onChange={(e) => onUpdate({ ...fund, amount: parseFloat(e.target.value) || 0 })}
                readOnly={needsBreakdown && fund.breakdown.length > 0}
                className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white ${
                  needsBreakdown && fund.breakdown.length > 0
                    ? "bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                    : "bg-white dark:bg-slate-700"
                }`}
                placeholder="0.00"
              />
              {needsBreakdown && fund.breakdown.length > 0 && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  ✓ Auto-calculated from breakdown
                </p>
              )}
            </div>
          </div>

          {/* Breakdown Section */}
          {needsBreakdown && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() =>
                  onUpdate({ ...fund, showBreakdown: !fund.showBreakdown })
                }
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-3 transition-colors"
              >
                {fund.showBreakdown ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {fund.showBreakdown ? "Hide" : "Add"} {fund.head} breakdown
                {fund.breakdown.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {fund.breakdown.length}
                  </span>
                )}
              </button>

              {fund.showBreakdown && (
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                  {fund.head === "manpower" && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Manpower Details
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={addManpowerRow}
                          icon={Plus}
                        >
                          Add Row
                        </Button>
                      </div>

                      {fund.breakdown.map((item, rowIdx) => (
                        <div
                          key={rowIdx}
                          className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="col-span-3">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Role *
                            </label>
                            <select
                              value={item.role || "__custom__"}
                              onChange={(e) =>
                                handleManpowerRoleSelect(rowIdx, e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                              <option value="">Select Role</option>
                              {approvedManpower.map((approved, i) => (
                                <option key={i} value={approved.role}>
                                  {approved.role}
                                </option>
                              ))}
                              <option value="__custom__">+ Custom Role</option>
                            </select>
                            {(!item.role || item.role === "__custom__") && (
                              <input
                                type="text"
                                placeholder="Enter role"
                                value={
                                  item.role === "__custom__" ? "" : item.role
                                }
                                onChange={(e) =>
                                  updateManpowerRow(
                                    rowIdx,
                                    "role",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white mt-1"
                              />
                            )}
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Salary/Month *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.salary_per_month}
                              onChange={(e) =>
                                updateManpowerRow(
                                  rowIdx,
                                  "salary_per_month",
                                  e.target.value
                                )
                              }
                              placeholder="50000"
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Months *
                            </label>
                            <input
                              type="number"
                              value={item.months}
                              onChange={(e) =>
                                updateManpowerRow(
                                  rowIdx,
                                  "months",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Count *
                            </label>
                            <input
                              type="number"
                              value={item.num_personnel}
                              onChange={(e) =>
                                updateManpowerRow(
                                  rowIdx,
                                  "num_personnel",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              ₹
                              {(
                                (item.salary_per_month || 0) *
                                (item.months || 0) *
                                (item.num_personnel || 0)
                              ).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeManpowerRow(rowIdx)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {fund.breakdown.length === 0 && (
                        <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                          No manpower breakdown added. Click "+ Add Row" to
                          start.
                        </div>
                      )}
                    </>
                  )}

                  {fund.head === "equipment" && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Equipment Details
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={addEquipmentRow}
                          icon={Plus}
                        >
                          Add Row
                        </Button>
                      </div>

                      {fund.breakdown.map((item, rowIdx) => (
                        <div
                          key={rowIdx}
                          className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="col-span-5">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Item Name *
                            </label>
                            <select
                              value={item.item_name || "__custom__"}
                              onChange={(e) =>
                                handleEquipmentSelect(rowIdx, e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                              <option value="">Select Equipment</option>
                              {approvedEquipment.map((approved, i) => (
                                <option key={i} value={approved.item_name}>
                                  {approved.item_name}
                                </option>
                              ))}
                              <option value="__custom__">
                                + Custom Equipment
                              </option>
                            </select>
                            {(!item.item_name ||
                              item.item_name === "__custom__") && (
                              <input
                                type="text"
                                placeholder="Enter equipment name"
                                value={
                                  item.item_name === "__custom__"
                                    ? ""
                                    : item.item_name
                                }
                                onChange={(e) =>
                                  updateEquipmentRow(
                                    rowIdx,
                                    "item_name",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white mt-1"
                              />
                            )}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateEquipmentRow(
                                  rowIdx,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Unit Cost *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) =>
                                updateEquipmentRow(
                                  rowIdx,
                                  "unit_cost",
                                  e.target.value
                                )
                              }
                              placeholder="50000"
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              ₹
                              {(
                                (item.unit_cost || 0) * (item.quantity || 0)
                              ).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEquipmentRow(rowIdx)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {fund.breakdown.length === 0 && (
                        <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                          No equipment breakdown added. Click "+ Add Row" to
                          start.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default InstallmentForm;
