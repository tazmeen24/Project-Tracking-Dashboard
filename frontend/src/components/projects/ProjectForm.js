// components/projects/ProjectForm.js
import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import projectService from "../../services/projectService";
import { useProject } from "../../contexts/ProjectContext";

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

const ProjectForm = ({ isOpen, onClose, onSuccess, editProject = null }) => {
  const {
    fundingAgencies,
    technicalGroups,
    refreshFundingAgencies,
    refreshTechnicalGroups,
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
    PFMS_id: "",
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

  // Populate form when editing
  // Fetch FULL project data when editing
useEffect(() => {
  const fetchAndPopulateProject = async () => {
    if (editProject && editProject.project_id) {
      setLoadingProjectData(true);
      
      try {
        // Use the SAME endpoint as ProjectDetails to get COMPLETE data
        const fullProject = await projectService.getProject(editProject.project_id);
        
        // Populate ALL fields
        setFormData({
          // Step 1: Project Metadata
          project_no: fullProject.project_no || '',
          title: fullProject.title || '',
          alias: fullProject.alias || '',
          project_category: fullProject.project_category || 'sponsored',
          project_type: fullProject.project_type || 'PFMS',
          PFMS_id: fullProject.PFMS_id || '',
          technical_group_id: fullProject.technical_group_id || '',
          funding_agency_id: fullProject.funding_agency_id || '',

          // Step 2: Funding Agency Details
          funding_scheme: fullProject.funding_scheme || '',
          cna_sub_agency: fullProject.cna_sub_agency || '',
          sanctioned_number: fullProject.sanctioned_number || '',
          contact_person: fullProject.contact_person || '',
          contact_designation: fullProject.contact_designation || '',
          contact_mobile: fullProject.contact_mobile || '',
          contact_email: fullProject.contact_email || '',
          bank_name: fullProject.bank_name || '',
          bank_account_no: fullProject.bank_account_no || '',

          // Step 3: Investigators
          principal_investigator: fullProject.principal_investigator || '',
          pi_email: fullProject.pi_email || '',
          pi_mobile: fullProject.pi_mobile || '',
          co_investigator: fullProject.co_investigator || '',
          co_email: fullProject.co_email || '',
          co_mobile: fullProject.co_mobile || '',

          // Step 4: Timeline
          start_date: fullProject.start_date || '',
          end_date: fullProject.end_date || '',

          // Step 5: Budget
          manpower_allocation: Number(fullProject.manpower_allocation) || 0,
          equipment_allocation: Number(fullProject.equipment_allocation) || 0,
          travel_training_allocation: Number(fullProject.travel_training_allocation) || 0,
          consumables_allocation: Number(fullProject.consumables_allocation) || 0,
          contingency_allocation: Number(fullProject.contingency_allocation) || 0,
          overhead_allocation: Number(fullProject.overhead_allocation) || 0,
          
          manpower_breakdown: fullProject.manpower_breakdown && fullProject.manpower_breakdown.length > 0 
            ? fullProject.manpower_breakdown
            : [],
          
          equipment_breakdown: fullProject.equipment_breakdown && fullProject.equipment_breakdown.length > 0
            ? fullProject.equipment_breakdown
            : []
        });
        
      } catch (error) {
        alert("Failed to load project data");
      } finally {
        setLoadingProjectData(false);
      }
    }
  };
  
  if (isOpen && editProject) {
    fetchAndPopulateProject();
  }
}, [editProject, isOpen]);

  useEffect(() => {
    if (isOpen) {
      refreshFundingAgencies();
      refreshTechnicalGroups();
    }
  }, [isOpen, refreshFundingAgencies, refreshTechnicalGroups]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Handle cascading logic for category/type
    if (field === "project_category") {
      if (value === "sponsored") {
        setFormData((prev) => ({ ...prev, project_type: "PFMS", PFMS_id: "" }));
      } else {
        setFormData((prev) => ({
          ...prev,
          project_type: "contract-research",
          PFMS_id: "",
        }));
      }
    }

    // Clear PFMS_id if type is not PFMS
    if (field === "project_type" && value !== "PFMS") {
      setFormData((prev) => ({ ...prev, PFMS_id: "" }));
    }
  };

  // Manpower breakdown handlers
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
          qualification: "",        // NEW FIELD
          experience_required: "",  // NEW FIELD
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

  // Equipment breakdown handlers
  const addEquipmentRow = () => {
    setFormData((prev) => ({
      ...prev,
      equipment_breakdown: [
        ...prev.equipment_breakdown,
        {
          item_name: "",
          quantity: 1,
          unit_cost: 0,
          description: "",        // NEW FIELD
          product_website: "",    // NEW FIELD
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
      equipment_breakdown: prev.equipment_breakdown.filter(
        (_, i) => i !== index
      ),
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

  // Validation
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.project_no)
        newErrors.project_no = "Project number is required";
      if (!formData.title) newErrors.title = "Project title is required";
      if (!formData.technical_group_id)
        newErrors.technical_group_id = "Group is required";
      if (!formData.funding_agency_id)
        newErrors.funding_agency_id = "Funding agency is required";
      if (
        formData.project_category === "sponsored" &&
        formData.project_type === "PFMS" &&
        !formData.PFMS_id
      ) {
        newErrors.PFMS_id = "PFMS ID is required for PFMS projects";
      }
    }

    if (step === 2) {
      if (!formData.contact_person)
        newErrors.contact_person = "Contact person is required";
      if (formData.contact_mobile) {
        const cleaned = formData.contact_mobile.replace(/\D/g, "");
        if (cleaned.length < 10)
          newErrors.contact_mobile = "Mobile number must be at least 10 digits";
      }
      if (
        formData.contact_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)
      ) {
        newErrors.contact_email = "Invalid email format";
      }
    }

    if (step === 3) {
      if (!formData.principal_investigator)
        newErrors.principal_investigator = "Principal investigator is required";
      if (!formData.pi_email) newErrors.pi_email = "PI email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pi_email)) {
        newErrors.pi_email = "Invalid email format";
      }
      if (!formData.pi_mobile) newErrors.pi_mobile = "PI mobile is required";
      const piCleaned = formData.pi_mobile.replace(/\D/g, "");
      if (piCleaned.length < 10)
        newErrors.pi_mobile = "Mobile number must be at least 10 digits";

      if (
        formData.co_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.co_email)
      ) {
        newErrors.co_email = "Invalid email format";
      }
      if (formData.co_mobile) {
        const coCleaned = formData.co_mobile.replace(/\D/g, "");
        if (coCleaned.length < 10)
          newErrors.co_mobile = "Mobile number must be at least 10 digits";
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

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setLoading(true);
    try {
      const projectData = {
        project_no: formData.project_no,
        title: formData.title,
        alias: formData.alias || null,
        project_category: formData.project_category,
        project_type: formData.project_type,
        PFMS_id: formData.PFMS_id || null,
        funding_agency_id: parseInt(formData.funding_agency_id),
        technical_group_id: parseInt(formData.technical_group_id),

        // Investigators
        principal_investigator: formData.principal_investigator,
        pi_email: formData.pi_email,
        pi_mobile: formData.pi_mobile,
        co_investigator: formData.co_investigator || null,
        co_email: formData.co_email || null,
        co_mobile: formData.co_mobile || null,

        // Timeline
        start_date: formData.start_date,
        end_date: formData.end_date || null,

        // Budget
        manpower_allocation: getTotalManpowerAllocation(),
        equipment_allocation: getTotalEquipmentAllocation(),
        travel_training_allocation:
          parseFloat(formData.travel_training_allocation) || 0,
        consumables_allocation:
          parseFloat(formData.consumables_allocation) || 0,
        contingency_allocation:
          parseFloat(formData.contingency_allocation) || 0,
        overhead_allocation: parseFloat(formData.overhead_allocation) || 0,

        // Breakdowns with NEW FIELDS
        manpower_breakdown: formData.manpower_breakdown.map(item => ({
          role: item.role,
          salary_per_month: item.salary_per_month,
          months: item.months,
          num_personnel: item.num_personnel,
          qualification: item.qualification || null,        // NEW
          experience_required: item.experience_required || null  // NEW
        })),
        equipment_breakdown: formData.equipment_breakdown.map(item => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          description: item.description || null,           // NEW
          product_website: item.product_website || null    // NEW
        })),
      };

      if (editProject) {
        // Update existing project
        await projectService.updateProject(editProject.project_id, projectData);
      } else {
        // Create new project
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

      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1ProjectMetadata
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            fundingAgencies={fundingAgencies}
            technicalGroups={technicalGroups}
          />
        );
      case 2:
        return (
          <Step2FundingAgency
            formData={formData}
            errors={errors}
            handleChange={handleChange}
          />
        );
      case 3:
        return (
          <Step3Investigators
            formData={formData}
            errors={errors}
            handleChange={handleChange}
          />
        );
      case 4:
        return (
          <Step4Timeline
            formData={formData}
            errors={errors}
            handleChange={handleChange}
          />
        );
      case 5:
        return (
          <Step5BudgetSetup
            formData={formData}
            errors={errors}
            handleChange={handleChange}
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
        );
      default:
        return null;
    }
  };

  // Show loading while fetching project data
if (loadingProjectData) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Loading Project..." size="xl">
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project data...</p>
        </div>
      </div>
    </Modal>
  );
}

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editProject ? "Edit Project" : "Create New Project"}
      size="xl"
    >
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                    currentStep >= step.id
                      ? "bg-slate-900 text-white shadow-lg scale-110"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    currentStep >= step.id ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 transition-all duration-300 ${
                    currentStep > step.id ? "bg-slate-900" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStepContent()}</div>

      {/* Error Display */}
      {errors.submit && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 text-sm">{errors.submit}</span>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1}
          icon={ChevronLeft}
        >
          Back
        </Button>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          {currentStep < STEPS.length ? (
            <Button variant="primary" onClick={handleNext} icon={ChevronRight}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              icon={Check}
            >
              {editProject ? "Update Project" : "Create Project"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Step Components (Steps 1-4 remain the same)
const Step1ProjectMetadata = ({
  formData,
  errors,
  handleChange,
  fundingAgencies,
  technicalGroups,
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
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

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Project Category <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.project_category}
          onChange={(e) => handleChange("project_category", e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
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
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
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
          value={formData.PFMS_id}
          onChange={(e) => handleChange("PFMS_id", e.target.value)}
          error={errors.PFMS_id}
          required
          placeholder="Enter PFMS identifier"
        />
      )}

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Technical Group / Department <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.technical_group_id}
          onChange={(e) => handleChange("technical_group_id", e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Select a group...</option>
          {technicalGroups.map((group) => (
            <option key={group.group_id} value={group.group_id}>
              {group.name}
            </option>
          ))}
        </select>
        {errors.technical_group_id && (
          <p className="mt-1 text-sm text-red-600">
            {errors.technical_group_id}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Funding Agency <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.funding_agency_id}
          onChange={(e) => handleChange("funding_agency_id", e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Select an agency...</option>
          {fundingAgencies.map((agency) => (
            <option key={agency.agency_id} value={agency.agency_id}>
              {agency.name}
            </option>
          ))}
        </select>
        {errors.funding_agency_id && (
          <p className="mt-1 text-sm text-red-600">
            {errors.funding_agency_id}
          </p>
        )}
      </div>
    </div>
  </div>
);

const Step2FundingAgency = ({ formData, errors, handleChange }) => (
  <div className="space-y-6">
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl mb-6">
      <p className="text-sm text-blue-800">
        <strong>Funding Agency Details:</strong> Provide detailed information
        about the funding agency for this project.
      </p>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <Input
        label="Scheme"
        value={formData.funding_scheme}
        onChange={(e) => handleChange("funding_scheme", e.target.value)}
        placeholder="Scheme name"
      />
      <Input
        label="CNA Sub-Agency"
        value={formData.cna_sub_agency}
        onChange={(e) => handleChange("cna_sub_agency", e.target.value)}
        placeholder="Sub-agency (if applicable)"
      />
      <Input
        label="Sanctioned Number"
        value={formData.sanctioned_number}
        onChange={(e) => handleChange("sanctioned_number", e.target.value)}
        placeholder="Official sanction reference"
      />
    </div>

    <div className="border-t border-slate-200 pt-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Contact Person
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Contact Person Name"
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
          placeholder="Job title"
        />
        <Input
          label="Mobile Number"
          value={formData.contact_mobile}
          onChange={(e) => handleChange("contact_mobile", e.target.value)}
          error={errors.contact_mobile}
          placeholder="+91 98765 43210"
        />
        <Input
          label="Email Address"
          type="email"
          value={formData.contact_email}
          onChange={(e) => handleChange("contact_email", e.target.value)}
          error={errors.contact_email}
          placeholder="email@example.com"
        />
      </div>
    </div>

    <div className="border-t border-slate-200 pt-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Banking Information
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Bank Name"
          value={formData.bank_name}
          onChange={(e) => handleChange("bank_name", e.target.value)}
          placeholder="Name of the bank"
        />
        <Input
          label="Bank Account Number"
          value={formData.bank_account_no}
          onChange={(e) => handleChange("bank_account_no", e.target.value)}
          placeholder="Project account number"
        />
      </div>
    </div>
  </div>
);

const Step3Investigators = ({ formData, errors, handleChange }) => (
  <div className="space-y-6">
    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-xl">
      <h3 className="font-semibold text-indigo-900 mb-2">
        Principal Investigator
      </h3>
      <p className="text-sm text-indigo-800">
        Primary researcher responsible for the project.
      </p>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <Input
        label="Principal Investigator"
        value={formData.principal_investigator}
        onChange={(e) => handleChange("principal_investigator", e.target.value)}
        error={errors.principal_investigator}
        required
        placeholder="Full name"
      />
      <Input
        label="PI Email"
        type="email"
        value={formData.pi_email}
        onChange={(e) => handleChange("pi_email", e.target.value)}
        error={errors.pi_email}
        required
        placeholder="pi@example.com"
      />
      <Input
        label="PI Mobile"
        value={formData.pi_mobile}
        onChange={(e) => handleChange("pi_mobile", e.target.value)}
        error={errors.pi_mobile}
        required
        placeholder="+91 98765 43210"
      />
    </div>

    <div className="border-t border-slate-200 pt-6">
      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-xl mb-4">
        <h3 className="font-semibold text-purple-900 mb-2">
          Co-Investigator (Optional)
        </h3>
        <p className="text-sm text-purple-800">
          Secondary researcher assisting with the project.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Co-Investigator"
          value={formData.co_investigator}
          onChange={(e) => handleChange("co_investigator", e.target.value)}
          placeholder="Full name (optional)"
        />
        <Input
          label="Co-I Email"
          type="email"
          value={formData.co_email}
          onChange={(e) => handleChange("co_email", e.target.value)}
          error={errors.co_email}
          placeholder="coi@example.com"
        />
        <Input
          label="Co-I Mobile"
          value={formData.co_mobile}
          onChange={(e) => handleChange("co_mobile", e.target.value)}
          error={errors.co_mobile}
          placeholder="+91 98765 43210"
        />
      </div>
    </div>
  </div>
);

const Step4Timeline = ({ formData, errors, handleChange }) => (
  <div className="space-y-6">
    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl">
      <p className="text-sm text-emerald-800">
        <strong>Project Duration:</strong> Specify the start and expected end
        dates for this project.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Start Date"
        type="date"
        value={formData.start_date}
        onChange={(e) => handleChange("start_date", e.target.value)}
        error={errors.start_date}
        required
      />
      <Input
        label="Expected End Date"
        type="date"
        value={formData.end_date}
        onChange={(e) => handleChange("end_date", e.target.value)}
        helperText="Leave empty if ongoing"
      />
    </div>

    {formData.start_date && formData.end_date && (
      <div className="bg-slate-50 p-4 rounded-xl">
        <p className="text-sm text-slate-700">
          <strong>Duration:</strong>{" "}
          {Math.ceil(
            (new Date(formData.end_date) - new Date(formData.start_date)) /
              (1000 * 60 * 60 * 24 * 30)
          )}{" "}
          months
        </p>
      </div>
    )}
  </div>
);

// UPDATED Step 5 with NEW FIELDS in breakdown tables
const Step5BudgetSetup = ({
  formData,
  errors,
  handleChange,
  manpower,
  equipment,
  totalBudget,
}) => (
  <div className="space-y-8">
    {/* Manpower - UPDATED WITH NEW FIELDS */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">1. Manpower</h3>
          <p className="text-sm text-slate-600">
            Personnel costs with breakdown (including qualifications & experience)
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={manpower.add}
          icon={Plus}
        >
          Add Row
        </Button>
      </div>

      {manpower.rows.length > 0 && (
        <div className="space-y-4">
          {manpower.rows.map((row, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">Position #{index + 1}</h4>
                <button
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
                    placeholder="JRF/SRF/RA"
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      manpower.update(
                        index,
                        "months",
                        parseInt(e.target.value) || 1
                      )
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

              {/* NEW FIELDS */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Qualification ✨
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
                    Experience Required ✨
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

    {/* Equipment - UPDATED WITH NEW FIELDS */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">2. Equipment</h3>
          <p className="text-sm text-slate-600">
            Equipment and instruments (with description & product links)
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={equipment.add}
          icon={Plus}
        >
          Add Row
        </Button>
      </div>

      {equipment.rows.length > 0 && (
        <div className="space-y-4">
          {equipment.rows.map((row, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">Equipment #{index + 1}</h4>
                <button
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
                      equipment.update(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1
                      )
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

              {/* NEW FIELDS */}
              <div className="space-y-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description ✨
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
                    Product Website ✨
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

    {/* Other Budget Heads (single amounts) */}
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="3. Travel & Training"
        type="number"
        value={formData.travel_training_allocation}
        onChange={(e) =>
          handleChange("travel_training_allocation", e.target.value)
        }
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
      <p className="text-4xl font-bold">
        ₹{totalBudget.toLocaleString("en-IN")}
      </p>
    </div>
  </div>
);

export default ProjectForm;