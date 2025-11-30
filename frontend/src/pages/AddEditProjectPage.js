// pages/AddEditProjectPage.js
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
  Save,
} from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import projectService from "../services/projectService";
import { useProject } from "../contexts/ProjectContext";

const BUDGET_HEADS = [
  { key: "manpower", label: "Manpower", hasBreakdown: true },
  { key: "equipment", label: "Equipment", hasBreakdown: true },
  { key: "travel_training", label: "Travel & Training", hasBreakdown: false },
  { key: "consumables", label: "Consumables", hasBreakdown: false },
  { key: "contingency", label: "Contingency", hasBreakdown: false },
  { key: "overhead", label: "Overhead", hasBreakdown: false },
];

const STEPS = [
  { id: 1, title: "Project Metadata", icon: "📋" },
  { id: 2, title: "Funding Agency", icon: "🏛️" },
  { id: 3, title: "Investigators", icon: "👥" },
  { id: 4, title: "Timeline", icon: "📅" },
  { id: 5, title: "Budget Setup", icon: "💰" },
];

const AddEditProjectPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const isEditMode = !!projectId;

  const {
    fundingAgencies,
    technicalGroups,
    refreshFundingAgencies,
    refreshTechnicalGroups,
    refreshProjects,
  } = useProject();

  const [loadingProjectData, setLoadingProjectData] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Form state - same as ProjectForm.js
  const [formData, setFormData] = useState({
    // Step 1: Project Metadata
    title: "",
    project_no: "",
    project_category: "R&D",
    project_type: "Sponsored",
    PFMS_id: "",
    technical_group_id: "",

    // Step 2: Funding Agency
    funding_agency_id: "",

    // Step 3: Investigators
    pi_name: "",
    pi_email: "",
    pi_phone: "",
    pi_designation: "",
    co_investigators: [],

    // Step 4: Timeline
    start_date: "",
    end_date: "",
    duration_months: "",

    // Step 5: Budget Setup
    manpower_allocation: "",
    equipment_allocation: "",
    travel_training_allocation: "",
    consumables_allocation: "",
    contingency_allocation: "",
    overhead_allocation: "",

    // Budget Breakdowns
    manpower_breakdown: [],
    equipment_breakdown: [],
  });

  // Load project data if editing
  useEffect(() => {
    if (isEditMode && projectId) {
      loadProjectData();
    }
  }, [isEditMode, projectId]);

  const loadProjectData = async () => {
    setLoadingProjectData(true);
    try {
      const project = await projectService.getProject(projectId);
      
      setFormData({
        title: project.title || "",
        project_no: project.project_no || "",
        project_category: project.project_category || "R&D",
        project_type: project.project_type || "Sponsored",
        PFMS_id: project.PFMS_id || "",
        technical_group_id: project.technical_group_id || "",
        funding_agency_id: project.funding_agency_id || "",
        pi_name: project.pi_name || "",
        pi_email: project.pi_email || "",
        pi_phone: project.pi_phone || "",
        pi_designation: project.pi_designation || "",
        co_investigators: project.co_investigators || [],
        start_date: project.start_date ? project.start_date.split('T')[0] : "",
        end_date: project.end_date ? project.end_date.split('T')[0] : "",
        duration_months: project.duration_months || "",
        manpower_allocation: project.manpower_allocation || "",
        equipment_allocation: project.equipment_allocation || "",
        travel_training_allocation: project.travel_training_allocation || "",
        consumables_allocation: project.consumables_allocation || "",
        contingency_allocation: project.contingency_allocation || "",
        overhead_allocation: project.overhead_allocation || "",
        manpower_breakdown: project.manpower_breakdown || [],
        equipment_breakdown: project.equipment_breakdown || [],
      });
    } catch (error) {
      console.error("Failed to load project:", error);
    } finally {
      setLoadingProjectData(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Project title is required";
      if (!formData.project_no.trim()) newErrors.project_no = "Project number is required";
      if (!formData.technical_group_id) newErrors.technical_group_id = "Technical group is required";
    }

    if (step === 2) {
      if (!formData.funding_agency_id) newErrors.funding_agency_id = "Funding agency is required";
    }

    if (step === 3) {
      if (!formData.pi_name.trim()) newErrors.pi_name = "PI name is required";
      if (!formData.pi_email.trim()) newErrors.pi_email = "PI email is required";
      if (formData.pi_email && !/\S+@\S+\.\S+/.test(formData.pi_email)) {
        newErrors.pi_email = "Invalid email format";
      }
    }

    if (step === 4) {
      if (!formData.start_date) newErrors.start_date = "Start date is required";
      if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
        manpower_allocation: parseFloat(formData.manpower_allocation) || 0,
        equipment_allocation: parseFloat(formData.equipment_allocation) || 0,
        travel_training_allocation: parseFloat(formData.travel_training_allocation) || 0,
        consumables_allocation: parseFloat(formData.consumables_allocation) || 0,
        contingency_allocation: parseFloat(formData.contingency_allocation) || 0,
        overhead_allocation: parseFloat(formData.overhead_allocation) || 0,
      };

      if (isEditMode) {
        await projectService.updateProject(projectId, submitData);
      } else {
        await projectService.createProject(submitData);
      }

      await refreshProjects();
      navigate('/projects');
    } catch (error) {
      console.error("Error saving project:", error);
      setErrors({ submit: error.message || "Failed to save project" });
    } finally {
      setLoading(false);
    }
  };

  // Co-investigator functions
  const addCoInvestigator = () => {
    setFormData((prev) => ({
      ...prev,
      co_investigators: [
        ...prev.co_investigators,
        { name: "", email: "", phone: "", designation: "" },
      ],
    }));
  };

  const updateCoInvestigator = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.co_investigators];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, co_investigators: updated };
    });
  };

  const removeCoInvestigator = (index) => {
    setFormData((prev) => ({
      ...prev,
      co_investigators: prev.co_investigators.filter((_, i) => i !== index),
    }));
  };

  // Budget breakdown functions
  const addBudgetItem = (type) => {
    const field = `${type}_breakdown`;
    setFormData((prev) => ({
      ...prev,
      [field]: [
        ...prev[field],
        { description: "", amount: "" },
      ],
    }));
  };

  const updateBudgetItem = (type, index, field, value) => {
    const breakdownField = `${type}_breakdown`;
    setFormData((prev) => {
      const updated = [...prev[breakdownField]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [breakdownField]: updated };
    });
  };

  const removeBudgetItem = (type, index) => {
    const breakdownField = `${type}_breakdown`;
    setFormData((prev) => ({
      ...prev,
      [breakdownField]: prev[breakdownField].filter((_, i) => i !== index),
    }));
  };

  if (loadingProjectData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? 'Edit Project' : 'Add New Project'}
            </h1>
            <p className="text-slate-600 mt-1">
              {isEditMode ? 'Update project information' : 'Fill in the details to create a new project'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                    currentStep === step.id
                      ? "bg-blue-600 text-white shadow-lg scale-110"
                      : currentStep > step.id
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <div className="hidden md:block">
                  <div
                    className={`text-sm font-semibold ${
                      currentStep >= step.id ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500">Step {step.id}</div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded ${
                    currentStep > step.id ? "bg-emerald-200" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          {/* Step 1: Project Metadata */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Metadata</h2>
              
              <Input
                label="Project Title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                error={errors.title}
                placeholder="Enter project title"
                required
              />

              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Project Number"
                  value={formData.project_no}
                  onChange={(e) => handleInputChange("project_no", e.target.value)}
                  error={errors.project_no}
                  placeholder="e.g., PROJ-2024-001"
                  required
                />

                <Input
                  label="PFMS ID (Optional)"
                  value={formData.PFMS_id}
                  onChange={(e) => handleInputChange("PFMS_id", e.target.value)}
                  placeholder="Enter PFMS ID"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Project Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.project_category}
                    onChange={(e) => handleInputChange("project_category", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="R&D">R&D</option>
                    <option value="Consultancy">Consultancy</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Project Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.project_type}
                    onChange={(e) => handleInputChange("project_type", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Sponsored">Sponsored</option>
                    <option value="Government">Government</option>
                    <option value="Internal">Internal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technical Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.technical_group_id}
                  onChange={(e) => handleInputChange("technical_group_id", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a technical group</option>
                  {technicalGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.code})
                    </option>
                  ))}
                </select>
                {errors.technical_group_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.technical_group_id}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Funding Agency */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Funding Agency</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Funding Agency <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.funding_agency_id}
                  onChange={(e) => handleInputChange("funding_agency_id", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a funding agency</option>
                  {fundingAgencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
                {errors.funding_agency_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.funding_agency_id}</p>
                )}
              </div>

              {formData.funding_agency_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Selected Agency:</strong>{" "}
                    {fundingAgencies.find((a) => a.id === parseInt(formData.funding_agency_id))?.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Investigators */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Principal Investigator</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="PI Name"
                  value={formData.pi_name}
                  onChange={(e) => handleInputChange("pi_name", e.target.value)}
                  error={errors.pi_name}
                  placeholder="Enter PI name"
                  required
                />

                <Input
                  label="PI Designation"
                  value={formData.pi_designation}
                  onChange={(e) => handleInputChange("pi_designation", e.target.value)}
                  placeholder="e.g., Senior Scientist"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="PI Email"
                  type="email"
                  value={formData.pi_email}
                  onChange={(e) => handleInputChange("pi_email", e.target.value)}
                  error={errors.pi_email}
                  placeholder="email@example.com"
                  required
                />

                <Input
                  label="PI Phone"
                  value={formData.pi_phone}
                  onChange={(e) => handleInputChange("pi_phone", e.target.value)}
                  placeholder="+91-9876543210"
                />
              </div>

              <div className="border-t border-slate-200 pt-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">Co-Investigators</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCoInvestigator}
                    icon={Plus}
                  >
                    Add Co-Investigator
                  </Button>
                </div>

                {formData.co_investigators.map((co, index) => (
                  <div key={index} className="bg-slate-50 rounded-xl p-6 mb-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold text-slate-900">Co-Investigator {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeCoInvestigator(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Name"
                        value={co.name}
                        onChange={(e) => updateCoInvestigator(index, "name", e.target.value)}
                        placeholder="Enter name"
                      />
                      <Input
                        label="Designation"
                        value={co.designation}
                        onChange={(e) => updateCoInvestigator(index, "designation", e.target.value)}
                        placeholder="Enter designation"
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={co.email}
                        onChange={(e) => updateCoInvestigator(index, "email", e.target.value)}
                        placeholder="email@example.com"
                      />
                      <Input
                        label="Phone"
                        value={co.phone}
                        onChange={(e) => updateCoInvestigator(index, "phone", e.target.value)}
                        placeholder="+91-9876543210"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Timeline */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Timeline</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  error={errors.start_date}
                  required
                />

                <Input
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  error={errors.end_date}
                />
              </div>

              <Input
                label="Duration (Months)"
                type="number"
                value={formData.duration_months}
                onChange={(e) => handleInputChange("duration_months", e.target.value)}
                placeholder="Enter duration in months"
              />
            </div>
          )}

          {/* Step 5: Budget Setup */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Budget Allocation</h2>
              
              {BUDGET_HEADS.map((head) => (
                <div key={head.key} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Input
                      label={`${head.label} Allocation (₹)`}
                      type="number"
                      value={formData[`${head.key}_allocation`]}
                      onChange={(e) => handleInputChange(`${head.key}_allocation`, e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    {head.hasBreakdown && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addBudgetItem(head.key)}
                        icon={Plus}
                        className="ml-4"
                      >
                        Add Item
                      </Button>
                    )}
                  </div>

                  {head.hasBreakdown && formData[`${head.key}_breakdown`]?.length > 0 && (
                    <div className="ml-4 space-y-3">
                      {formData[`${head.key}_breakdown`].map((item, index) => (
                        <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
                          <Input
                            label="Description"
                            value={item.description}
                            onChange={(e) => updateBudgetItem(head.key, index, "description", e.target.value)}
                            placeholder="Item description"
                          />
                          <Input
                            label="Amount (₹)"
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateBudgetItem(head.key, index, "amount", e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                          />
                          <button
                            type="button"
                            onClick={() => removeBudgetItem(head.key, index)}
                            className="text-red-600 hover:text-red-700 mt-6"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-blue-900">Total Budget:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ₹{(
                      parseFloat(formData.manpower_allocation || 0) +
                      parseFloat(formData.equipment_allocation || 0) +
                      parseFloat(formData.travel_training_allocation || 0) +
                      parseFloat(formData.consumables_allocation || 0) +
                      parseFloat(formData.contingency_allocation || 0) +
                      parseFloat(formData.overhead_allocation || 0)
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            icon={ChevronLeft}
          >
            Previous
          </Button>

          <div className="text-sm text-slate-600">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              iconRight={ChevronRight}
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="submit"
              loading={loading}
              icon={Save}
            >
              {isEditMode ? 'Update Project' : 'Create Project'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddEditProjectPage;