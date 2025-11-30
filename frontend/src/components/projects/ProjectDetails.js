// components/projects/ProjectDetails.js
import React, { useState, useEffect } from "react";
import {
  X,
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
  Download,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  User,
  GraduationCap,
  Award,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import projectService from "../../services/projectService";

const ProjectDetails = ({ isOpen, onClose, projectId, onEdit }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails();
    }
  }, [isOpen, projectId]);

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProject(projectId);
      setProject(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

  const getTotalFundsReceived = () => {
    if (!project?.funds_received) return 0;
    return project.funds_received.reduce(
      (sum, fund) => sum + (fund.amount || 0),
      0
    );
  };

  const getTotalExpenditure = () => {
    if (!project) return 0;
    const manpowerExp = project.manpower_expenditure?.reduce(
      (sum, exp) =>
        sum + exp.salary_per_month * exp.months * (exp.num_personnel || 1),
      0
    ) || 0;
    const equipmentExp = project.equipment_expenditure?.reduce(
      (sum, exp) => sum + exp.unit_cost * (exp.quantity || 1),
      0
    ) || 0;
    const otherExp = project.other_expenditure?.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    ) || 0;
    return manpowerExp + equipmentExp + otherExp;
  };

  const getBalanceFunds = () => {
    return getTotalFundsReceived() - getTotalExpenditure();
  };

  const getBudgetUtilization = () => {
    const total = getTotalBudget();
    const spent = getTotalExpenditure();
    return total > 0 ? (spent / total) * 100 : 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Project Details" size="2xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      </Modal>
    );
  }

  if (error || !project) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Project Details" size="2xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error || "Project not found"}</p>
          </div>
        </div>
      </Modal>
    );
  }

  const totalBudget = getTotalBudget();
  const totalFunds = getTotalFundsReceived();
  const totalExpenditure = getTotalExpenditure();
  const balanceFunds = getBalanceFunds();
  const utilizationPercent = getBudgetUtilization();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Details"
      size="2xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {/* Header with Quick Actions */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white p-6 rounded-2xl -mt-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{project.title}</h2>
              <p className="text-slate-300 text-sm">
                {project.project_no} • {project.alias || "No alias"}
              </p>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onEdit(project);
                    onClose();
                  }}
                  icon={Edit}
                >
                  Edit
                </Button>
              )}
              <Button variant="secondary" size="sm" icon={Download}>
                Export
              </Button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2 mt-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
              {project.project_category}
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
              {project.project_type}
            </span>
            {project.PFMS_id && (
              <span className="px-3 py-1 bg-blue-500/30 rounded-full text-xs font-medium">
                PFMS: {project.PFMS_id}
              </span>
            )}
          </div>
        </div>

        {/* Budget Overview Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="Total Budget"
            value={formatCurrency(totalBudget)}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Funds Received"
            value={formatCurrency(totalFunds)}
            icon={TrendingDown}
            color="green"
            subtitle={`${((totalFunds / totalBudget) * 100 || 0).toFixed(1)}% of budget`}
          />
          <StatCard
            title="Expenditure"
            value={formatCurrency(totalExpenditure)}
            icon={TrendingUp}
            color="orange"
            subtitle={`${utilizationPercent.toFixed(1)}% utilized`}
          />
          <StatCard
            title="Balance"
            value={formatCurrency(balanceFunds)}
            icon={balanceFunds >= 0 ? CheckCircle : AlertCircle}
            color={balanceFunds >= 0 ? "emerald" : "red"}
          />
        </div>

        {/* Budget Utilization Bar */}
        <div className="bg-slate-50 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">
              Budget Utilization
            </span>
            <span className="text-sm font-bold text-slate-900">
              {utilizationPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilizationPercent > 90
                  ? "bg-red-500"
                  : utilizationPercent > 70
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Project Metadata */}
        <CollapsibleSection
          title="Project Metadata"
          icon={Briefcase}
          isExpanded={expandedSections.metadata}
          onToggle={() => toggleSection("metadata")}
        >
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Project Number" value={project.project_no} />
            <InfoItem label="Technical Group" value={project.technical_group_name} />
            <InfoItem label="Funding Agency" value={project.funding_agency_name} />
            <InfoItem
              label="Start Date"
              value={formatDate(project.start_date)}
              icon={Calendar}
            />
            <InfoItem
              label="End Date"
              value={formatDate(project.end_date)}
              icon={Calendar}
            />
            <InfoItem
              label="Duration"
              value={
                project.start_date && project.end_date
                  ? `${Math.ceil(
                      (new Date(project.end_date) - new Date(project.start_date)) /
                        (1000 * 60 * 60 * 24 * 30)
                    )} months`
                  : "Ongoing"
              }
            />
          </div>
        </CollapsibleSection>

        {/* Investigators */}
        <CollapsibleSection
          title="Investigators"
          icon={Users}
          isExpanded={expandedSections.investigators}
          onToggle={() => toggleSection("investigators")}
        >
          <div className="space-y-4">
            {/* Principal Investigator */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Principal Investigator
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <InfoItem
                  label="Name"
                  value={project.principal_investigator}
                />
                <InfoItem
                  label="Email"
                  value={project.pi_email}
                  icon={Mail}
                />
                <InfoItem
                  label="Mobile"
                  value={project.pi_mobile}
                  icon={Phone}
                />
              </div>
            </div>

            {/* Co-Investigator */}
            {project.co_investigator && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Co-Investigator
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <InfoItem label="Name" value={project.co_investigator} />
                  <InfoItem label="Email" value={project.co_email} icon={Mail} />
                  <InfoItem
                    label="Mobile"
                    value={project.co_mobile}
                    icon={Phone}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Funding Agency Details */}
        <CollapsibleSection
          title="Funding Agency Details"
          icon={Building2}
          isExpanded={expandedSections.funding}
          onToggle={() => toggleSection("funding")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label="Scheme" value={project.funding_scheme} />
              <InfoItem label="CNA Sub-Agency" value={project.cna_sub_agency} />
              <InfoItem
                label="Sanctioned Number"
                value={project.sanctioned_number}
              />
            </div>

            {project.contact_person && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">
                  Contact Person
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Name" value={project.contact_person} />
                  <InfoItem
                    label="Designation"
                    value={project.contact_designation}
                  />
                  <InfoItem
                    label="Mobile"
                    value={project.contact_mobile}
                    icon={Phone}
                  />
                  <InfoItem
                    label="Email"
                    value={project.contact_email}
                    icon={Mail}
                  />
                </div>
              </div>
            )}

            {(project.bank_name || project.bank_account_no) && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">
                  Banking Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Bank Name" value={project.bank_name} />
                  <InfoItem
                    label="Account Number"
                    value={project.bank_account_no}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Budget Allocation */}
        <CollapsibleSection
          title="Budget Allocation"
          icon={DollarSign}
          isExpanded={expandedSections.budget}
          onToggle={() => toggleSection("budget")}
        >
          <div className="space-y-3">
            <BudgetItem
              label="Manpower"
              amount={project.manpower_allocation}
              total={totalBudget}
            />
            <BudgetItem
              label="Equipment"
              amount={project.equipment_allocation}
              total={totalBudget}
            />
            <BudgetItem
              label="Travel & Training"
              amount={project.travel_training_allocation}
              total={totalBudget}
            />
            <BudgetItem
              label="Consumables"
              amount={project.consumables_allocation}
              total={totalBudget}
            />
            <BudgetItem
              label="Contingency"
              amount={project.contingency_allocation}
              total={totalBudget}
            />
            <BudgetItem
              label="Overhead"
              amount={project.overhead_allocation}
              total={totalBudget}
            />
            <div className="border-t-2 border-slate-300 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-slate-900">
                  Total Budget
                </span>
                <span className="font-bold text-2xl text-emerald-600">
                  {formatCurrency(totalBudget)}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Manpower Breakdown */}
        {project.manpower_breakdown && project.manpower_breakdown.length > 0 && (
          <CollapsibleSection
            title="Manpower Breakdown"
            icon={Users}
            isExpanded={expandedSections.manpower}
            onToggle={() => toggleSection("manpower")}
            badge={project.manpower_breakdown.length}
          >
            <div className="space-y-3">
              {project.manpower_breakdown.map((item, index) => (
                <div
                  key={index}
                  className="bg-blue-50 p-4 rounded-xl border border-blue-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">
                        {item.role}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {item.num_personnel} person(s) × ₹
                        {item.salary_per_month.toLocaleString("en-IN")}/month ×{" "}
                        {item.months} months
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                      {formatCurrency(
                        item.salary_per_month * item.months * item.num_personnel
                      )}
                    </span>
                  </div>

                  {/* NEW FIELDS DISPLAY */}
                  {(item.qualification || item.experience_required) && (
                    <div className="grid grid-cols-1 gap-3 mt-3 pt-3 border-t border-blue-200">
                      {item.qualification && (
                        <div className="flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 mb-1">
                              Qualification
                            </p>
                            <p className="text-sm text-slate-700">
                              {item.qualification}
                            </p>
                          </div>
                        </div>
                      )}
                      {item.experience_required && (
                        <div className="flex items-start gap-2">
                          <Award className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 mb-1">
                              Experience Required
                            </p>
                            <p className="text-sm text-slate-700">
                              {item.experience_required}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Equipment Breakdown */}
        {project.equipment_breakdown && project.equipment_breakdown.length > 0 && (
          <CollapsibleSection
            title="Equipment Breakdown"
            icon={Briefcase}
            isExpanded={expandedSections.equipment}
            onToggle={() => toggleSection("equipment")}
            badge={project.equipment_breakdown.length}
          >
            <div className="space-y-3">
              {project.equipment_breakdown.map((item, index) => (
                <div
                  key={index}
                  className="bg-green-50 p-4 rounded-xl border border-green-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">
                        {item.item_name}
                      </h4>
                      <p className="text-sm text-slate-600">
                        Quantity: {item.quantity} × ₹
                        {item.unit_cost.toLocaleString("en-IN")} per unit
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                      {formatCurrency(item.quantity * item.unit_cost)}
                    </span>
                  </div>

                  {/* NEW FIELDS DISPLAY */}
                  {(item.description || item.product_website) && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-green-200">
                      {item.description && (
                        <div>
                          <p className="text-xs font-semibold text-green-900 mb-1">
                            Description
                          </p>
                          <p className="text-sm text-slate-700">
                            {item.description}
                          </p>
                        </div>
                      )}
                      {item.product_website && (
                        <div>
                          <p className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            Product Website
                          </p>
                          <a
                            href={item.product_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                          >
                            {item.product_website}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Funds Received */}
        <CollapsibleSection
          title="Funds Received"
          icon={TrendingDown}
          isExpanded={expandedSections.funds}
          onToggle={() => toggleSection("funds")}
          badge={project.funds_received?.length || 0}
        >
          {project.funds_received && project.funds_received.length > 0 ? (
            <div className="space-y-2">
              {project.funds_received.map((fund, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{fund.head}</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(fund.date_received)}
                      {fund.remarks && ` • ${fund.remarks}`}
                    </p>
                  </div>
                  <span className="font-bold text-green-600">
                    {formatCurrency(fund.amount)}
                  </span>
                </div>
              ))}
              <div className="border-t-2 border-green-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    Total Received
                  </span>
                  <span className="font-bold text-xl text-green-600">
                    {formatCurrency(totalFunds)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No funds received yet" />
          )}
        </CollapsibleSection>

        {/* Expenditure */}
        <CollapsibleSection
          title="Expenditure"
          icon={TrendingUp}
          isExpanded={expandedSections.expenditure}
          onToggle={() => toggleSection("expenditure")}
        >
          <div className="space-y-4">
            {/* Manpower Expenditure */}
            {project.manpower_expenditure &&
              project.manpower_expenditure.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Manpower Expenditure
                  </h4>
                  <div className="space-y-2">
                    {project.manpower_expenditure.map((exp, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {exp.role}
                          </p>
                          <p className="text-sm text-slate-600">
                            {exp.num_personnel || 1} × ₹
                            {exp.salary_per_month.toLocaleString("en-IN")} ×{" "}
                            {exp.months} months
                            {exp.date_incurred &&
                              ` • ${formatDate(exp.date_incurred)}`}
                          </p>
                        </div>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(
                            exp.salary_per_month *
                              exp.months *
                              (exp.num_personnel || 1)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Equipment Expenditure */}
            {project.equipment_expenditure &&
              project.equipment_expenditure.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Equipment Expenditure
                  </h4>
                  <div className="space-y-2">
                    {project.equipment_expenditure.map((exp, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {exp.name}
                          </p>
                          <p className="text-sm text-slate-600">
                            Qty: {exp.quantity || 1} × ₹
                            {exp.unit_cost.toLocaleString("en-IN")}
                            {exp.purchase_date &&
                              ` • ${formatDate(exp.purchase_date)}`}
                          </p>
                        </div>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(exp.unit_cost * (exp.quantity || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Other Expenditure */}
            {project.other_expenditure &&
              project.other_expenditure.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Other Expenditure
                  </h4>
                  <div className="space-y-2">
                    {project.other_expenditure.map((exp, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {exp.head}
                          </p>
                          <p className="text-sm text-slate-600">
                            {exp.description}
                            {exp.date_incurred &&
                              ` • ${formatDate(exp.date_incurred)}`}
                          </p>
                        </div>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {!project.manpower_expenditure?.length &&
              !project.equipment_expenditure?.length &&
              !project.other_expenditure?.length && (
                <EmptyState message="No expenditure recorded yet" />
              )}

            {/* Total Expenditure */}
            {totalExpenditure > 0 && (
              <div className="border-t-2 border-orange-300 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    Total Expenditure
                  </span>
                  <span className="font-bold text-2xl text-orange-600">
                    {formatCurrency(totalExpenditure)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Financial Summary */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <SummaryRow
              label="Total Approved Budget"
              value={formatCurrency(totalBudget)}
            />
            <SummaryRow
              label="Funds Received"
              value={formatCurrency(totalFunds)}
              percentage={((totalFunds / totalBudget) * 100).toFixed(1)}
            />
            <SummaryRow
              label="Total Expenditure"
              value={formatCurrency(totalExpenditure)}
              percentage={utilizationPercent.toFixed(1)}
            />
            <div className="border-t border-white/20 pt-3">
              <SummaryRow
                label="Available Balance"
                value={formatCurrency(balanceFunds)}
                highlight
                positive={balanceFunds >= 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button
            variant="primary"
            onClick={() => {
              onEdit(project);
              onClose();
            }}
            icon={Edit}
          >
            Edit Project
          </Button>
        )}
      </div>
    </Modal>
  );
};

// Helper Components
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-xl p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">{title}</span>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
    </div>
  );
};

const CollapsibleSection = ({
  title,
  icon: Icon,
  children,
  isExpanded,
  onToggle,
  badge,
}) => {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-900">{title}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>
      {isExpanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

const InfoItem = ({ label, value, icon: Icon }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const BudgetItem = ({ label, amount, total }) => {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <span className="text-sm font-bold text-slate-900">
            ₹{(amount || 0).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="ml-3 text-xs font-medium text-slate-600 w-12 text-right">
        {percentage.toFixed(1)}%
      </span>
    </div>
  );
};

const SummaryRow = ({ label, value, percentage, highlight, positive }) => {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`${
          highlight ? "text-lg font-bold" : "text-sm"
        } ${positive === false ? "text-red-300" : ""}`}
      >
        {label}
      </span>
      <div className="text-right">
        <span
          className={`${
            highlight ? "text-2xl font-bold" : "text-sm font-semibold"
          } ${positive === false ? "text-red-300" : ""}`}
        >
          {value}
        </span>
        {percentage && (
          <span className="ml-2 text-xs text-white/60">({percentage}%)</span>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ message }) => {
  return (
    <div className="text-center py-8">
      <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
};

export default ProjectDetails;