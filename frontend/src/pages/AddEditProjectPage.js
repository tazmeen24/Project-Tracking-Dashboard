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
  Edit2,
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
  { id: 6, title: "Review & Submit", icon: "✅" },
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

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Project Metadata
    project_no: "",
    title: "",
    alias: "",
    project_category: "sponsored",
    project_type: "PFMS",
    pfms_id: "",
    technical_group_id: "",
    funding_agency_id: "",

    // Step 2: Funding Agency Details
    funding_scheme: "",
    cna_sub_agency: "",
    sanctioned_number: "",
    contact_person: "",
    contact_designation: "",
    contact_mobile: "",
    contact_email: "",
    bank_name: "",
    bank_account_no: "",

    // Step 3: Investigators
    principal_investigator: "",
    pi_email: "",
    pi_mobile: "",
    co_investigator: "",
    co_email: "",
    co_mobile: "",

    // Step 4: Timeline
    start_date: "",
    end_date: "",

    // Step 5: Budget Setup
    manpower_allocation: 0,
    equipment_allocation: 0,
    travel_training_allocation: 0,
    consumables_allocation: 0,
    contingency_allocation: 0,
    overhead_allocation: 0,
    manpower_breakdown: [],
    equipment_breakdown: [],
  });

  // Load dropdown data first
  useEffect(() => {
    console.log('🚀 useEffect #1: Loading dropdown data');
    refreshFundingAgencies();
    refreshTechnicalGroups();
  }, [refreshFundingAgencies, refreshTechnicalGroups]);

  // Load project data AFTER dropdown data is available (if editing)
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 useEffect #2: Checking conditions for loading project');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   isEditMode:', isEditMode);
    console.log('   projectId:', projectId);
    console.log('   technicalGroups.length:', technicalGroups.length);
    console.log('   fundingAgencies.length:', fundingAgencies.length);
    
    const shouldLoad = isEditMode && projectId && technicalGroups.length > 0 && fundingAgencies.length > 0;
    console.log('   Should load project?', shouldLoad ? '✅ YES' : '❌ NO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (shouldLoad) {
      loadProjectData();
    }
  }, [isEditMode, projectId, technicalGroups.length, fundingAgencies.length]);

  const loadProjectData = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 LOADING PROJECT DATA - START');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Project ID:', projectId);
    console.log('📊 Current technicalGroups length:', technicalGroups.length);
    console.log('📊 Current fundingAgencies length:', fundingAgencies.length);
    console.log('📋 Technical Groups:', technicalGroups);
    console.log('📋 Funding Agencies:', fundingAgencies);
    
    setLoadingProjectData(true);
    try {
      const project = await projectService.getProject(projectId);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PROJECT DATA RECEIVED FROM BACKEND');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 Full project object:', project);
      console.log('');
      console.log('🔑 Key fields:');
      console.log('   technical_group_id:', project.technical_group_id);
      console.log('   technical_group_id TYPE:', typeof project.technical_group_id);
      console.log('   funding_agency_id:', project.funding_agency_id);
      console.log('   funding_agency_id TYPE:', typeof project.funding_agency_id);
      console.log('   pfms_id:', project.pfms_id);
      console.log('');
      
      const techGroupIdString = project.technical_group_id ? String(project.technical_group_id) : "";
      const fundingAgencyIdString = project.funding_agency_id ? String(project.funding_agency_id) : "";
      
      console.log('🔄 After String conversion:');
      console.log('   technical_group_id:', techGroupIdString);
      console.log('   technical_group_id TYPE:', typeof techGroupIdString);
      console.log('   funding_agency_id:', fundingAgencyIdString);
      console.log('   funding_agency_id TYPE:', typeof fundingAgencyIdString);
      console.log('');
      
      console.log('🔍 Checking if IDs exist in dropdown arrays:');
      const techGroupExists = technicalGroups.find(g => g.group_id === project.technical_group_id);
      const fundingAgencyExists = fundingAgencies.find(a => a.agency_id === project.funding_agency_id);
      console.log('   Tech Group exists?', techGroupExists ? `✅ YES: ${techGroupExists.name}` : '❌ NO');
      console.log('   Funding Agency exists?', fundingAgencyExists ? `✅ YES: ${fundingAgencyExists.name}` : '❌ NO');
      console.log('');

      setFormData({
        project_no: project.project_no || "",
        title: project.title || "",
        alias: project.alias || "",
        project_category: project.project_category || "sponsored",
        project_type: project.project_type || "PFMS",
        pfms_id: project.pfms_id || "",
        // Convert to string to match select element value type
        technical_group_id: techGroupIdString,
        funding_agency_id: fundingAgencyIdString,
        funding_scheme: project.funding_scheme || "",
        cna_sub_agency: project.cna_sub_agency || "",
        sanctioned_number: project.sanctioned_number || "",
        contact_person: project.contact_person || "",
        contact_designation: project.contact_designation || "",
        contact_mobile: project.contact_mobile || "",
        contact_email: project.contact_email || "",
        bank_name: project.bank_name || "",
        bank_account_no: project.bank_account_no || "",
        principal_investigator: project.principal_investigator || "",
        pi_email: project.pi_email || "",
        pi_mobile: project.pi_mobile || "",
        co_investigator: project.co_investigator || "",
        co_email: project.co_email || "",
        co_mobile: project.co_mobile || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        manpower_allocation: Number(project.manpower_allocation) || 0,
        equipment_allocation: Number(project.equipment_allocation) || 0,
        travel_training_allocation: Number(project.travel_training_allocation) || 0,
        consumables_allocation: Number(project.consumables_allocation) || 0,
        contingency_allocation: Number(project.contingency_allocation) || 0,
        overhead_allocation: Number(project.overhead_allocation) || 0,
        manpower_breakdown: project.manpower_breakdown || [],
        equipment_breakdown: project.equipment_breakdown || [],
      });
      
      console.log('✅ Form data set successfully');
      console.log('   technical_group_id in formData:', techGroupIdString);
      console.log('   funding_agency_id in formData:', fundingAgencyIdString);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
    } catch (error) {
      console.error('❌ FAILED TO LOAD PROJECT:', error);
      setErrors({ submit: "Failed to load project data" });
    } finally {
      setLoadingProjectData(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));

    // Handle cascading logic for category/type
    if (field === "project_category") {
      if (value === "sponsored") {
        setFormData((prev) => ({ ...prev, project_type: "PFMS", pfms_id: "" }));
      } else {
        setFormData((prev) => ({
          ...prev,
          project_type: "contract-research",
          pfms_id: "",
        }));
      }
    }

    // Clear PFMS_id if type is not PFMS
    if (field === "project_type" && value !== "PFMS") {
      setFormData((prev) => ({ ...prev, pfms_id: "" }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.project_no) newErrors.project_no = "Project number is required";
      if (!formData.title) newErrors.title = "Project title is required";
      if (!formData.technical_group_id) newErrors.technical_group_id = "Technical group is required";
      if (!formData.funding_agency_id) newErrors.funding_agency_id = "Funding agency is required";
      if (formData.project_category === "sponsored" && formData.project_type === "PFMS" && !formData.pfms_id) {
        newErrors.pfms_id = "PFMS ID is required for PFMS projects";
      }
    }

    if (step === 2) {
      if (!formData.contact_person) newErrors.contact_person = "Contact person is required";
      if (formData.contact_mobile) {
        const cleaned = formData.contact_mobile.replace(/\D/g, "");
        if (cleaned.length < 10) newErrors.contact_mobile = "Mobile number must be at least 10 digits";
      }
      if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
        newErrors.contact_email = "Invalid email format";
      }
    }

    if (step === 3) {
      if (!formData.principal_investigator) newErrors.principal_investigator = "Principal investigator is required";
      if (!formData.pi_email) newErrors.pi_email = "PI email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pi_email)) {
        newErrors.pi_email = "Invalid email format";
      }
      if (!formData.pi_mobile) newErrors.pi_mobile = "PI mobile is required";
      const piCleaned = formData.pi_mobile.replace(/\D/g, "");
      if (piCleaned.length < 10) newErrors.pi_mobile = "Mobile number must be at least 10 digits";

      if (formData.co_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.co_email)) {
        newErrors.co_email = "Invalid email format";
      }
      if (formData.co_mobile) {
        const coCleaned = formData.co_mobile.replace(/\D/g, "");
        if (coCleaned.length < 10) newErrors.co_mobile = "Mobile number must be at least 10 digits";
      }
    }

    if (step === 4) {
      if (!formData.start_date) newErrors.start_date = "Start date is required";
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

  const handleStepClick = (stepId) => {
    // Allow navigation to previous steps or current step
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    setLoading(true);
    try {
      const projectData = {
        project_no: formData.project_no,
        title: formData.title,
        alias: formData.alias || null,
        project_category: formData.project_category,
        project_type: formData.project_type,
        pfms_id: formData.pfms_id || null,
        funding_agency_id: parseInt(formData.funding_agency_id),
        technical_group_id: parseInt(formData.technical_group_id),
        principal_investigator: formData.principal_investigator,
        pi_email: formData.pi_email,
        pi_mobile: formData.pi_mobile,
        co_investigator: formData.co_investigator || null,
        co_email: formData.co_email || null,
        co_mobile: formData.co_mobile || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        manpower_allocation: getTotalManpowerAllocation(),
        equipment_allocation: getTotalEquipmentAllocation(),
        travel_training_allocation: parseFloat(formData.travel_training_allocation) || 0,
        consumables_allocation: parseFloat(formData.consumables_allocation) || 0,
        contingency_allocation: parseFloat(formData.contingency_allocation) || 0,
        overhead_allocation: parseFloat(formData.overhead_allocation) || 0,
        manpower_breakdown: formData.manpower_breakdown.map((item) => ({
          role: item.role,
          salary_per_month: item.salary_per_month,
          months: item.months,
          num_personnel: item.num_personnel,
          qualification: item.qualification || null,
          experience_required: item.experience_required || null,
        })),
        equipment_breakdown: formData.equipment_breakdown.map((item) => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          description: item.description || null,
          product_website: item.product_website || null,
        })),
      };

      if (isEditMode) {
        await projectService.updateProject(projectId, projectData);
        // FIXED: Update funding agency details in edit mode (assuming service has update method)
        await projectService.updateFundingAgencyDetails({
          agency_id: parseInt(formData.funding_agency_id),
          contact_person: formData.contact_person,
          designation: formData.contact_designation || null,
          mobile: formData.contact_mobile || null,
          email: formData.contact_email || null,
          sanctioned_number: formData.sanctioned_number || null,
          scheme: formData.funding_scheme || null,
          cna_sub_agency: formData.cna_sub_agency || null,
          bank_name: formData.bank_name || null,
          bank_account_no: formData.bank_account_no || null,
        });
      } else {
        await projectService.createProject(projectData);

        // Create funding agency details only for new projects
        if (formData.contact_person) {
          await projectService.createFundingAgencyDetails({
            agency_id: parseInt(formData.funding_agency_id),
            contact_person: formData.contact_person,
            designation: formData.contact_designation || null,
            mobile: formData.contact_mobile || null,
            email: formData.contact_email || null,
            sanctioned_number: formData.sanctioned_number || null,
            scheme: formData.funding_scheme || null,
            cna_sub_agency: formData.cna_sub_agency || null,
            bank_name: formData.bank_name || null,
            bank_account_no: formData.bank_account_no || null,
          });
        }
      }
      console.log('=== SUBMITTING PROJECT DATA ===');
      console.log('Full formData:', JSON.stringify(formData, null, 2));

      await refreshProjects();
      navigate("/projects");
    } catch (error) {
      console.error("Error saving project:", error);
      console.log('=== SUBMITTING PROJECT DATA ===');
      console.log('Full formData:', JSON.stringify(formData, null, 2));
      setErrors({ submit: error.message || "Failed to save project" });
    } finally {
      setLoading(false);
    }
  };

  // Manpower breakdown functions
  const addManpowerRow = () => {
    setFormData((prev) => ({
      ...prev,
      manpower_breakdown: [
        ...prev.manpower_breakdown,
        {
          role: "",
          salary_per_month: 0,
          months: 1,
          num_personnel: 1,
          qualification: "",
          experience_required: "",
        },
      ],
    }));
  };

  const updateManpowerRow = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.manpower_breakdown];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, manpower_breakdown: updated };
    });
  };

  const removeManpowerRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      manpower_breakdown: prev.manpower_breakdown.filter((_, i) => i !== index),
    }));
  };

  const calculateManpowerTotal = (row) => {
    return row.salary_per_month * row.months * row.num_personnel;
  };

  // Equipment breakdown functions
  const addEquipmentRow = () => {
    setFormData((prev) => ({
      ...prev,
      equipment_breakdown: [
        ...prev.equipment_breakdown,
        {
          item_name: "",
          quantity: 1,
          unit_cost: 0,
          description: "",
          product_website: "",
        },
      ],
    }));
  };

  const updateEquipmentRow = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.equipment_breakdown];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, equipment_breakdown: updated };
    });
  };

  const removeEquipmentRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      equipment_breakdown: prev.equipment_breakdown.filter((_, i) => i !== index),
    }));
  };

  const calculateEquipmentTotal = (row) => {
    return row.quantity * row.unit_cost;
  };

  // Calculate totals
  const getTotalManpowerAllocation = () => {
    return formData.manpower_breakdown.reduce(
      (sum, row) => sum + calculateManpowerTotal(row),
      0
    );
  };

  const getTotalEquipmentAllocation = () => {
    return formData.equipment_breakdown.reduce(
      (sum, row) => sum + calculateEquipmentTotal(row),
      0
    );
  };

  const getTotalBudget = () => {
    return (
      getTotalManpowerAllocation() +
      getTotalEquipmentAllocation() +
      parseFloat(formData.travel_training_allocation || 0) +
      parseFloat(formData.consumables_allocation || 0) +
      parseFloat(formData.contingency_allocation || 0) +
      parseFloat(formData.overhead_allocation || 0)
    );
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? "Edit Project" : "Add New Project"}
            </h1>
            <p className="text-slate-600 mt-1">
              {isEditMode
                ? "Update project information"
                : "Fill in the details to create a new project"}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => handleStepClick(step.id)}
                disabled={step.id > currentStep}
                className={`flex items-center gap-3 transition-all ${
                  step.id <= currentStep ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-50"
                }`}
              >
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
                <div className="hidden md:block text-left">
                  <div
                    className={`text-sm font-semibold ${
                      currentStep >= step.id ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500">Step {step.id}</div>
                </div>
              </button>
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
            <Step1ProjectMetadata
              formData={formData}
              errors={errors}
              handleChange={handleInputChange}
              fundingAgencies={fundingAgencies}
              technicalGroups={technicalGroups}
            />
          )}

          {/* Step 2: Funding Agency */}
          {currentStep === 2 && (
            <Step2FundingAgency
              formData={formData}
              errors={errors}
              handleChange={handleInputChange}
            />
          )}

          {/* Step 3: Investigators */}
          {currentStep === 3 && (
            <Step3Investigators
              formData={formData}
              errors={errors}
              handleChange={handleInputChange}
            />
          )}

          {/* Step 4: Timeline */}
          {currentStep === 4 && (
            <Step4Timeline
              formData={formData}
              errors={errors}
              handleChange={handleInputChange}
            />
          )}

          {/* Step 5: Budget Setup */}
          {currentStep === 5 && (
            <Step5BudgetSetup
              formData={formData}
              errors={errors}
              handleChange={handleInputChange}
              manpower={{
                rows: formData.manpower_breakdown,
                add: addManpowerRow,
                update: updateManpowerRow,
                remove: removeManpowerRow,
                calculateTotal: calculateManpowerTotal,
                totalAllocation: getTotalManpowerAllocation(),
              }}
              equipment={{
                rows: formData.equipment_breakdown,
                add: addEquipmentRow,
                update: updateEquipmentRow,
                remove: removeEquipmentRow,
                calculateTotal: calculateEquipmentTotal,
                totalAllocation: getTotalEquipmentAllocation(),
              }}
              totalBudget={getTotalBudget()}
            />
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <Step6Review
              formData={formData}
              fundingAgencies={fundingAgencies}
              technicalGroups={technicalGroups}
              getTotalManpowerAllocation={getTotalManpowerAllocation}
              getTotalEquipmentAllocation={getTotalEquipmentAllocation}
              getTotalBudget={getTotalBudget}
              calculateManpowerTotal={calculateManpowerTotal}
              calculateEquipmentTotal={calculateEquipmentTotal}
              onEditStep={setCurrentStep}
            />
          )}

          {errors.submit && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
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
            <Button type="button" onClick={handleNext} iconRight={ChevronRight}>
              Next Step
            </Button>
          ) : (
            <Button type="submit" loading={loading} icon={Save}>
              {isEditMode ? "Update Project" : "Create Project"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

// Step Components
const Step1ProjectMetadata = ({
  formData,
  errors,
  handleChange,
  fundingAgencies,
  technicalGroups,
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Metadata</h2>

    <div className="grid grid-cols-2 gap-6">
      <Input
        label="Project Number"
        value={formData.project_no}
        onChange={(e) => handleChange("project_no", e.target.value)}
        error={errors.project_no}
        required
        placeholder="PRJ-2024-001"
      />
      <Input
        label="Project Title"
        value={formData.title}
        onChange={(e) => handleChange("title", e.target.value)}
        error={errors.title}
        required
        placeholder="Enter project title"
      />
    </div>

    <Input
      label="Project Alias / Description"
      value={formData.alias}
      onChange={(e) => handleChange("alias", e.target.value)}
      placeholder="Short description (optional)"
    />

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Project Category <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.project_category}
          onChange={(e) => handleChange("project_category", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="sponsored">Sponsored</option>
          <option value="non-sponsored">Non-Sponsored</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Project Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.project_type}
          onChange={(e) => handleChange("project_type", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {formData.project_category === "sponsored" ? (
            <>
              <option value="PFMS">PFMS</option>
              <option value="NON-PFMS">Non-PFMS</option>
            </>
          ) : (
            <option value="contract-research">Contract Research</option>
          )}
        </select>
      </div>
    </div>

    {formData.project_category === "sponsored" &&
      formData.project_type === "PFMS" && (
        <Input
          label="PFMS ID"
          value={formData.pfms_id}
          onChange={(e) => handleChange("pfms_id", e.target.value)}
          error={errors.pfms_id}
          required
          placeholder="Enter PFMS identifier"
        />
      )}

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Technical Group / Department <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.technical_group_id}
          onChange={(e) => {
            console.log('🔄 Technical Group changed to:', e.target.value);
            handleChange("technical_group_id", e.target.value);
          }}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a group...</option>
          {technicalGroups.map((group) => {
            return (
              <option key={group.group_id} value={group.group_id}>
                {group.group_name || group.name}
              </option>
            );
          })}
        </select>
        {errors.technical_group_id && (
          <p className="mt-1 text-sm text-red-600">{errors.technical_group_id}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Funding Agency <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.funding_agency_id}
          onChange={(e) => handleChange("funding_agency_id", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select an agency...</option>
          {fundingAgencies.map((agency) => (
            <option key={agency.agency_id} value={agency.agency_id}>
              {agency.name}
            </option>
          ))}
        </select>
        {errors.funding_agency_id && (
          <p className="mt-1 text-sm text-red-600">{errors.funding_agency_id}</p>
        )}
      </div>
    </div>
  </div>
);

const Step2FundingAgency = ({
  formData,
  errors,
  handleChange,
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Funding Agency Details</h2>

    <div className="grid grid-cols-2 gap-6">
      <Input
        label="Funding Scheme"
        value={formData.funding_scheme}
        onChange={(e) => handleChange("funding_scheme", e.target.value)}
        placeholder="e.g., DST-SERB Core Research Grant"
      />
      <Input
        label="CNA Sub-Agency"
        value={formData.cna_sub_agency}
        onChange={(e) => handleChange("cna_sub_agency", e.target.value)}
        placeholder="If applicable"
      />
    </div>

    <Input
      label="Sanctioned Number"
      value={formData.sanctioned_number}
      onChange={(e) => handleChange("sanctioned_number", e.target.value)}
      placeholder="e.g., SAN-2024-001"
    />

    <div className="grid grid-cols-2 gap-6">
      <Input
        label="Contact Person"
        value={formData.contact_person}
        onChange={(e) => handleChange("contact_person", e.target.value)}
        error={errors.contact_person}
        required
        placeholder="Full name"
      />
      <Input
        label="Designation"
        value={formData.contact_designation}
        onChange={(e) => handleChange("contact_designation", e.target.value)}
        placeholder="e.g., Program Officer"
      />
    </div>

    <div className="grid grid-cols-2 gap-6">
      <Input
        label="Mobile Number"
        value={formData.contact_mobile}
        onChange={(e) => handleChange("contact_mobile", e.target.value)}
        error={errors.contact_mobile}
        placeholder="e.g., 9876543210"
      />
      <Input
        label="Email"
        type="email"
        value={formData.contact_email}
        onChange={(e) => handleChange("contact_email", e.target.value)}
        error={errors.contact_email}
        placeholder="contact@agency.gov.in"
      />
    </div>

    <div className="grid grid-cols-2 gap-6">
      <Input
        label="Bank Name"
        value={formData.bank_name}
        onChange={(e) => handleChange("bank_name", e.target.value)}
        placeholder="e.g., State Bank of India"
      />
      <Input
        label="Bank Account Number"
        value={formData.bank_account_no}
        onChange={(e) => handleChange("bank_account_no", e.target.value)}
        placeholder="e.g., 123456789012"
      />
    </div>
  </div>
);

const Step3Investigators = ({
  formData,
  errors,
  handleChange,
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Investigators</h2>

    <div className="bg-slate-50 rounded-xl p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Principal Investigator</h3>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Name"
          value={formData.principal_investigator}
          onChange={(e) => handleChange("principal_investigator", e.target.value)}
          error={errors.principal_investigator}
          required
          placeholder="Full name"
        />
        <Input
          label="Email"
          type="email"
          value={formData.pi_email}
          onChange={(e) => handleChange("pi_email", e.target.value)}
          error={errors.pi_email}
          required
          placeholder="pi@institute.ac.in"
        />
        <Input
          label="Mobile"
          value={formData.pi_mobile}
          onChange={(e) => handleChange("pi_mobile", e.target.value)}
          error={errors.pi_mobile}
          required
          placeholder="9876543210"
        />
      </div>
    </div>

    <div className="bg-slate-50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Co-Investigator (Optional)</h3>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Name"
          value={formData.co_investigator}
          onChange={(e) => handleChange("co_investigator", e.target.value)}
          placeholder="Full name"
        />
        <Input
          label="Email"
          type="email"
          value={formData.co_email}
          onChange={(e) => handleChange("co_email", e.target.value)}
          error={errors.co_email}
          placeholder="co@institute.ac.in"
        />
        <Input
          label="Mobile"
          value={formData.co_mobile}
          onChange={(e) => handleChange("co_mobile", e.target.value)}
          error={errors.co_mobile}
          placeholder="9876543210"
        />
      </div>
    </div>
  </div>
);

const Step4Timeline = ({
  formData,
  errors,
  handleChange,
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Timeline</h2>

    <div className="grid grid-cols-2 gap-6">
      <Input
        label="Start Date"
        type="date"
        value={formData.start_date}
        onChange={(e) => handleChange("start_date", e.target.value)}
        error={errors.start_date}
        required
      />
      <Input
        label="End Date (Optional)"
        type="date"
        value={formData.end_date}
        onChange={(e) => handleChange("end_date", e.target.value)}
      />
    </div>

    {formData.start_date && formData.end_date && (
      <div className="bg-blue-50 p-4 rounded-xl">
        <p className="text-sm text-blue-800">
          Project Duration: {Math.ceil(
            (new Date(formData.end_date) - new Date(formData.start_date)) /
              (1000 * 60 * 60 * 24 * 30)
          )} months
        </p>
      </div>
    )}
  </div>
);

const Step5BudgetSetup = ({
  formData,
  errors,
  handleChange,
  manpower,
  equipment,
  totalBudget,
}) => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Budget Setup</h2>

    {/* Manpower */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">1. Manpower</h3>
          <p className="text-sm text-slate-600">
            Personnel breakdown with qualifications & experience
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={manpower.add} icon={Plus}>
          Add Row
        </Button>
      </div>

      {manpower.rows.length > 0 && (
        <div className="space-y-4">
          {manpower.rows.map((row, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">
                  Position #{index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => manpower.remove(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Role *
                  </label>
                  <input
                    type="text"
                    value={row.role}
                    onChange={(e) =>
                      manpower.update(index, "role", e.target.value)
                    }
                    placeholder="e.g., Junior Research Fellow"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Salary/Month *
                  </label>
                  <input
                    type="number"
                    value={row.salary_per_month}
                    onChange={(e) =>
                      manpower.update(
                        index,
                        "salary_per_month",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Months *
                  </label>
                  <input
                    type="number"
                    value={row.months}
                    onChange={(e) =>
                      manpower.update(index, "months", parseInt(e.target.value) || 1)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Personnel *
                  </label>
                  <input
                    type="number"
                    value={row.num_personnel}
                    onChange={(e) =>
                      manpower.update(
                        index,
                        "num_personnel",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Qualification
                  </label>
                  <textarea
                    value={row.qualification || ""}
                    onChange={(e) =>
                      manpower.update(index, "qualification", e.target.value)
                    }
                    placeholder="e.g., B.Tech/M.Tech in CS, PMP Certified..."
                    rows="2"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Experience Required
                  </label>
                  <textarea
                    value={row.experience_required || ""}
                    onChange={(e) =>
                      manpower.update(index, "experience_required", e.target.value)
                    }
                    placeholder="e.g., 5+ years in full-stack development..."
                    rows="2"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-100 px-3 py-2 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">
                  Total: ₹{manpower.calculateTotal(row).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 p-3 rounded-lg mt-4">
        <p className="text-sm font-semibold text-blue-900">
          Total Manpower Allocation: ₹
          {manpower.totalAllocation.toLocaleString("en-IN")}
        </p>
      </div>
    </div>

    {/* Equipment */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">2. Equipment</h3>
          <p className="text-sm text-slate-600">
            Equipment and instruments (with description & product links)
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={equipment.add} icon={Plus}>
          Add Row
        </Button>
      </div>

      {equipment.rows.length > 0 && (
        <div className="space-y-4">
          {equipment.rows.map((row, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">
                  Equipment #{index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => equipment.remove(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={row.item_name}
                    onChange={(e) =>
                      equipment.update(index, "item_name", e.target.value)
                    }
                    placeholder="Equipment name"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) =>
                      equipment.update(index, "quantity", parseInt(e.target.value) || 1)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Cost *
                  </label>
                  <input
                    type="number"
                    value={row.unit_cost}
                    onChange={(e) =>
                      equipment.update(
                        index,
                        "unit_cost",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Additional Fields */}
              <div className="space-y-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={row.description || ""}
                    onChange={(e) =>
                      equipment.update(index, "description", e.target.value)
                    }
                    placeholder="Detailed specifications, features, model number..."
                    rows="2"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Product Website
                  </label>
                  <input
                    type="url"
                    value={row.product_website || ""}
                    onChange={(e) =>
                      equipment.update(index, "product_website", e.target.value)
                    }
                    placeholder="https://www.manufacturer.com/product"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="bg-green-100 px-3 py-2 rounded-lg">
                <p className="text-sm font-semibold text-green-900">
                  Total: ₹{equipment.calculateTotal(row).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-green-50 p-3 rounded-lg mt-4">
        <p className="text-sm font-semibold text-green-900">
          Total Equipment Allocation: ₹
          {equipment.totalAllocation.toLocaleString("en-IN")}
        </p>
      </div>
    </div>

    {/* Other Budget Heads */}
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="3. Travel & Training"
        type="number"
        value={formData.travel_training_allocation}
        onChange={(e) => handleChange("travel_training_allocation", e.target.value)}
        placeholder="0"
      />
      <Input
        label="4. Consumables"
        type="number"
        value={formData.consumables_allocation}
        onChange={(e) => handleChange("consumables_allocation", e.target.value)}
        placeholder="0"
      />
      <Input
        label="5. Contingency"
        type="number"
        value={formData.contingency_allocation}
        onChange={(e) => handleChange("contingency_allocation", e.target.value)}
        placeholder="0"
      />
      <Input
        label="6. Overhead"
        type="number"
        value={formData.overhead_allocation}
        onChange={(e) => handleChange("overhead_allocation", e.target.value)}
        placeholder="0"
      />
    </div>

    {/* Total Budget */}
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
      <p className="text-sm opacity-90 mb-1">Total Approved Budget</p>
      <p className="text-4xl font-bold">₹{totalBudget.toLocaleString("en-IN")}</p>
    </div>
  </div>
);

const Step6Review = ({
  formData,
  fundingAgencies,
  technicalGroups,
  getTotalManpowerAllocation,
  getTotalEquipmentAllocation,
  getTotalBudget,
  calculateManpowerTotal,
  calculateEquipmentTotal,
  onEditStep,
}) => {
  const selectedAgency = fundingAgencies.find(
    (a) => a.agency_id === parseInt(formData.funding_agency_id)
  );
  const selectedGroup = technicalGroups.find(
    (g) => g.group_id === parseInt(formData.technical_group_id)
  );

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        Review & Submit
      </h2>

      {/* Project Metadata */}
      <div className="bg-slate-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            1. Project Metadata
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Project Number:</span>
            <p className="font-medium text-slate-900">{formData.project_no}</p>
          </div>
          <div>
            <span className="text-slate-600">Project Title:</span>
            <p className="font-medium text-slate-900">{formData.title}</p>
          </div>
          {formData.alias && (
            <div className="col-span-2">
              <span className="text-slate-600">Alias:</span>
              <p className="font-medium text-slate-900">{formData.alias}</p>
            </div>
          )}
          <div>
            <span className="text-slate-600">Category:</span>
            <p className="font-medium text-slate-900 capitalize">
              {formData.project_category}
            </p>
          </div>
          <div>
            <span className="text-slate-600">Type:</span>
            <p className="font-medium text-slate-900">{formData.project_type}</p>
          </div>
          {formData.pfms_id && (
            <div>
              <span className="text-slate-600">PFMS ID:</span>
              <p className="font-medium text-slate-900">{formData.pfms_id}</p>
            </div>
          )}
          <div>
            <span className="text-slate-600">Technical Group:</span>
            <p className="font-medium text-slate-900">
              {selectedGroup?.name || "N/A"}
            </p>
          </div>
          <div>
            <span className="text-slate-600">Funding Agency:</span>
            <p className="font-medium text-slate-900">
              {selectedAgency?.name || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Funding Agency Details */}
      <div className="bg-slate-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            2. Funding Agency Details
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {formData.funding_scheme && (
            <div>
              <span className="text-slate-600">Scheme:</span>
              <p className="font-medium text-slate-900">{formData.funding_scheme}</p>
            </div>
          )}
          {formData.cna_sub_agency && (
            <div>
              <span className="text-slate-600">CNA Sub-Agency:</span>
              <p className="font-medium text-slate-900">{formData.cna_sub_agency}</p>
            </div>
          )}
          {formData.sanctioned_number && (
            <div>
              <span className="text-slate-600">Sanctioned Number:</span>
              <p className="font-medium text-slate-900">
                {formData.sanctioned_number}
              </p>
            </div>
          )}
          <div>
            <span className="text-slate-600">Contact Person:</span>
            <p className="font-medium text-slate-900">{formData.contact_person}</p>
          </div>
          {formData.contact_designation && (
            <div>
              <span className="text-slate-600">Designation:</span>
              <p className="font-medium text-slate-900">
                {formData.contact_designation}
              </p>
            </div>
          )}
          {formData.contact_mobile && (
            <div>
              <span className="text-slate-600">Mobile:</span>
              <p className="font-medium text-slate-900">{formData.contact_mobile}</p>
            </div>
          )}
          {formData.contact_email && (
            <div>
              <span className="text-slate-600">Email:</span>
              <p className="font-medium text-slate-900">{formData.contact_email}</p>
            </div>
          )}
          {formData.bank_name && (
            <div>
              <span className="text-slate-600">Bank Name:</span>
              <p className="font-medium text-slate-900">{formData.bank_name}</p>
            </div>
          )}
          {formData.bank_account_no && (
            <div>
              <span className="text-slate-600">Account Number:</span>
              <p className="font-medium text-slate-900">{formData.bank_account_no}</p>
            </div>
          )}
        </div>
      </div>

      {/* Investigators */}
      <div className="bg-slate-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">3. Investigators</h3>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              Principal Investigator
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Name:</span>
                <p className="font-medium text-slate-900">
                  {formData.principal_investigator}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Email:</span>
                <p className="font-medium text-slate-900">{formData.pi_email}</p>
              </div>
              <div>
                <span className="text-slate-600">Mobile:</span>
                <p className="font-medium text-slate-900">{formData.pi_mobile}</p>
              </div>
            </div>
          </div>
          {formData.co_investigator && (
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Co-Investigator
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Name:</span>
                  <p className="font-medium text-slate-900">
                    {formData.co_investigator}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Email:</span>
                  <p className="font-medium text-slate-900">
                    {formData.co_email || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Mobile:</span>
                  <p className="font-medium text-slate-900">
                    {formData.co_mobile || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-slate-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">4. Timeline</h3>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Start Date:</span>
            <p className="font-medium text-slate-900">
              {formData.start_date
                ? new Date(formData.start_date).toLocaleDateString("en-IN")
                : "N/A"}
            </p>
          </div>
          <div>
            <span className="text-slate-600">End Date:</span>
            <p className="font-medium text-slate-900">
              {formData.end_date
                ? new Date(formData.end_date).toLocaleDateString("en-IN")
                : "Ongoing"}
            </p>
          </div>
          {formData.start_date && formData.end_date && (
            <div className="col-span-2">
              <span className="text-slate-600">Duration:</span>
              <p className="font-medium text-slate-900">
                {Math.ceil(
                  (new Date(formData.end_date) - new Date(formData.start_date)) /
                    (1000 * 60 * 60 * 24 * 30)
                )}{" "}
                months
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Budget Summary */}
      <div className="bg-slate-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">5. Budget Summary</h3>
          <button
            type="button"
            onClick={() => onEditStep(5)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="space-y-6 text-sm">
          {/* Manpower Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Manpower</h4>
            {formData.manpower_breakdown.length > 0 ? (
              <div className="space-y-4">
                {formData.manpower_breakdown.map((row, index) => (
                  <div key={index} className="border-b border-slate-200 pb-2">
                    <p className="font-medium text-slate-900">Position #{index + 1}: {row.role}</p>
                    <p>Salary/Month: ₹{row.salary_per_month.toLocaleString("en-IN")}</p>
                    <p>Months: {row.months}</p>
                    <p>Personnel: {row.num_personnel}</p>
                    {row.qualification && <p>Qualification: {row.qualification}</p>}
                    {row.experience_required && <p>Experience: {row.experience_required}</p>}
                    <p className="font-semibold">Total: ₹{calculateManpowerTotal(row).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No manpower breakdown provided</p>
            )}
            <p className="mt-2 font-semibold">Total Manpower: ₹{getTotalManpowerAllocation().toLocaleString("en-IN")}</p>
          </div>

          {/* Equipment Breakdown */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Equipment</h4>
            {formData.equipment_breakdown.length > 0 ? (
              <div className="space-y-4">
                {formData.equipment_breakdown.map((row, index) => (
                  <div key={index} className="border-b border-slate-200 pb-2">
                    <p className="font-medium text-slate-900">Equipment #{index + 1}: {row.item_name}</p>
                    <p>Quantity: {row.quantity}</p>
                    <p>Unit Cost: ₹{row.unit_cost.toLocaleString("en-IN")}</p>
                    {row.description && <p>Description: {row.description}</p>}
                    {row.product_website && (
                      <p>
                        Website: <a href={row.product_website} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{row.product_website}</a>
                      </p>
                    )}
                    <p className="font-semibold">Total: ₹{calculateEquipmentTotal(row).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No equipment breakdown provided</p>
            )}
            <p className="mt-2 font-semibold">Total Equipment: ₹{getTotalEquipmentAllocation().toLocaleString("en-IN")}</p>
          </div>

          {/* Other Budget Heads */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Other Allocations</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-600">Travel & Training:</span>
                <p className="font-medium text-slate-900">₹{(parseFloat(formData.travel_training_allocation) || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <span className="text-slate-600">Consumables:</span>
                <p className="font-medium text-slate-900">₹{(parseFloat(formData.consumables_allocation) || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <span className="text-slate-600">Contingency:</span>
                <p className="font-medium text-slate-900">₹{(parseFloat(formData.contingency_allocation) || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <span className="text-slate-600">Overhead:</span>
                <p className="font-medium text-slate-900">₹{(parseFloat(formData.overhead_allocation) || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-emerald-100 p-4 rounded-lg mt-4">
            <p className="text-base font-bold text-emerald-900">
              Grand Total Budget: ₹{getTotalBudget().toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditProjectPage;