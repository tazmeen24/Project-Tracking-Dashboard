// frontend/src/pages/ProjectFinancialsPage.js

import React, { useState, useEffect } from "react";
import { X, DollarSign, TrendingDown, AlertCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import BudgetHeadSection from "../components/finances/BudgetHeadSection";
import FinancialSummaryCards from "../components/finances/financialSummaryCards";
import LoadingSkeleton from "../components/finances/LoadingSkeleton";

// Import services
import financeService from "../services/financeService";
import authService from "../services/authService";
import projectService from "../services/projectService";

const BUDGET_HEADS = [
  { key: "manpower", label: "Manpower", icon: "👥" },
  { key: "equipment", label: "Equipment", icon: "🔧" },
  { key: "consumables", label: "Consumables", icon: "🧪" },
  { key: "contingency", label: "Contingency", icon: "💼" },
  { key: "travel & training", label: "Travel & Training", icon: "✈️" },
  { key: "overhead", label: "Overhead", icon: "🏢" },
];

const ProjectFinancialsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);

  // Summary data (always loaded)
  const [summaries, setSummaries] = useState({});

  // Detailed data (lazy loaded per head)
  const [expandedHeads, setExpandedHeads] = useState({});
  const [detailsCache, setDetailsCache] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // Breakdown cache (for inline expansion)
  const [breakdownCache, setBreakdownCache] = useState({});

  // User info for permissions
  const [user, setUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

  const [editFundModal, setEditFundModal] = useState({
    isOpen: false,
    fund: null,
  });
  const [editExpenditureModal, setEditExpenditureModal] = useState({
    isOpen: false,
    expenditure: null,
  });

  // Fetch project info and user info
  useEffect(() => {
    const fetchProjectAndUser = async () => {
      try {
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          navigate("/login");
          return;
        }

        const [projectData, userData] = await Promise.all([
          projectService.getProject(projectId),
          authService.getCurrentUserProfile(),
        ]);

        setProject(projectData);
        setUser(userData.data);

        // Check permissions using service helper
        const hasEditPermission = financeService.canEditFinances(
          userData.data,
          projectData
        );
        setCanEdit(hasEditPermission);
      } catch (err) {
        console.error("Error fetching project/user:", err);
        setError("Failed to load project information");
      }
    };

    if (projectId) {
      fetchProjectAndUser();
    }
  }, [projectId, navigate]);

  // Fetch all summaries on page load
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!projectId) return;

      try {
        setLoading(true);

        // Use the organized summary method from financeService
        const organized = await financeService.getOrganizedSummary(projectId);

        setSummaries(organized);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching summaries:", err);
        setError("Failed to load financial summaries");
        setLoading(false);
      }
    };

    if (projectId) {
      fetchSummaries();
    }
  }, [projectId]);

  // Handle expanding a budget head (lazy load details)
  const handleExpand = async (head) => {
    // If already expanded, just collapse
    if (expandedHeads[head]) {
      setExpandedHeads({ ...expandedHeads, [head]: false });
      return;
    }

    // If already cached, just expand
    if (detailsCache[head]) {
      setExpandedHeads({ ...expandedHeads, [head]: true });
      return;
    }

    // Otherwise, fetch details using service
    setLoadingDetails({ ...loadingDetails, [head]: true });

    try {
      const details = await financeService.getFinancialDetailsByHead(
        projectId,
        head
      );

      // Cache the data
      setDetailsCache({
        ...detailsCache,
        [head]: details,
      });

      // Expand the section
      setExpandedHeads({ ...expandedHeads, [head]: true });
    } catch (err) {
      console.error(`Error fetching details for ${head}:`, err);
      setError(`Failed to load ${head} details`);
    } finally {
      setLoadingDetails({ ...loadingDetails, [head]: false });
    }
  };

  // Handle fetching breakdown for a fund
  const handleBreakdownExpand = async (fundId, head) => {
    if (breakdownCache[fundId]) {
      // Already cached, toggle visibility is handled by child component
      return;
    }

    try {
      const fundData = await financeService.getFundWithBreakdown(fundId);

      if (fundData.breakdown && fundData.breakdown.length > 0) {
        setBreakdownCache({
          ...breakdownCache,
          [fundId]: fundData.breakdown,
        });
      }
    } catch (err) {
      console.error("Error fetching breakdown:", err);
    }
  };

  const openEditFundModal = async (fund) => {
    console.log("OPEN EDIT FUND MODAL", fund);
    
    // For manpower and equipment, fetch breakdown if not cached
    if ((fund.head === "manpower" || fund.head === "equipment") && !breakdownCache[fund.fund_id]) {
      try {
        const fundData = await financeService.getFundWithBreakdown(fund.fund_id);
        if (fundData.breakdown && fundData.breakdown.length > 0) {
          setBreakdownCache({
            ...breakdownCache,
            [fund.fund_id]: fundData.breakdown,
          });
          // Add breakdown to fund object
          fund = { ...fund, breakdown: fundData.breakdown };
        }
      } catch (err) {
        console.error("Error fetching breakdown for edit:", err);
      }
    } else if (breakdownCache[fund.fund_id]) {
      // Use cached breakdown
      fund = { ...fund, breakdown: breakdownCache[fund.fund_id] };
    }
    
    setEditFundModal({ isOpen: true, fund });
  };
  const openEditExpenditureModal = (exp) => {
    console.log("OPEN EDIT EXPENDITURE MODAL", exp);
    setEditExpenditureModal({ isOpen: true, expenditure: exp });
  };
  const closeEditFundModal = () =>
    setEditFundModal({ isOpen: false, fund: null });
  const closeEditExpenditureModal = () =>
    setEditExpenditureModal({ isOpen: false, expenditure: null });
  const handleEditSuccess = () => {
    closeEditFundModal();
    closeEditExpenditureModal();
    handleRefresh();
  };

  // Handle refresh after edit/delete
  const handleRefresh = () => {
    // Clear cache for the affected head and re-fetch summaries
    setDetailsCache({});
    setExpandedHeads({});
    setBreakdownCache({});

    // Re-fetch summaries
    window.location.reload(); // Simple approach, or implement selective refresh
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall totals
  const totalFunds = Object.values(summaries).reduce(
    (sum, s) => sum + s.fundsReceived,
    0
  );
  const totalSpent = Object.values(summaries).reduce(
    (sum, s) => sum + s.expendituresTotal,
    0
  );
  const totalBalance = totalFunds - totalSpent;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/projects")}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          ← Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Financial Management
        </h1>
        {project && (
          <p className="text-gray-600 mt-1">
            {project.title} (Project ID: {projectId})
          </p>
        )}
      </div>

      {/* Overall Summary Cards */}
      <FinancialSummaryCards
        totalFunds={totalFunds}
        totalSpent={totalSpent}
        totalBalance={totalBalance}
      />

      {/* Budget Head Sections */}
      <div className="space-y-4 mt-6">
        {BUDGET_HEADS.map(({ key, label, icon }) => (
          <BudgetHeadSection
            key={key}
            head={key}
            label={label}
            icon={icon}
            summary={summaries[key] || {}}
            expanded={expandedHeads[key] || false}
            loading={loadingDetails[key] || false}
            details={detailsCache[key]}
            breakdownCache={breakdownCache}
            canEdit={canEdit}
            projectId={projectId}
            project={project} // ← Add this (needed by modals)
            // Existing props
            onExpand={() => handleExpand(key)}
            onBreakdownExpand={(fundId) => handleBreakdownExpand(fundId, key)}
            onRefresh={handleRefresh}
            onEditFund={openEditFundModal}
            onEditExpenditure={openEditExpenditureModal}
          />
        ))}
      </div>

      {/* Action Buttons (if admin/PI) */}
      {canEdit && (
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/finances/add-fund`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Fund Received
          </button>
          <button
            onClick={() =>
              navigate(`/projects/${projectId}/finances/add-expenditure`)
            }
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add Expenditure
          </button>
        </div>
      )}
      {editFundModal.isOpen && (
        <EditFundModal
          isOpen={editFundModal.isOpen}
          project={project}
          fund={editFundModal.fund}
          onClose={closeEditFundModal}
          onSuccess={handleEditSuccess}
        />
      )}

      {editExpenditureModal.isOpen && (
        <EditExpenditureModal
          isOpen={editExpenditureModal.isOpen}
          project={project}
          expenditure={editExpenditureModal.expenditure}
          onClose={closeEditExpenditureModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
{
  /* Edit Fund Modal */
}
const EditFundModal = ({ isOpen, onClose, project, fund, onSuccess }) => {
  const [formData, setFormData] = useState({
    head: "",
    amount: "",
    date_received: "",
    remarks: "",
  });
  const [manpowerBreakdown, setManpowerBreakdown] = useState([
    { role: "", salary_per_month: "", months: 12, num_personnel: 1 },
  ]);
  const [equipmentBreakdown, setEquipmentBreakdown] = useState([
    { item_name: "", quantity: 1, unit_cost: "" },
  ]);
  const [approvedManpower, setApprovedManpower] = useState([]);
  const [approvedEquipment, setApprovedEquipment] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (project && isOpen) {
      fetchBudgetInfo();
      fetchApprovedBreakdown();
    }
  }, [project, isOpen]);
  useEffect(() => {
    if (isOpen && fund) {
      setFormData({
        head: fund.head,
        amount: fund.amount ? fund.amount.toString() : "",
        date_received: fund.date_received
          ? fund.date_received.split("T")[0]
          : "",
        remarks: fund.remarks || "",
      });
      if (fund.head === "manpower") {
        setManpowerBreakdown(
          fund.breakdown && fund.breakdown.length > 0
            ? fund.breakdown.map((item) => ({
                role: item.role,
                salary_per_month: item.salary_per_month.toString(),
                months: item.months.toString(),
                num_personnel: item.num_personnel.toString(),
              }))
            : [{ role: "", salary_per_month: "", months: 12, num_personnel: 1 }]
        );
      } else if (fund.head === "equipment") {
        setEquipmentBreakdown(
          fund.breakdown && fund.breakdown.length > 0
            ? fund.breakdown.map((item) => ({
                item_name: item.item_name,
                quantity: item.quantity.toString(),
                unit_cost: item.unit_cost.toString(),
              }))
            : [{ item_name: "", quantity: 1, unit_cost: "" }]
        );
      }
      setErrors([]);
      setWarnings([]);
    }
  }, [isOpen, fund]);
  const fetchBudgetInfo = async () => {
    try {
      const allocations = await projectService.getBudgetAllocations(
        project.project_id
      );
      setBudgetInfo(allocations);
    } catch (error) {
      console.error("Failed to fetch budget info:", error);
    }
  };
  const fetchApprovedBreakdown = async () => {
    try {
      // ✅ Use projectService methods
      const [manpowerRes, equipmentRes] = await Promise.all([
        projectService.getManpowerBreakdown(project.project_id),
        projectService.getEquipmentBreakdown(project.project_id),
      ]);
      setApprovedManpower(manpowerRes);
      setApprovedEquipment(equipmentRes);
    } catch (error) {
      console.error("Failed to fetch approved breakdown:", error);
    }
  };
  const getBudgetForHead = (head) => {
    if (!budgetInfo) return null;
    return budgetInfo.find((b) => b.head === head);
  };
  const calculateTotalAmount = () => {
    if (formData.head === "manpower") {
      return manpowerBreakdown.reduce((sum, item) => {
        const amount =
          (parseFloat(item.salary_per_month) || 0) *
          (parseInt(item.months) || 0) *
          (parseInt(item.num_personnel) || 0);
        return sum + amount;
      }, 0);
    } else if (formData.head === "equipment") {
      return equipmentBreakdown.reduce((sum, item) => {
        const amount =
          (parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity) || 0);
        return sum + amount;
      }, 0);
    }
    return parseFloat(formData.amount) || 0;
  };
  const addManpowerRow = () => {
    setManpowerBreakdown([
      ...manpowerBreakdown,
      { role: "", salary_per_month: "", months: 12, num_personnel: 1 },
    ]);
  };
  const removeManpowerRow = (index) => {
    setManpowerBreakdown(manpowerBreakdown.filter((_, i) => i !== index));
  };
  const handleManpowerRoleSelect = (index, role) => {
    const approved = approvedManpower.find((m) => m.role === role);
    if (approved) {
      const updated = [...manpowerBreakdown];
      updated[index] = {
        role: approved.role,
        salary_per_month: approved.salary_per_month,
        months: approved.months,
        num_personnel: approved.num_personnel,
      };
      setManpowerBreakdown(updated);
    } else {
      updateManpowerRow(index, "role", role);
    }
  };
  const updateManpowerRow = (index, field, value) => {
    const updated = [...manpowerBreakdown];
    updated[index][field] = value;
    setManpowerBreakdown(updated);
  };
  const addEquipmentRow = () => {
    setEquipmentBreakdown([
      ...equipmentBreakdown,
      { item_name: "", quantity: 1, unit_cost: "" },
    ]);
  };
  const removeEquipmentRow = (index) => {
    setEquipmentBreakdown(equipmentBreakdown.filter((_, i) => i !== index));
  };
  const handleEquipmentSelect = (index, itemName) => {
    const approved = approvedEquipment.find((e) => e.item_name === itemName);
    if (approved) {
      const updated = [...equipmentBreakdown];
      updated[index] = {
        item_name: approved.item_name,
        quantity: approved.quantity,
        unit_cost: approved.unit_cost,
      };
      setEquipmentBreakdown(updated);
    } else {
      updateEquipmentRow(index, "item_name", itemName);
    }
  };
  const updateEquipmentRow = (index, field, value) => {
    const updated = [...equipmentBreakdown];
    updated[index][field] = value;
    setEquipmentBreakdown(updated);
  };
  const validateForm = () => {
    const newErrors = [];
    if (!formData.head) newErrors.push("Budget head is required");
    if (!formData.date_received) newErrors.push("Date received is required");
    const totalAmount = calculateTotalAmount();
    if (formData.head === "manpower") {
      if (manpowerBreakdown.length === 0) {
        newErrors.push("At least one manpower entry is required");
      }
      manpowerBreakdown.forEach((item, idx) => {
        if (!item.role) newErrors.push(`Row ${idx + 1}: Role is required`);
        if (!item.salary_per_month || item.salary_per_month <= 0)
          newErrors.push(`Row ${idx + 1}: Valid salary is required`);
        if (!item.months || item.months <= 0)
          newErrors.push(`Row ${idx + 1}: Valid months is required`);
        if (!item.num_personnel || item.num_personnel <= 0)
          newErrors.push(`Row ${idx + 1}: Valid personnel count is required`);
      });
    } else if (formData.head === "equipment") {
      if (equipmentBreakdown.length === 0) {
        newErrors.push("At least one equipment entry is required");
      }
      equipmentBreakdown.forEach((item, idx) => {
        if (!item.item_name)
          newErrors.push(`Row ${idx + 1}: Item name is required`);
        if (!item.quantity || item.quantity <= 0)
          newErrors.push(`Row ${idx + 1}: Valid quantity is required`);
        if (!item.unit_cost || item.unit_cost <= 0)
          newErrors.push(`Row ${idx + 1}: Valid unit cost is required`);
      });
    } else {
      if (!totalAmount || totalAmount <= 0)
        newErrors.push("Valid amount is required");
    }
    // Check budget allocation
    const budget = getBudgetForHead(formData.head);
    if (budget && totalAmount > budget.allocated_amount) {
      newErrors.push(
        `Amount (₹${totalAmount.toFixed(2)}) exceeds allocated budget (₹${
          budget.allocated_amount
        })`
      );
    }
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
    setLoading(true);
    try {
      const totalAmount = calculateTotalAmount();
      // ✅ Use projectService to update funds received
      const fundData = {
        amount: totalAmount,
        date_received: formData.date_received,
        remarks: formData.remarks,
      };
      const fundResponse = await projectService.updateFundsReceived(
        fund.fund_id,
        fundData
      );
      if (fundResponse.warnings) {
        setWarnings(fundResponse.warnings);
      }
      // Handle breakdown updates (replace existing)
      if (formData.head === "manpower" || formData.head === "equipment") {
        // Delete existing breakdowns
        await projectService.deleteFundBreakdown(fund.fund_id);
        // Add new breakdowns
        const breakdownItems =
          formData.head === "manpower" ? manpowerBreakdown : equipmentBreakdown;
        for (const item of breakdownItems) {
          if (formData.head === "manpower") {
            await projectService.addManpowerFundsBreakdown({
              fund_id: fund.fund_id,
              project_id: project.project_id,
              role: item.role,
              salary_per_month: parseFloat(item.salary_per_month),
              months: parseInt(item.months),
              num_personnel: parseInt(item.num_personnel),
            });
          } else {
            await projectService.addEquipmentFundsBreakdown({
              fund_id: fund.fund_id,
              project_id: project.project_id,
              item_name: item.item_name,
              quantity: parseInt(item.quantity),
              unit_cost: parseFloat(item.unit_cost),
            });
          }
        }
      }
      // Show warnings if any, but still proceed
      if (fundResponse.warnings && fundResponse.warnings.length > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        onSuccess();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to update fund";
      setErrors([errorMsg]);
    } finally {
      setLoading(false);
    }
  };
  const resetForm = () => {
    setFormData({
      head: "manpower",
      amount: "",
      date_received: "",
      remarks: "",
    });
    setManpowerBreakdown([
      { role: "", salary_per_month: "", months: 12, num_personnel: 1 },
    ]);
    setEquipmentBreakdown([{ item_name: "", quantity: 1, unit_cost: "" }]);
    setErrors([]);
    setWarnings([]);
  };
  useEffect(() => {
    if (isOpen) {
      // Population handled in separate useEffect
    } else {
      resetForm();
    }
  }, [isOpen]);
  if (!project || !fund) return null;
  const totalAmount = calculateTotalAmount();
  const budget = getBudgetForHead(formData.head);
  const needsBreakdown =
    formData.head === "manpower" || formData.head === "equipment";
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Funds Received"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
          <div className="text-sm font-semibold text-slate-900 mb-1">
            {project.title}
          </div>
          <div className="text-xs text-slate-600">{project.project_no}</div>
        </div>
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Validation Errors:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Warnings:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Budget Head *
            </label>
            <select
              value={formData.head}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-100"
            >
              <option value="manpower">Manpower</option>
              <option value="equipment">Equipment</option>
              <option value="consumables">Consumables</option>
              <option value="travel & training">Travel & Training</option>
              <option value="contingency">Contingency</option>
              <option value="overhead">Overhead</option>
            </select>
            {budget && (
              <p className="mt-1 text-xs text-slate-600">
                Allocated: ₹{budget.allocated_amount.toLocaleString()}
              </p>
            )}
          </div>
          <Input
            label="Date Received *"
            type="date"
            value={formData.date_received}
            onChange={(e) =>
              setFormData({ ...formData, date_received: e.target.value })
            }
            required
          />
        </div>
        {/* Manpower Breakdown */}
        {formData.head === "manpower" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Manpower Breakdown *
              </label>
              <button
                type="button"
                onClick={addManpowerRow}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + Add Row
              </button>
            </div>
            <div className="space-y-2">
              {manpowerBreakdown.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <label className="block text-xs text-slate-600 mb-1">
                      Role
                    </label>
                    <select
                      value={item.role}
                      onChange={(e) =>
                        handleManpowerRoleSelect(idx, e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Select Role</option>
                      {/* Show current role if it's not in approved list */}
                      {item.role && 
                       item.role !== "__custom__" && 
                       !approvedManpower.find(m => m.role === item.role) && (
                        <option value={item.role}>
                          {item.role} (Current)
                        </option>
                      )}
                      {approvedManpower.map((approved, i) => (
                        <option key={i} value={approved.role}>
                          {approved.role}
                        </option>
                      ))}
                      <option value="__custom__">+ Add Custom Role</option>
                    </select>
                    {item.role === "__custom__" && (
                      <input
                        type="text"
                        placeholder="Enter custom role"
                        onChange={(e) =>
                          updateManpowerRow(idx, "role", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                      />
                    )}
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-slate-600 mb-1">
                      Salary/Month
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.salary_per_month}
                      onChange={(e) =>
                        updateManpowerRow(
                          idx,
                          "salary_per_month",
                          e.target.value
                        )
                      }
                      placeholder="50000"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-600 mb-1">
                      Months
                    </label>
                    <input
                      type="number"
                      value={item.months}
                      onChange={(e) =>
                        updateManpowerRow(idx, "months", e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-600 mb-1">
                      Count
                    </label>
                    <input
                      type="number"
                      value={item.num_personnel}
                      onChange={(e) =>
                        updateManpowerRow(idx, "num_personnel", e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      ₹
                      {(
                        (item.salary_per_month || 0) *
                        (item.months || 0) *
                        (item.num_personnel || 0)
                      ).toLocaleString()}
                    </span>
                    {manpowerBreakdown.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManpowerRow(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Equipment Breakdown */}
        {formData.head === "equipment" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Equipment Breakdown *
              </label>
              <button
                type="button"
                onClick={addEquipmentRow}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + Add Row
              </button>
            </div>
            <div className="space-y-2">
              {equipmentBreakdown.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="block text-xs text-slate-600 mb-1">
                      Item Name
                    </label>
                    <select
                      value={item.item_name}
                      onChange={(e) =>
                        handleEquipmentSelect(idx, e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Select Equipment</option>
                      {/* Show current item if it's not in approved list */}
                      {item.item_name && 
                       item.item_name !== "__custom__" && 
                       !approvedEquipment.find(e => e.item_name === item.item_name) && (
                        <option value={item.item_name}>
                          {item.item_name} (Current)
                        </option>
                      )}
                      {approvedEquipment.map((approved, i) => (
                        <option key={i} value={approved.item_name}>
                          {approved.item_name}
                        </option>
                      ))}
                      <option value="__custom__">+ Add Custom Equipment</option>
                    </select>
                    {item.item_name === "__custom__" && (
                      <input
                        type="text"
                        placeholder="Enter custom equipment"
                        onChange={(e) =>
                          updateEquipmentRow(idx, "item_name", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-600 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateEquipmentRow(idx, "quantity", e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-slate-600 mb-1">
                      Unit Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) =>
                        updateEquipmentRow(idx, "unit_cost", e.target.value)
                      }
                      placeholder="50000"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      ₹
                      {(
                        (item.unit_cost || 0) * (item.quantity || 0)
                      ).toLocaleString()}
                    </span>
                    {equipmentBreakdown.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEquipmentRow(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Simple amount for other heads */}
        {!needsBreakdown && (
          <Input
            label="Amount *"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            required
            placeholder="Enter amount in rupees"
          />
        )}
        {/* Total Amount Display */}
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">
              Total Amount:
            </span>
            <span className="text-lg font-bold text-emerald-600">
              ₹{totalAmount.toLocaleString()}
            </span>
          </div>
          {budget && (
            <div className="mt-2 text-xs text-slate-600">
              Budget: ₹{budget.allocated_amount.toLocaleString()} | Remaining: ₹
              {(budget.allocated_amount - totalAmount).toLocaleString()}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) =>
              setFormData({ ...formData, remarks: e.target.value })
            }
            placeholder="Optional notes or remarks"
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows="3"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={DollarSign}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Funds"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
// ✅ Edit Expenditure Modal Component with proper routing to correct endpoints and populated data (single entry edit)
const EditExpenditureModal = ({
  isOpen,
  onClose,
  project,
  expenditure,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    head: "",
    amount: "",
    date_incurred: "",
    description: "",
  });
  const [manpowerData, setManpowerData] = useState({
    role: "",
    salary_per_month: "",
    months: 12,
    num_personnel: 1,
  });
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    quantity: 1,
    unit_cost: "",
    purchase_date: "",
  });
  const [approvedManpower, setApprovedManpower] = useState([]);
  const [approvedEquipment, setApprovedEquipment] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (project && isOpen) {
      fetchBudgetInfo();
      fetchApprovedBreakdown();
    }
  }, [project, isOpen]);
  useEffect(() => {
    if (isOpen && expenditure) {
      const head =
        expenditure.head ||
        (expenditure.role ? "manpower" : expenditure.name ? "equipment" : "");
      setFormData({
        head: head,
        amount: (expenditure.amount || expenditure.total_cost || 0).toString(),
        date_incurred: expenditure.date_incurred
          ? expenditure.date_incurred.split("T")[0]
          : "",
        description: expenditure.description || "",
      });
      if (head === "manpower") {
        setManpowerData({
          role: expenditure.role || "",
          salary_per_month: (expenditure.salary_per_month || 0).toString(),
          months: (expenditure.months || 12).toString(),
          num_personnel: (expenditure.num_personnel || 1).toString(),
        });
      } else if (head === "equipment") {
        setEquipmentData({
          name: expenditure.name || "",
          quantity: (expenditure.quantity || 1).toString(),
          unit_cost: (expenditure.unit_cost || 0).toString(),
          purchase_date: expenditure.purchase_date
            ? expenditure.purchase_date.split("T")[0]
            : "",
        });
      }
      setErrors([]);
      setWarnings([]);
    }
  }, [isOpen, expenditure]);
  const fetchBudgetInfo = async () => {
    try {
      const allocations = await projectService.getBudgetAllocations(
        project.project_id
      );
      setBudgetInfo(allocations);
    } catch (error) {
      console.error("Failed to fetch budget info:", error);
    }
  };
  const fetchApprovedBreakdown = async () => {
    try {
      const [manpowerRes, equipmentRes] = await Promise.all([
        projectService.getManpowerBreakdown(project.project_id),
        projectService.getEquipmentBreakdown(project.project_id),
      ]);
      setApprovedManpower(manpowerRes);
      setApprovedEquipment(equipmentRes);
    } catch (error) {
      console.error("Failed to fetch approved breakdown:", error);
    }
  };
  const getBudgetForHead = (head) => {
    if (!budgetInfo) return null;
    return budgetInfo.find((b) => b.head === head);
  };
  const calculateTotalAmount = () => {
    if (formData.head === "manpower") {
      return (
        (parseFloat(manpowerData.salary_per_month) || 0) *
        (parseInt(manpowerData.months) || 0) *
        (parseInt(manpowerData.num_personnel) || 0)
      );
    } else if (formData.head === "equipment") {
      return (
        (parseFloat(equipmentData.unit_cost) || 0) *
        (parseInt(equipmentData.quantity) || 0)
      );
    }
    return parseFloat(formData.amount) || 0;
  };
  const validateForm = () => {
    const newErrors = [];
    if (!formData.head) newErrors.push("Budget head is required");
    if (!formData.date_incurred) newErrors.push("Date incurred is required");
    const totalAmount = calculateTotalAmount();
    if (formData.head === "manpower") {
      if (!manpowerData.role) newErrors.push("Role is required");
      if (!manpowerData.salary_per_month || manpowerData.salary_per_month <= 0)
        newErrors.push("Valid salary is required");
      if (!manpowerData.months || manpowerData.months <= 0)
        newErrors.push("Valid months is required");
      if (!manpowerData.num_personnel || manpowerData.num_personnel <= 0)
        newErrors.push("Valid personnel count is required");
    } else if (formData.head === "equipment") {
      if (!equipmentData.name) newErrors.push("Item name is required");
      if (!equipmentData.quantity || equipmentData.quantity <= 0)
        newErrors.push("Valid quantity is required");
      if (!equipmentData.unit_cost || equipmentData.unit_cost <= 0)
        newErrors.push("Valid unit cost is required");
    } else {
      if (!totalAmount || totalAmount <= 0)
        newErrors.push("Valid amount is required");
      if (!formData.description) newErrors.push("Description is required");
    }
    // Check budget allocation
    const budget = getBudgetForHead(formData.head);
    if (budget && totalAmount > budget.allocated_amount) {
      newErrors.push(
        `Amount (₹${totalAmount.toFixed(2)}) exceeds allocated budget (₹${
          budget.allocated_amount
        })`
      );
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };
  // ✅ CRITICAL: Route to correct update endpoints based on head type
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setWarnings([]);
    if (!validateForm()) return;
    setLoading(true);
    try {
      let collectedWarnings = [];
      let response;
      // ---------------------------------------------------
      // MANPOWER
      // ---------------------------------------------------
      if (formData.head === "manpower") {
        response = await projectService.updateManpower(
          expenditure.manpower_id,
          {
            role: manpowerData.role,
            salary_per_month: parseFloat(manpowerData.salary_per_month),
            months: parseInt(manpowerData.months),
            num_personnel: parseInt(manpowerData.num_personnel),
            date_incurred: formData.date_incurred,
          }
        );
        if (response?.warnings?.length > 0) {
          collectedWarnings.push(...response.warnings);
        }
      }
      // ---------------------------------------------------
      // EQUIPMENT
      // ---------------------------------------------------
      else if (formData.head === "equipment") {
        response = await projectService.updateEquipment(
          expenditure.equipment_id,
          {
            name: equipmentData.name,
            quantity: parseInt(equipmentData.quantity),
            unit_cost: parseFloat(equipmentData.unit_cost),
            purchase_date:
              equipmentData.purchase_date || formData.date_incurred,
          }
        );
        if (response?.warnings?.length > 0) {
          collectedWarnings.push(...response.warnings);
        }
      }
      // ---------------------------------------------------
      // OTHER HEADS → expenditure endpoint
      // ---------------------------------------------------
      else {
        response = await projectService.updateExpenditure(
          expenditure.expenditure_id,
          {
            amount: parseFloat(formData.amount),
            date_incurred: formData.date_incurred,
            description: formData.description,
          }
        );
        if (response?.warnings?.length > 0) {
          collectedWarnings.push(...response.warnings);
        }
      }
      // Update warnings state after API call
      if (collectedWarnings.length > 0) {
        setWarnings(collectedWarnings);
        // Wait for user to read warnings
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      onSuccess(); // Always proceed
    } catch (error) {
      const errorMsg =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to update expenditure";
      setErrors([errorMsg]);
    } finally {
      setLoading(false);
    }
  };
  const resetForm = () => {
    setFormData({
      head: "manpower",
      amount: "",
      date_incurred: "",
      description: "",
    });
    setManpowerData({
      role: "",
      salary_per_month: "",
      months: 12,
      num_personnel: 1,
    });
    setEquipmentData({
      name: "",
      quantity: 1,
      unit_cost: "",
      purchase_date: "",
    });
    setErrors([]);
    setWarnings([]);
  };
  useEffect(() => {
    if (isOpen) {
      // Population handled in separate useEffect
    } else {
      resetForm();
    }
  }, [isOpen]);
  if (!project || !expenditure) return null;
  const totalAmount = calculateTotalAmount();
  const budget = getBudgetForHead(formData.head);
  const needsBreakdown =
    formData.head === "manpower" || formData.head === "equipment";
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Expenditure" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="text-sm font-semibold text-slate-900 mb-1">
            {project.title}
          </div>
          <div className="text-xs text-slate-600">{project.project_no}</div>
        </div>
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Validation Errors:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Warnings:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Budget Head *
            </label>
            <select
              value={formData.head}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-100"
            >
              <option value="manpower">Manpower</option>
              <option value="equipment">Equipment</option>
              <option value="consumables">Consumables</option>
              <option value="travel & training">Travel & Training</option>
              <option value="contingency">Contingency</option>
              <option value="overhead">Overhead</option>
            </select>
            {budget && (
              <p className="mt-1 text-xs text-slate-600">
                Allocated: ₹{budget.allocated_amount.toLocaleString()}
              </p>
            )}
          </div>
          <Input
            label="Date Incurred *"
            type="date"
            value={formData.date_incurred}
            onChange={(e) =>
              setFormData({ ...formData, date_incurred: e.target.value })
            }
            required
          />
        </div>
        {/* Manpower Fields (single entry) */}
        {formData.head === "manpower" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Manpower Details *
            </label>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <label className="block text-xs text-slate-600 mb-1">
                  Role
                </label>
                <select
                  value={manpowerData.role}
                  onChange={(e) =>
                    setManpowerData({ ...manpowerData, role: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Role</option>
                  {approvedManpower.map((approved, i) => (
                    <option key={i} value={approved.role}>
                      {approved.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-slate-600 mb-1">
                  Salary/Month
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manpowerData.salary_per_month}
                  onChange={(e) =>
                    setManpowerData({
                      ...manpowerData,
                      salary_per_month: e.target.value,
                    })
                  }
                  placeholder="50000"
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-600 mb-1">
                  Months
                </label>
                <input
                  type="number"
                  value={manpowerData.months}
                  onChange={(e) =>
                    setManpowerData({ ...manpowerData, months: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-600 mb-1">
                  Count
                </label>
                <input
                  type="number"
                  value={manpowerData.num_personnel}
                  onChange={(e) =>
                    setManpowerData({
                      ...manpowerData,
                      num_personnel: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  ₹
                  {(
                    (manpowerData.salary_per_month || 0) *
                    (manpowerData.months || 0) *
                    (manpowerData.num_personnel || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Equipment Fields (single entry) */}
        {formData.head === "equipment" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Equipment Details *
            </label>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="block text-xs text-slate-600 mb-1">
                  Item Name
                </label>
                <select
                  value={equipmentData.name}
                  onChange={(e) =>
                    setEquipmentData({ ...equipmentData, name: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Equipment</option>
                  {approvedEquipment.map((approved, i) => (
                    <option key={i} value={approved.item_name}>
                      {approved.item_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-600 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={equipmentData.quantity}
                  onChange={(e) =>
                    setEquipmentData({
                      ...equipmentData,
                      quantity: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-slate-600 mb-1">
                  Unit Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={equipmentData.unit_cost}
                  onChange={(e) =>
                    setEquipmentData({
                      ...equipmentData,
                      unit_cost: e.target.value,
                    })
                  }
                  placeholder="50000"
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  ₹
                  {(
                    (equipmentData.unit_cost || 0) *
                    (equipmentData.quantity || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Simple fields for other heads */}
        {!needsBreakdown && (
          <>
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
              placeholder="Enter amount in rupees"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                placeholder="What was purchased or paid for"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="3"
              />
            </div>
          </>
        )}
        {/* Total Amount Display */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">
              Total Amount:
            </span>
            <span className="text-lg font-bold text-red-600">
              ₹{totalAmount.toLocaleString()}
            </span>
          </div>
          {budget && (
            <div className="mt-2 text-xs text-slate-600">
              Budget: ₹{budget.allocated_amount.toLocaleString()} | Remaining: ₹
              {(budget.allocated_amount - totalAmount).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="danger"
            type="submit"
            icon={TrendingDown}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Expenditure"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectFinancialsPage;