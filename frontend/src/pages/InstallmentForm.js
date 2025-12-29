// frontend/src/pages/InstallmentForm.js

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  Trash2,
  Plus,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Info,
} from "lucide-react";
import installmentService from "../services/installmentService";
import projectService from "../services/projectService";
import fundsService from "../services/fundsService";

const AddAllocationsForm = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 2;

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    remarks: "",
    budgetHeads: [],
    installment: {
      installment_number: "",
      sanction_number: "",
      sanction_date: "",
      date_received: "",
      total_amount: 0,
    },
  });

  // Project info
  const [projectInfo, setProjectInfo] = useState(null);

  // Approved breakdown items
  const [approvedManpower, setApprovedManpower] = useState([]);
  const [approvedEquipment, setApprovedEquipment] = useState([]);

  // Expandable sections state
  const [expandedHeads, setExpandedHeads] = useState({});

  // Initialize form
  useEffect(() => {
    initializeForm();
  }, [projectId]);

  // Calculate total whenever budget head amounts change
  const totalAmount = formData.budgetHeads.reduce(
    (sum, head) => sum + (parseFloat(head.amount) || 0),
    0
  );

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      installment: {
        ...prev.installment,
        total_amount: totalAmount,
      },
    }));
  }, [totalAmount]);

  const initializeForm = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get project info
      const project = await projectService.getProject(projectId);
      setProjectInfo(project);

      // 2. Get allocated budget heads
      const budgetAllocations = await projectService.getBudgetAllocations(
        projectId
      );

      if (!budgetAllocations || budgetAllocations.length === 0) {
        setError(
          "No budget allocations found for this project. Please allocate budget first."
        );
        setLoading(false);
        return;
      }

      // 3. Get funds summary to calculate available amounts
      const fundsSummary = await fundsService
        .getFundsSummary(projectId)
        .catch(() => []);

      // 4. Calculate available for each head
      const headsWithStatus = budgetAllocations.map((allocation) => {
        const fundReceived = fundsSummary.find(
          (f) => f.head === allocation.head
        );

        const totalReceived = fundReceived
          ? parseFloat(fundReceived.total_amount)
          : 0;

        const allocated = parseFloat(allocation.allocated_amount) || 0;
        const available = allocated - totalReceived;

        return {
          head: allocation.head,
          allocation_id: allocation.allocation_id,
          allocated_amount: allocated,
          funds_received: totalReceived,
          available_to_fund: available > 0 ? available : 0,
          amount: 0,
          hasBreakdown: ["manpower", "equipment"].includes(allocation.head),
          breakdown: [],
          validation: {
            valid: true,
            errors: [],
            warnings: [],
          },
        };
      });

      // 5. Get approved breakdown items for manpower/equipment
      const [manpowerBreakdown, equipmentBreakdown] = await Promise.all([
        projectService.getManpowerBreakdown(projectId).catch(() => []),
        projectService.getEquipmentBreakdown(projectId).catch(() => []),
      ]);

      // 6. Pre-fill breakdown items for manpower and equipment
      const headsWithBreakdown = headsWithStatus.map((head) => {
        if (head.head === "manpower" && manpowerBreakdown.length > 0) {
          return {
            ...head,
            breakdown: manpowerBreakdown.map((mp) => ({
              role: mp.role,
              salary_per_month: mp.salary_per_month,
              months: mp.months,
              num_personnel: mp.num_personnel,
              approved_salary_per_month: mp.salary_per_month,
              approved_months: mp.months,
              approved_num_personnel: mp.num_personnel,
              total_amount: mp.salary_per_month * mp.months * mp.num_personnel,
            })),
          };
        } else if (head.head === "equipment" && equipmentBreakdown.length > 0) {
          return {
            ...head,
            breakdown: equipmentBreakdown.map((eq) => ({
              item_name: eq.item_name,
              quantity: eq.quantity,
              unit_cost: eq.unit_cost,
              approved_quantity: eq.quantity,
              approved_unit_cost: eq.unit_cost,
              total_amount: eq.quantity * eq.unit_cost,
            })),
          };
        }
        return head;
      });

      // Auto-expand heads with pre-filled breakdowns
      const autoExpanded = {};
      headsWithBreakdown.forEach((head) => {
        if (head.hasBreakdown && head.breakdown.length > 0) {
          autoExpanded[head.head] = true;
        }
      });

      setFormData((prev) => ({
        ...prev,
        budgetHeads: headsWithBreakdown,
      }));

      setApprovedManpower(manpowerBreakdown);
      setApprovedEquipment(equipmentBreakdown);
      setExpandedHeads(autoExpanded);

      setLoading(false);
    } catch (err) {
      console.error("Error initializing form:", err);
      setError("Failed to load form data: " + err.message);
      setLoading(false);
    }
  };

  // Handle budget head amount change with validation
  const handleBudgetHeadAmountChange = (headName, amount) => {
    const numAmount = parseFloat(amount) || 0;

    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) =>
        head.head === headName ? { ...head, amount: numAmount } : head
      ),
    }));

    // Validate
    const budgetHead = formData.budgetHeads.find((h) => h.head === headName);

    if (numAmount > budgetHead.available_to_fund) {
      updateBudgetHeadValidation(headName, {
        valid: false,
        errors: [
          `Amount ₹${numAmount.toLocaleString()} exceeds available budget of ₹${budgetHead.available_to_fund.toLocaleString()}`,
        ],
        warnings: [],
      });
    } else if (
      numAmount > budgetHead.available_to_fund * 0.9 &&
      numAmount > 0
    ) {
      updateBudgetHeadValidation(headName, {
        valid: true,
        errors: [],
        warnings: [
          `Using ${((numAmount / budgetHead.available_to_fund) * 100).toFixed(
            1
          )}% of available budget`,
        ],
      });
    } else {
      updateBudgetHeadValidation(headName, {
        valid: true,
        errors: [],
        warnings: [],
      });
    }
  };

  const updateBudgetHeadValidation = (headName, validation) => {
    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) =>
        head.head === headName ? { ...head, validation } : head
      ),
    }));
  };

  // Toggle expanded state for breakdown sections
  const toggleExpanded = (headName) => {
    setExpandedHeads((prev) => ({
      ...prev,
      [headName]: !prev[headName],
    }));
  };

  // Add breakdown item for manpower
  const addManpowerBreakdown = (headName) => {
    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) =>
        head.head === headName
          ? {
              ...head,
              breakdown: [
                ...head.breakdown,
                {
                  role: "",
                  salary_per_month: 0,
                  months: 0,
                  num_personnel: 1,
                  approved_salary_per_month: 0,
                  approved_months: 0,
                  approved_num_personnel: 1,
                  total_amount: 0,
                },
              ],
            }
          : head
      ),
    }));
  };

  // Add breakdown item for equipment
  const addEquipmentBreakdown = (headName) => {
    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) =>
        head.head === headName
          ? {
              ...head,
              breakdown: [
                ...head.breakdown,
                {
                  item_name: "",
                  quantity: 0,
                  unit_cost: 0,
                  approved_quantity: 0,
                  approved_unit_cost: 0,
                  total_amount: 0,
                },
              ],
            }
          : head
      ),
    }));
  };

  // Handle manpower role selection - pre-fill from approved breakdown
  const handleManpowerRoleSelect = (headName, index, role) => {
    const approved = approvedManpower.find((m) => m.role === role);

    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) => {
        if (head.head !== headName) return head;

        const updatedBreakdown = [...head.breakdown];

        if (approved) {
          updatedBreakdown[index] = {
            role: approved.role,
            salary_per_month: approved.salary_per_month,
            months: approved.months,
            num_personnel: approved.num_personnel,
            approved_salary_per_month: approved.salary_per_month,
            approved_months: approved.months,
            approved_num_personnel: approved.num_personnel,
            total_amount:
              approved.salary_per_month *
              approved.months *
              approved.num_personnel,
          };
        } else {
          updatedBreakdown[index] = {
            ...updatedBreakdown[index],
            role: role,
          };
        }

        return {
          ...head,
          breakdown: updatedBreakdown,
        };
      }),
    }));
  };

  // Handle equipment item selection - pre-fill from approved breakdown
  const handleEquipmentItemSelect = (headName, index, itemName) => {
    const approved = approvedEquipment.find((e) => e.item_name === itemName);

    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) => {
        if (head.head !== headName) return head;

        const updatedBreakdown = [...head.breakdown];

        if (approved) {
          updatedBreakdown[index] = {
            item_name: approved.item_name,
            quantity: approved.quantity,
            unit_cost: approved.unit_cost,
            approved_quantity: approved.quantity,
            approved_unit_cost: approved.unit_cost,
            total_amount: approved.quantity * approved.unit_cost,
          };
        } else {
          updatedBreakdown[index] = {
            ...updatedBreakdown[index],
            item_name: itemName,
          };
        }

        return {
          ...head,
          breakdown: updatedBreakdown,
        };
      }),
    }));
  };

  // Update breakdown item with validation
  const updateBreakdownItem = (headName, index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) => {
        if (head.head !== headName) return head;

        const updatedBreakdown = [...head.breakdown];
        const item = updatedBreakdown[index];

        // Validate and constrain values based on field
        let constrainedValue = value;

        if (field === "months") {
          // Months: can be reduced, cannot exceed approved
          const numValue = parseInt(value) || 0;
          constrainedValue = Math.min(
            Math.max(0, numValue),
            item.approved_months || numValue
          );
        } else if (field === "num_personnel") {
          // Personnel: can be reduced, cannot exceed approved
          const numValue = parseInt(value) || 0;
          constrainedValue = Math.min(
            Math.max(0, numValue),
            item.approved_num_personnel || numValue
          );
        } else if (field === "quantity") {
          // Quantity: can be reduced, cannot exceed approved
          const numValue = parseInt(value) || 0;
          constrainedValue = Math.min(
            Math.max(0, numValue),
            item.approved_quantity || numValue
          );
        } else if (field === "salary_per_month" || field === "unit_cost") {
          // Costs: can be reduced (for partial funding), cannot exceed approved
          const numValue = parseFloat(value) || 0;
          const approvedValue =
            field === "salary_per_month"
              ? item.approved_salary_per_month
              : item.approved_unit_cost;
          constrainedValue = Math.min(
            Math.max(0, numValue),
            approvedValue || numValue
          );
        }

        updatedBreakdown[index] = {
          ...item,
          [field]: constrainedValue,
        };

        // Calculate total for the item
        if (head.head === "manpower") {
          const updatedItem = updatedBreakdown[index];
          updatedBreakdown[index].total_amount =
            (parseFloat(updatedItem.salary_per_month) || 0) *
            (parseInt(updatedItem.months) || 0) *
            (parseInt(updatedItem.num_personnel) || 0);
        } else if (head.head === "equipment") {
          const updatedItem = updatedBreakdown[index];
          updatedBreakdown[index].total_amount =
            (parseFloat(updatedItem.unit_cost) || 0) *
            (parseInt(updatedItem.quantity) || 0);
        }

        return {
          ...head,
          breakdown: updatedBreakdown,
        };
      }),
    }));
  };

  // Delete breakdown item
  const deleteBreakdownItem = (headName, index) => {
    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) =>
        head.head === headName
          ? {
              ...head,
              breakdown: head.breakdown.filter((_, i) => i !== index),
            }
          : head
      ),
    }));
  };

  // Sync breakdown total with head amount
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      budgetHeads: prev.budgetHeads.map((head) => {
        if (head.hasBreakdown && head.breakdown.length > 0) {
          const breakdownTotal = head.breakdown.reduce(
            (sum, item) => sum + (parseFloat(item.total_amount) || 0),
            0
          );
          return {
            ...head,
            amount: breakdownTotal,
          };
        }
        return head;
      }),
    }));
  }, [
    formData.budgetHeads
      .map((h) => h.breakdown.map((b) => b.total_amount).join(","))
      .join("|"),
  ]);

  // Validate breakdown totals
  const validateBreakdowns = () => {
    const errors = [];

    formData.budgetHeads.forEach((head) => {
      if (head.hasBreakdown && head.amount > 0) {
        const breakdownTotal = head.breakdown.reduce(
          (sum, item) => sum + (parseFloat(item.total_amount) || 0),
          0
        );

        if (head.breakdown.length === 0) {
          errors.push(`${head.head}: Breakdown is required when amount > 0`);
        } else if (Math.abs(breakdownTotal - head.amount) > 0.01) {
          errors.push(
            `${
              head.head
            }: Breakdown total (₹${breakdownTotal.toLocaleString()}) ` +
              `must equal allocation amount (₹${head.amount.toLocaleString()})`
          );
        }

        // Validate individual breakdown items
        head.breakdown.forEach((item, idx) => {
          if (head.head === "manpower") {
            if (!item.role) {
              errors.push(`${head.head} - Row ${idx + 1}: Role is required`);
            }
            if (!item.salary_per_month || item.salary_per_month <= 0) {
              errors.push(
                `${head.head} - Row ${idx + 1}: Valid salary is required`
              );
            }
            if (!item.months || item.months <= 0) {
              errors.push(
                `${head.head} - Row ${idx + 1}: Valid months is required`
              );
            }
            if (!item.num_personnel || item.num_personnel <= 0) {
              errors.push(
                `${head.head} - Row ${
                  idx + 1
                }: Valid personnel count is required`
              );
            }
          } else if (head.head === "equipment") {
            if (!item.item_name) {
              errors.push(
                `${head.head} - Row ${idx + 1}: Item name is required`
              );
            }
            if (!item.quantity || item.quantity <= 0) {
              errors.push(
                `${head.head} - Row ${idx + 1}: Valid quantity is required`
              );
            }
            if (!item.unit_cost || item.unit_cost <= 0) {
              errors.push(
                `${head.head} - Row ${idx + 1}: Valid unit cost is required`
              );
            }
          }
        });
      }
    });

    return errors;
  };

  // Validate step 1 (Installment Details)
  const validateStep1 = () => {
    const errors = [];

    if (!formData.installment.installment_number) {
      errors.push("Installment number is required");
    }
    if (!formData.installment.sanction_number) {
      errors.push("Sanction number is required");
    }
    if (!formData.installment.sanction_date) {
      errors.push("Sanction date is required");
    }
    if (!formData.installment.date_received) {
      errors.push("Date received is required");
    }

    return errors;
  };

  // Validate step 2 (Budget Allocations)
  const validateStep2 = () => {
    const errors = [];
    const warnings = [];

    // At least one budget head must have an amount
    const headsWithAmount = formData.budgetHeads.filter((h) => h.amount > 0);
    if (headsWithAmount.length === 0) {
      errors.push("At least one budget head must have an allocation amount");
    }

    // Check individual head validations
    formData.budgetHeads.forEach((head) => {
      if (head.amount > 0 && !head.validation.valid) {
        errors.push(...head.validation.errors);
      }
      if (head.validation.warnings.length > 0) {
        warnings.push(...head.validation.warnings);
      }
    });

    // Breakdown validation
    const breakdownErrors = validateBreakdowns();
    errors.push(...breakdownErrors);

    return { errors, warnings };
  };

  // Handle step navigation
  const handleNext = () => {
    setValidationErrors([]);
    setValidationWarnings([]);

    if (currentStep === 1) {
      const errors = validateStep1();
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setValidationErrors([]);
    setValidationWarnings([]);
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setValidationErrors([]);
    setValidationWarnings([]);
    setError(null);

    const { errors, warnings } = validateStep2();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setValidationWarnings(warnings);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        installment: {
          installment_number: formData.installment.installment_number,
          sanction_number: formData.installment.sanction_number,
          sanction_date: formData.installment.sanction_date,
          date_received: formData.installment.date_received,
          total_amount: formData.installment.total_amount,
          remarks: formData.remarks || "",
        },
        fund_allocations: formData.budgetHeads
          .filter((h) => h.amount > 0)
          .map((h) => ({
            head: h.head,
            amount: h.amount,
            allocation_id: h.allocation_id,
            breakdown: h.breakdown || [],
          })),
      };

      await installmentService.createInstallmentWithFunds(parseInt(projectId), {
        data: payload,
      });

      alert("Installment created successfully");
      navigate(`/projects/${projectId}/funds`);
    } catch (err) {
      console.error(err);
      setError("Failed to create installment: " + err.message);
      setSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading form...
          </p>
        </div>
      </div>
    );
  };

  // Render error state
  if (error && formData.budgetHeads.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-start gap-3 mb-6">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Cannot Load Form
                </h3>
                <p className="text-gray-700 dark:text-gray-300">{error}</p>
              </div>
            </div>
            <button
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Back to Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Add Fund Allocations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a new installment and allocate funds to budget heads
          </p>
        </div>

        {/* Project Info */}
        {projectInfo && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {projectInfo.title}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Project No: {projectInfo.project_no}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
                      currentStep >= step
                        ? "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {currentStep > step ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step
                    )}
                  </div>
                  <div className="ml-3 text-sm font-medium">
                    <div
                      className={
                        currentStep >= step
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-gray-400 dark:text-gray-500"
                      }
                    >
                      {step === 1 ? "Installment Details" : "Budget Allocation"}
                    </div>
                  </div>
                </div>
                {step < TOTAL_STEPS && (
                  <div
                    className={`w-24 h-0.5 mx-4 ${
                      currentStep > step
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Validation Messages */}
        {(validationErrors.length > 0 || validationWarnings.length > 0) && (
          <div className="mb-6 space-y-3">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                      Please fix the following errors:
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Warnings:
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                      {validationWarnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Installment Details */}
            {currentStep === 1 && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Installment Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Installment Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Installment Number{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      value={formData.installment.installment_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          installment: {
                            ...prev.installment,
                            installment_number: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  {/* Sanction Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sanction Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      value={formData.installment.sanction_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          installment: {
                            ...prev.installment,
                            sanction_number: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  {/* Sanction Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sanction Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      value={formData.installment.sanction_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          installment: {
                            ...prev.installment,
                            sanction_date: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  {/* Date Received */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date Received <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      value={formData.installment.date_received}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          installment: {
                            ...prev.installment,
                            date_received: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Remarks
                    </label>
                    <textarea
                      rows="3"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                      value={formData.remarks}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          remarks: e.target.value,
                        }))
                      }
                      placeholder="Optional notes about this installment..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Budget Allocation */}
            {currentStep === 2 && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Allocate Funds to Budget Heads
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Distribute the installment amount across budget heads
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total Amount
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ₹{formData.installment.total_amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.budgetHeads
                    .sort((a, b) => {
                      const order = { manpower: 1, equipment: 2 };
                      return (order[a.head] || 999) - (order[b.head] || 999);
                    })
                    .map((head) => (
                      <div
                        key={head.head}
                        className={`border rounded-lg transition-all ${
                          head.validation.valid
                            ? "border-gray-300 dark:border-gray-600"
                            : "border-red-500 dark:border-red-400 border-2"
                        }`}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-6 flex-wrap lg:flex-nowrap">
                            {/* Left: Head Name & Stats */}
                            <div className="flex-shrink-0 w-full lg:w-64">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize mb-3">
                                {head.head}
                              </h3>
                              <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Allocated:
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    ₹{head.allocated_amount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Already Received:
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    ₹{head.funds_received.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Available:
                                  </span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    ₹{head.available_to_fund.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Amount Input */}
                            <div className="flex-1 w-full lg:w-auto">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Amount to Allocate
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 font-medium">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={head.hasBreakdown}
                                  className={`w-full pl-8 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                                    !head.validation.valid
                                      ? "border-red-500 dark:border-red-400"
                                      : "border-gray-300 dark:border-gray-600"
                                  } ${
                                    head.hasBreakdown
                                      ? "bg-gray-50 dark:bg-gray-900 cursor-not-allowed text-gray-900 dark:text-gray-100"
                                      : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  }`}
                                  value={head.amount || ""}
                                  onChange={(e) =>
                                    handleBudgetHeadAmountChange(
                                      head.head,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              {head.validation.errors.length > 0 && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>{head.validation.errors.join(", ")}</span>
                                </p>
                              )}
                              {head.validation.warnings.length > 0 && (
                                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>
                                    {head.validation.warnings.join(", ")}
                                  </span>
                                </p>
                              )}
                              {head.hasBreakdown && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                                  <Info className="w-3.5 h-3.5" />
                                  Auto-calculated from breakdown below
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Breakdown Section */}
                          {head.hasBreakdown && (
                            <div className="mt-5">
                              <div
                                className="flex items-center cursor-pointer p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => toggleExpanded(head.head)}
                              >
                                <ChevronDown
                                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                                    expandedHeads[head.head] ? "rotate-180" : ""
                                  }`}
                                />
                                <span className="ml-3 font-medium text-gray-900 dark:text-gray-100">
                                  {head.head === "manpower"
                                    ? "Manpower Breakdown"
                                    : "Equipment Breakdown"}
                                  {head.breakdown.length > 0 &&
                                    ` (${head.breakdown.length} items)`}
                                </span>
                                <div className="flex-1" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Total: ₹
                                  {head.breakdown
                                    .reduce(
                                      (sum, item) =>
                                        sum +
                                        (parseFloat(item.total_amount) || 0),
                                      0
                                    )
                                    .toLocaleString()}
                                </span>
                              </div>

                              {expandedHeads[head.head] && (
                                <div className="mt-4 space-y-4">
                                  {head.head === "manpower" &&
                                    head.breakdown.map((item, index) => (
                                      <div
                                        key={index}
                                        className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                          {/* Role */}
                                          <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Role{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <select
                                              required
                                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={item.role}
                                              onChange={(e) =>
                                                handleManpowerRoleSelect(
                                                  head.head,
                                                  index,
                                                  e.target.value
                                                )
                                              }
                                            >
                                              <option value="">
                                                Select Role
                                              </option>
                                              {approvedManpower.map((mp) => (
                                                <option
                                                  key={mp.breakdown_id}
                                                  value={mp.role}
                                                >
                                                  {mp.role}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* Salary */}
                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Salary/Month{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <div className="relative">
                                              <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                                                ₹
                                              </span>
                                              <input
                                                type="number"
                                                required
                                                min="0"
                                                max={
                                                  item.approved_salary_per_month
                                                }
                                                step="0.01"
                                                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                value={
                                                  item.salary_per_month || ""
                                                }
                                                onChange={(e) =>
                                                  updateBreakdownItem(
                                                    head.head,
                                                    index,
                                                    "salary_per_month",
                                                    e.target.value
                                                  )
                                                }
                                              />
                                            </div>
                                            {item.approved_salary_per_month && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Max: ₹
                                                {item.approved_salary_per_month.toLocaleString()}
                                              </p>
                                            )}
                                          </div>

                                          {/* Months */}
                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Months{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <input
                                              type="number"
                                              required
                                              min="1"
                                              max={item.approved_months}
                                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={item.months || ""}
                                              onChange={(e) =>
                                                updateBreakdownItem(
                                                  head.head,
                                                  index,
                                                  "months",
                                                  e.target.value
                                                )
                                              }
                                            />
                                            {item.approved_months && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Max: {item.approved_months}
                                              </p>
                                            )}
                                          </div>

                                          {/* Personnel */}
                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Personnel{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <input
                                              type="number"
                                              required
                                              min="1"
                                              max={item.approved_num_personnel}
                                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={item.num_personnel || ""}
                                              onChange={(e) =>
                                                updateBreakdownItem(
                                                  head.head,
                                                  index,
                                                  "num_personnel",
                                                  e.target.value
                                                )
                                              }
                                            />
                                            {item.approved_num_personnel && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Max: {item.approved_num_personnel}
                                              </p>
                                            )}
                                          </div>

                                          {/* Total */}
                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Total
                                            </label>
                                            <div className="relative">
                                              <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                                                ₹
                                              </span>
                                              <input
                                                type="text"
                                                disabled
                                                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium"
                                                value={item.total_amount.toLocaleString()}
                                              />
                                            </div>
                                          </div>

                                          {/* Delete Button */}
                                          <div className="md:col-span-1 flex items-end">
                                            <button
                                              type="button"
                                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                              onClick={() =>
                                                deleteBreakdownItem(
                                                  head.head,
                                                  index
                                                )
                                              }
                                              title="Delete item"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                  {head.head === "equipment" &&
                                    head.breakdown.map((item, index) => (
                                      <div
                                        key={index}
                                        className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                          {/* Item Name */}
                                          <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Item Name{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <select
                                              required
                                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={item.item_name}
                                              onChange={(e) =>
                                                handleEquipmentItemSelect(
                                                  head.head,
                                                  index,
                                                  e.target.value
                                                )
                                              }
                                            >
                                              <option value="">
                                                Select Item
                                              </option>
                                              {approvedEquipment.map((eq) => (
                                                <option
                                                  key={eq.breakdown_id}
                                                  value={eq.item_name}
                                                >
                                                  {eq.item_name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* Quantity */}
                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Quantity{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <input
                                              type="number"
                                              required
                                              min="1"
                                              max={item.approved_quantity}
                                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={item.quantity || ""}
                                              onChange={(e) =>
                                                updateBreakdownItem(
                                                  head.head,
                                                  index,
                                                  "quantity",
                                                  e.target.value
                                                )
                                              }
                                            />
                                            {item.approved_quantity && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Max: {item.approved_quantity}
                                              </p>
                                            )}
                                          </div>

                                          {/* Unit Cost */}
                                          <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Unit Cost{" "}
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            </label>
                                            <div className="relative">
                                              <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                                                ₹
                                              </span>
                                              <input
                                                type="number"
                                                required
                                                min="0"
                                                max={item.approved_unit_cost}
                                                step="0.01"
                                                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                value={item.unit_cost || ""}
                                                onChange={(e) =>
                                                  updateBreakdownItem(
                                                    head.head,
                                                    index,
                                                    "unit_cost",
                                                    e.target.value
                                                  )
                                                }
                                              />
                                            </div>
                                            {item.approved_unit_cost && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Max: ₹
                                                {item.approved_unit_cost.toLocaleString()}
                                              </p>
                                            )}
                                          </div>

                                          {/* Total */}
                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                              Total
                                            </label>
                                            <div className="relative">
                                              <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                                                ₹
                                              </span>
                                              <input
                                                type="text"
                                                disabled
                                                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium"
                                                value={item.total_amount.toLocaleString()}
                                              />
                                            </div>
                                          </div>

                                          {/* Delete Button */}
                                          <div className="md:col-span-1 flex items-end">
                                            <button
                                              type="button"
                                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                              onClick={() =>
                                                deleteBreakdownItem(
                                                  head.head,
                                                  index
                                                )
                                              }
                                              title="Delete item"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                  {/* Add Button */}
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                                    onClick={() =>
                                      head.head === "manpower"
                                        ? addManpowerBreakdown(head.head)
                                        : addEquipmentBreakdown(head.head)
                                    }
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add {head.head === "manpower" ? "Manpower" : "Equipment"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Footer with Navigation Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div>
                  {currentStep === 2 && (
                    <button
                      type="button"
                      className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
                      onClick={handleBack}
                      disabled={submitting}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  {currentStep === 1 && (
                    <button
                      type="button"
                      className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
                      onClick={() => navigate(`/projects/${projectId}/funds`)}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  {currentStep === 1 && (
                    <button
                      type="button"
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
                      onClick={handleNext}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {currentStep === 2 && (
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      disabled={submitting}
                    >
                      {submitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {submitting ? "Creating..." : "Create Allocations"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAllocationsForm;