// pages/ProjectDetailsFullPage.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Edit,
  ChevronDown,
  ChevronUp,
  User,
  GraduationCap,
  Award,
  BarChart3,
} from "lucide-react";
import Button from "../components/common/Button";
import projectService from "../services/projectService";
import { formatCurrency, getProjectStatus } from "../utils/helpers";
import { useProject } from "../contexts/ProjectContext";
import { FileText } from "lucide-react";

const ProjectDetailsFullPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Use selectedProject directly from context
  const { selectedProject, fetchProjectById, loading, error } = useProject();
  const [expanded, setExpanded] = useState({
    manpower: false,
    equipment: false,
  });

  // Add state for actual expenditures
  const [actualExpenditures, setActualExpenditures] = useState({
    manpower_expenditures: [],
    equipment_expenditures: [],
    budget_expenditures: [],
  });
  const [expendituresLoading, setExpendituresLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    investigators: true,
    funding: true,
    budget: true,
    manpower: true,
    equipment: true,
    funds: true,
    expenditure: true,
  });

  // Fetch project and expenditures
  useEffect(() => {
    const fetchAllData = async () => {
      if (!projectId) return;

      // Fetch main project data
      await fetchProjectById(projectId);

      // Fetch actual expenditures separately
      setExpendituresLoading(true);
      try {
        const [manpower, equipment, budget] = await Promise.all([
          projectService.getManpower(projectId),
          projectService.getEquipment(projectId),
          projectService.getExpenditure(projectId),
        ]);

        setActualExpenditures({
          manpower_expenditures: manpower || [],
          equipment_expenditures: equipment || [],
          budget_expenditures: budget || [],
        });
      } catch (err) {
        console.error("Failed to fetch expenditures:", err);
        setActualExpenditures({
          manpower_expenditures: [],
          equipment_expenditures: [],
          budget_expenditures: [],
        });
      } finally {
        setExpendituresLoading(false);
      }
    };

    fetchAllData();
  }, [projectId, fetchProjectById]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Use selectedProject as project
  const project = selectedProject;

  // Budget calculations
  const getTotalBudget = () => {
    if (!project) return 0;
    return (
      (project.manpower_allocation || 0) +
      (project.equipment_allocation || 0) +
      (project.travel_training_allocation || 0) +
      (project.consumables_allocation || 0) +
      (project.contingency_allocation || 0) +
      (project.overhead_allocation || 0)
    );
  };

  const getTotalFunds = () => {
    if (!project?.funds) return 0;
    return project.funds.reduce((sum, fund) => sum + (fund.amount || 0), 0);
  };

  // Updated expenditure calculation using actual data
  const getTotalExpenditure = () => {
    if (!actualExpenditures) return 0;

    const manpowerTotal = actualExpenditures.manpower_expenditures.reduce(
      (sum, exp) => sum + (exp.total_cost || 0),
      0
    );

    const equipmentTotal = actualExpenditures.equipment_expenditures.reduce(
      (sum, exp) => sum + (exp.total_cost || 0),
      0
    );

    const budgetTotal = actualExpenditures.budget_expenditures.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    return manpowerTotal + equipmentTotal + budgetTotal;
  };

  // Get expenditure by head for detailed breakdown
  const getExpenditureByHead = (head) => {
    if (!actualExpenditures) return 0;

    if (head === "manpower") {
      return actualExpenditures.manpower_expenditures.reduce(
        (sum, exp) => sum + (exp.total_cost || 0),
        0
      );
    }

    if (head === "equipment") {
      return actualExpenditures.equipment_expenditures.reduce(
        (sum, exp) => sum + (exp.total_cost || 0),
        0
      );
    }

    // For other heads (consumables, contingency, etc.)
    return actualExpenditures.budget_expenditures
      .filter((exp) => exp.head === head)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  };

  const getBalance = () => {
    return getTotalFunds() - getTotalExpenditure();
  };

  const calculateDuration = () => {
    if (!project?.start_date || !project?.end_date) return null;
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return months;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-300">
                Error Loading Project
              </h3>
              <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/projects")}
            className="mt-4"
            variant="outline"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const status = getProjectStatus(project);
  const statusColors = {
    Active: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-800 dark:text-emerald-300",
      icon: CheckCircle,
    },
    Completed: {
      bg: "bg-slate-100 dark:bg-slate-700",
      text: "text-slate-800 dark:text-slate-200",
      icon: CheckCircle,
    },
    Upcoming: { 
      bg: "bg-blue-100 dark:bg-blue-900/30", 
      text: "text-blue-800 dark:text-blue-300", 
      icon: Calendar 
    },
  };
  const StatusIcon = statusColors[status]?.icon || CheckCircle;

  const CollapsibleSection = ({ title, icon: Icon, sectionKey, children }) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          )}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-700">{children}</div>
        )}
      </div>
    );
  };

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3 py-3">
      {Icon && (
        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0">
          <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </div>
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-base text-slate-900 dark:text-slate-100 mt-1">{value || "N/A"}</div>
      </div>
    </div>
  );

  const duration = calculateDuration();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {project.title}
                </h1>
                <span
                  className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${statusColors[status]?.bg} ${statusColors[status]?.text}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">{project.project_no}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/projects/${projectId}/reports`)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <FileText size={18} />
                <span>View Reports</span>
              </button>
              <Button
                icon={Edit}
                onClick={() => navigate(`/projects/${projectId}/edit`)}
              >
                Edit Project
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Total Budget
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {formatCurrency(getTotalBudget())}
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4">
              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                Funds Received
              </div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
                {formatCurrency(getTotalFunds())}
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800 rounded-xl p-4">
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                Expenditure
              </div>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                {formatCurrency(getTotalExpenditure())}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 rounded-xl p-4">
              <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                Balance
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {formatCurrency(getBalance())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Project Metadata */}
        <CollapsibleSection
          title="Project Information"
          icon={Briefcase}
          sectionKey="metadata"
        >
          <div className="grid grid-cols-2 gap-x-8 mt-4">
            <InfoRow
              label="Project Category"
              value={project.project_category}
            />
            <InfoRow label="Project Type" value={project.project_type} />
            <InfoRow label="PFMS ID" value={project.pfms_id} />
            <InfoRow label="Technical Group" value={project.group_name} />
            <InfoRow
              label="Start Date"
              value={
                project.start_date
                  ? new Date(project.start_date).toLocaleDateString("en-IN")
                  : "N/A"
              }
              icon={Calendar}
            />
            <InfoRow
              label="End Date"
              value={
                project.end_date
                  ? new Date(project.end_date).toLocaleDateString("en-IN")
                  : "N/A"
              }
              icon={Calendar}
            />
            {duration && (
              <InfoRow label="Duration" value={`${duration} months`} />
            )}
          </div>
        </CollapsibleSection>

        {/* Funding Agency */}
        <CollapsibleSection
          title="Funding Agency"
          icon={Building2}
          sectionKey="funding"
        >
          <div className="grid grid-cols-2 gap-x-8 mt-4">
            <InfoRow
              label="Agency Name"
              value={project.agency_name}
              icon={Building2}
            />
            <InfoRow
              label="Contact Person"
              value={project.contact_person}
              icon={User}
            />
            <InfoRow
              label="Designation"
              value={project.contact_designation}
              icon={Briefcase}
            />
            <InfoRow label="Email" value={project.contact_email} icon={Mail} />
            <InfoRow
              label="Mobile"
              value={project.contact_mobile}
              icon={Phone}
            />
            <InfoRow
              label="Sanctioned Number"
              value={project.sanctioned_number}
            />
            <InfoRow label="Scheme" value={project.funding_scheme} />
            <InfoRow label="CNA Sub Agency" value={project.cna_sub_agency} />
            <InfoRow label="Bank Name" value={project.bank_name} />
            <InfoRow label="Bank Account No" value={project.bank_account_no} />
          </div>
        </CollapsibleSection>

        {/* Investigators */}
        <CollapsibleSection
          title="Investigators"
          icon={Users}
          sectionKey="investigators"
        >
          <div className="mt-4 space-y-6">
            {/* Principal Investigator */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Principal Investigator
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 grid grid-cols-2 gap-4">
                <InfoRow
                  label="Name"
                  value={project.principal_investigator}
                  icon={User}
                />
                <InfoRow label="Email" value={project.pi_email} icon={Mail} />
                <InfoRow
                  label="Mobile"
                  value={project.pi_mobile}
                  icon={Phone}
                />
              </div>
            </div>

            {/* Co-Investigator */}
            {project.co_investigator && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Co-Investigator
                </h3>
                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <InfoRow
                    label="Name"
                    value={project.co_investigator}
                    icon={User}
                  />
                  <InfoRow label="Email" value={project.co_email} icon={Mail} />
                  <InfoRow
                    label="Mobile"
                    value={project.co_mobile}
                    icon={Phone}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

{/* Budget Allocation & Expenditure */}
<CollapsibleSection
  title="Budget Allocation & Expenditure"
  icon={DollarSign}
  sectionKey="budget"
>
  <div className="mt-4">
    <table className="w-full">
      <thead className="bg-slate-50 dark:bg-slate-700/50">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Head</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Allocated</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Spent</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Spent (%)</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Balance</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
        {[
          {
            label: "Manpower",
            allocated: project.manpower_allocation,
            type: "manpower",
            breakdown: project.manpower_breakdown,
          },
          {
            label: "Equipment",
            allocated: project.equipment_allocation,
            type: "equipment",
            breakdown: project.equipment_breakdown,
          },
          {
            label: "Travel & Training",
            allocated: project.travel_training_allocation,
          },
          {
            label: "Consumables",
            allocated: project.consumables_allocation,
          },
          {
            label: "Contingency",
            allocated: project.contingency_allocation,
          },
          {
            label: "Overhead",
            allocated: project.overhead_allocation,
          },
        ].map((item, index) => {
          const spent = getExpenditureByHead(item.label.toLowerCase());
          const balance = item.allocated - spent;
          const percentSpent =
            item.allocated > 0 ? (spent / item.allocated) * 100 : 0;

          const expandable =
            item.type === "manpower" || item.type === "equipment";

          const isExpanded = expanded[item.type];

          return (
            <>
              {/* Main Row */}
              <tr
                key={index}
                className={expandable ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" : ""}
                onClick={() =>
                  expandable &&
                  setExpanded(prev => ({
                    ...prev,
                    [item.type]: !prev[item.type],
                  }))
                }
              >
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {expandable && (
                    <span className="text-slate-500 dark:text-slate-400">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  )}
                  {item.label}
                </td>

                <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 font-semibold">
                  {formatCurrency(item.allocated || 0)}
                </td>

                <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                  {formatCurrency(spent)}
                </td>

                <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                  {percentSpent.toFixed(1)}%
                </td>

                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(balance)}
                </td>
              </tr>

              {/* Manpower Breakdown */}
              {isExpanded &&
                item.type === "manpower" &&
                item.breakdown &&
                item.breakdown.length > 0 && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 dark:bg-slate-700/30 px-6 py-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-700 dark:text-slate-300">
                            <th className="text-left py-2">Role</th>
                            <th className="text-left py-2">Salary/Month</th>
                            <th className="text-left py-2">Months</th>
                            <th className="text-left py-2">Personnel</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                          {item.breakdown.map((row, i) => (
                            <tr key={i} className="text-slate-900 dark:text-slate-100">
                              <td className="py-2">{row.role}</td>
                              <td className="py-2">
                                {formatCurrency(row.salary_per_month)}
                              </td>
                              <td className="py-2">{row.months}</td>
                              <td className="py-2">
                                {row.num_personnel || 1}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                {formatCurrency(
                                  (row.salary_per_month || 0) *
                                    (row.months || 0) *
                                    (row.num_personnel || 1)
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}

              {/* Equipment Breakdown */}
              {isExpanded &&
                item.type === "equipment" &&
                item.breakdown &&
                item.breakdown.length > 0 && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 dark:bg-slate-700/30 px-6 py-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-700 dark:text-slate-300">
                            <th className="text-left py-2">Item</th>
                            <th className="text-left py-2">Qty</th>
                            <th className="text-left py-2">Unit Cost</th>
                            <th className="text-left py-2">Description</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                          {item.breakdown.map((row, i) => (
                            <tr key={i} className="text-slate-900 dark:text-slate-100">
                              <td className="py-2">{row.item_name}</td>
                              <td className="py-2">{row.quantity}</td>
                              <td className="py-2">
                                {formatCurrency(row.unit_cost)}
                              </td>
                              <td className="py-2">
                                {row.description || "-"}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                {formatCurrency(
                                  row.quantity * row.unit_cost
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
            </>
          );
        })}
      </tbody>
    </table>

    {/* Total Budget Row */}
    <div className="bg-slate-900 dark:bg-slate-700 rounded-xl p-6 flex items-center justify-between mt-6">
      <div>
        <span className="text-white text-lg font-bold">Total Budget</span>
        <div className="text-slate-300 dark:text-slate-400 text-sm mt-1">
          Spent: {formatCurrency(getTotalExpenditure())} • Balance:
          {formatCurrency(getTotalBudget() - getTotalExpenditure())}
        </div>
      </div>

      <span className="text-white text-2xl font-bold">
        {formatCurrency(getTotalBudget())}
      </span>
    </div>
  </div>
</CollapsibleSection>

        {/* FUNDS RECEIVED */}
        {project.funds && project.funds.length > 0 && (
          <CollapsibleSection
            title="Funds Received"
            icon={TrendingUp}
            sectionKey="funds"
          >
            <div className="mt-6 space-y-8">
              {/* FUNDS MANPOWER BREAKDOWN */}
              {project.funds.some((f) => f.head === "manpower") && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white">
                    Manpower
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                          Role
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                          Salary/Month
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                          Months
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                          Personnel
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {project.funds
                        .filter((f) => f.head === "manpower")
                        .map((fund) => (
                          <tr key={fund.fund_id} className="text-slate-900 dark:text-slate-100">
                            <td className="px-4 py-3 text-sm">
                              {new Date(fund.received_date).toLocaleDateString(
                                "en-IN"
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {fund.breakdown.role}
                            </td>
                            <td className="px-4 py-3 text-center">
                              ₹
                              {fund.breakdown.salary_per_month.toLocaleString(
                                "en-IN"
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {fund.breakdown.months}
                            </td>
                            <td className="px-4 py-3text-center">
                              {fund.breakdown.num_personnel}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              ₹{fund.amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-purple-50 dark:bg-purple-900/30 font-bold">
                        <td
                          colSpan={5}
                          className="px-4 py-3 text-purple-900 dark:text-purple-300 text-right"
                        >
                          Subtotal (Manpower)
                        </td>
                        <td className="px-4 py-3 text-right text-purple-900 dark:text-purple-300">
                          ₹
                          {project.funds
                            .filter((f) => f.head === "manpower")
                            .reduce((s, f) => s + f.amount, 0)
                            .toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* FUNDS EQUIPMENT BREAKDOWN */}
              {project.funds.some((f) => f.head === "equipment") && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white">
                    Equipment
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {project.funds
                        .filter((f) => f.head === "equipment")
                        .map((fund) => (
                          <tr key={fund.fund_id} className="text-slate-900 dark:text-slate-100">
                            <td className="px-4 py-3 text-sm">
                              {new Date(fund.received_date).toLocaleDateString(
                                "en-IN"
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {fund.breakdown.item_name}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {fund.breakdown.quantity}
                            </td>
                            <td className="px-4 py-3 text-center">
                              ₹
                              {fund.breakdown.unit_cost.toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              ₹{fund.amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-purple-50 dark:bg-purple-900/30 font-bold">
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-purple-900 dark:text-purple-300 text-right"
                        >
                          Subtotal (Equipment)
                        </td>
                        <td className="px-4 py-3 text-right text-purple-900 dark:text-purple-300">
                          ₹
                          {project.funds
                            .filter((f) => f.head === "equipment")
                            .reduce((s, f) => s + f.amount, 0)
                            .toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* OTHER HEADS */}
              {[
                "travel & training",
                "consumables",
                "contingency",
                "overhead",
              ].map((head) => {
                const items = project.funds.filter((f) => f.head === head);
                if (items.length === 0) return null;

                const total = items.reduce((s, f) => s + f.amount, 0);
                const displayName =
                  head === "travel & training"
                    ? "Travel & Training"
                    : head.charAt(0).toUpperCase() + head.slice(1);

                return (
                  <div
                    key={head}
                    className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700"
                  >
                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                      {displayName}
                    </div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{total.toLocaleString("en-IN")}
                    </div>
                  </div>
                );
              })}

              {/* TOTAL FUNDS RECEIVED */}
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-6 border border-orange-200 dark:border-orange-800 mt-10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-orange-900 dark:text-orange-300 text-lg">
                      Total Funds Received
                    </span>
                    <div className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                      Across all budget heads
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                    ₹
                    {project.funds
                      .reduce((sum, f) => sum + f.amount, 0)
                      .toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* EXPENDITURE */}
        <CollapsibleSection
          title="Expenditure"
          icon={TrendingDown}
          sectionKey="expenditure"
        >
          <div className="mt-6 space-y-8">
            {/* MANPOWER EXPENDITURE */}
            {actualExpenditures.manpower_expenditures?.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white">
                  Manpower Expenditure
                </div>
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                        Role
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                        Salary/Month
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                        Months
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                        Personnel
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                        Amount Spent
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {actualExpenditures.manpower_expenditures.map(
                      (exp, idx) => (
                        <tr key={idx} className="text-slate-900 dark:text-slate-100">
                          <td className="px-4 py-3 text-sm">
                            {exp.date_incurred
                              ? new Date(exp.date_incurred).toLocaleDateString(
                                  "en-IN"
                                )
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 font-medium">{exp.role}</td>
                          <td className="px-4 py-3 text-center">
                            ₹
                            {(exp.salary_per_month || 0).toLocaleString(
                              "en-IN"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {exp.months}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {exp.num_personnel || 1}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(exp.total_cost)}
                          </td>
                        </tr>
                      )
                    )}
                    <tr className="bg-purple-50 dark:bg-purple-900/30 font-bold">
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-purple-900 dark:text-purple-300 text-right"
                      >
                        Subtotal (Manpower)
                      </td>
                      <td className="px-4 py-3 text-right text-purple-900 dark:text-purple-300">
                        {formatCurrency(getExpenditureByHead("manpower"))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* EQUIPMENT EXPENDITURE */}
            {actualExpenditures.equipment_expenditures?.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white">
                  Equipment Expenditure
                </div>
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                        Purchase Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                        Item
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                        Amount Spent
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {actualExpenditures.equipment_expenditures.map(
                      (exp, idx) => (
                        <tr key={idx} className="text-slate-900 dark:text-slate-100">
                          <td className="px-4 py-3 text-sm">
                            {exp.purchase_date
                              ? new Date(exp.purchase_date).toLocaleDateString(
                                  "en-IN"
                                )
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 font-medium">{exp.name}</td>
                          <td className="px-4 py-3 text-center">
                            {exp.quantity}
                          </td>
                          <td className="px-4 py-3 text-center">
                            ₹{(exp.unit_cost || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(exp.total_cost)}
                          </td>
                        </tr>
                      )
                    )}
                    <tr className="bg-purple-50 dark:bg-purple-900/30 font-bold">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-purple-900 dark:text-purple-300 text-right"
                      >
                        Subtotal (Equipment)
                      </td>
                      <td className="px-4 py-3 text-right text-purple-900 dark:text-purple-300">
                        {formatCurrency(getExpenditureByHead("equipment"))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* OTHER HEADS */}
            {(() => {
              const heads = {};
              actualExpenditures.budget_expenditures?.forEach((exp) => {
                if (!heads[exp.head]) heads[exp.head] = 0;
                heads[exp.head] += exp.amount;
              });

              return Object.entries(heads).map(([head, amount]) => {
                const displayName =
                  head === "travel & training"
                    ? "Travel & Training"
                    : head === "consumables"
                    ? "Consumables"
                    : head === "contingency"
                    ? "Contingency"
                    : head === "overhead"
                    ? "Overhead"
                    : head;

                return (
                  <div
                    key={head}
                    className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700"
                  >
                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                      {displayName}
                    </div>
                    <div className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(amount)}
                    </div>
                  </div>
                );
              });
            })()}

            {/* NO EXPENDITURE MESSAGE */}
            {!actualExpenditures.manpower_expenditures?.length &&
              !actualExpenditures.equipment_expenditures?.length &&
              !actualExpenditures.budget_expenditures?.length && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <AlertCircle className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">
                    No expenditures recorded yet
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                    Start adding expenses to track project spending
                  </p>
                </div>
              )}

            {/* TOTAL EXPENDITURE */}
            {(actualExpenditures.manpower_expenditures?.length > 0 ||
              actualExpenditures.equipment_expenditures?.length > 0 ||
              actualExpenditures.budget_expenditures?.length > 0) && (
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-6 border border-orange-200 dark:border-orange-800 mt-10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-orange-900 dark:text-orange-300 text-lg">
                      Total Expenditure
                    </span>
                    <div className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                      Across all budget heads
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                    {formatCurrency(getTotalExpenditure())}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default ProjectDetailsFullPage;
