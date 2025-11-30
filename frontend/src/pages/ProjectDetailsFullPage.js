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
  Download,
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

const ProjectDetailsFullPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
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
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

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

  const getTotalFunds = () => {
    if (!project?.funds) return 0;
    return project.funds.reduce((sum, fund) => sum + (fund.amount || 0), 0);
  };

  const getTotalExpenditure = () => {
    if (!project?.expenditures) return 0;
    return project.expenditures.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  };

  const getBalance = () => {
    return getTotalFunds() - getTotalExpenditure();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Project</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <Button onClick={() => navigate('/projects')} className="mt-4" variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const status = getProjectStatus(project);
  const statusColors = {
    Active: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle },
    Completed: { bg: 'bg-slate-100', text: 'text-slate-800', icon: CheckCircle },
    Upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Calendar },
  };
  const StatusIcon = statusColors[status]?.icon || CheckCircle;

  const CollapsibleSection = ({ title, icon: Icon, sectionKey, children }) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-6 border-t border-slate-100">
            {children}
          </div>
        )}
      </div>
    );
  };

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3 py-3">
      {Icon && (
        <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-base text-slate-900 mt-1">{value || "N/A"}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{project.title}</h1>
                <span className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${statusColors[status]?.bg} ${statusColors[status]?.text}`}>
                  <StatusIcon className="w-4 h-4" />
                  {status}
                </span>
              </div>
              <p className="text-slate-600 font-medium">{project.project_no}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                icon={BarChart3}
                onClick={() => navigate(`/projects/${projectId}/analytics`)}
              >
                Analytics
              </Button>
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
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-sm font-medium text-blue-600 mb-1">Total Budget</div>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(getTotalBudget())}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="text-sm font-medium text-emerald-600 mb-1">Funds Received</div>
              <div className="text-2xl font-bold text-emerald-900">{formatCurrency(getTotalFunds())}</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <div className="text-sm font-medium text-orange-600 mb-1">Expenditure</div>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(getTotalExpenditure())}</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="text-sm font-medium text-purple-600 mb-1">Balance</div>
              <div className="text-2xl font-bold text-purple-900">{formatCurrency(getBalance())}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Project Metadata */}
        <CollapsibleSection title="Project Information" icon={Briefcase} sectionKey="metadata">
          <div className="grid grid-cols-2 gap-x-8 mt-4">
            <InfoRow label="Project Category" value={project.project_category} />
            <InfoRow label="Project Type" value={project.project_type} />
            <InfoRow label="PFMS ID" value={project.PFMS_id} />
            <InfoRow label="Technical Group" value={project.technical_group?.name} />
            <InfoRow 
              label="Start Date" 
              value={project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN') : 'N/A'}
              icon={Calendar}
            />
            <InfoRow 
              label="End Date" 
              value={project.end_date ? new Date(project.end_date).toLocaleDateString('en-IN') : 'N/A'}
              icon={Calendar}
            />
            {project.duration_months && (
              <InfoRow label="Duration" value={`${project.duration_months} months`} />
            )}
          </div>
        </CollapsibleSection>

        {/* Funding Agency */}
        <CollapsibleSection title="Funding Agency" icon={Building2} sectionKey="funding">
          <div className="grid grid-cols-2 gap-x-8 mt-4">
            <InfoRow label="Agency Name" value={project.funding_agency?.name} icon={Building2} />
            <InfoRow label="Contact Person" value={project.funding_agency?.contact_person} icon={User} />
            <InfoRow label="Email" value={project.funding_agency?.email} icon={Mail} />
            <InfoRow label="Phone" value={project.funding_agency?.phone} icon={Phone} />
            {project.funding_agency?.address && (
              <div className="col-span-2">
                <InfoRow label="Address" value={project.funding_agency.address} />
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Investigators */}
        <CollapsibleSection title="Investigators" icon={Users} sectionKey="investigators">
          <div className="mt-4 space-y-6">
            {/* Principal Investigator */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Principal Investigator
              </h3>
              <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                <InfoRow label="Name" value={project.pi_name} icon={User} />
                <InfoRow label="Designation" value={project.pi_designation} icon={Briefcase} />
                <InfoRow label="Email" value={project.pi_email} icon={Mail} />
                <InfoRow label="Phone" value={project.pi_phone} icon={Phone} />
              </div>
            </div>

            {/* Co-Investigators */}
            {project.co_investigators && project.co_investigators.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Co-Investigators
                </h3>
                <div className="space-y-4">
                  {project.co_investigators.map((co, index) => (
                    <div key={index} className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                      <InfoRow label="Name" value={co.name} icon={User} />
                      <InfoRow label="Designation" value={co.designation} icon={Briefcase} />
                      <InfoRow label="Email" value={co.email} icon={Mail} />
                      <InfoRow label="Phone" value={co.phone} icon={Phone} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Budget Allocation */}
        <CollapsibleSection title="Budget Allocation" icon={DollarSign} sectionKey="budget">
          <div className="mt-4 space-y-4">
            {[
              { label: 'Manpower', value: project.manpower_allocation, color: 'blue' },
              { label: 'Equipment', value: project.equipment_allocation, color: 'purple' },
              { label: 'Travel & Training', value: project.travel_training_allocation, color: 'indigo' },
              { label: 'Consumables', value: project.consumables_allocation, color: 'emerald' },
              { label: 'Contingency', value: project.contingency_allocation, color: 'orange' },
              { label: 'Overhead', value: project.overhead_allocation, color: 'pink' },
            ].map((item) => (
              <div key={item.label} className={`bg-${item.color}-50 rounded-xl p-4 flex items-center justify-between`}>
                <span className={`text-${item.color}-900 font-semibold`}>{item.label}</span>
                <span className={`text-${item.color}-900 text-xl font-bold`}>
                  {formatCurrency(item.value || 0)}
                </span>
              </div>
            ))}
            
            <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-between mt-6">
              <span className="text-white text-lg font-bold">Total Budget</span>
              <span className="text-white text-2xl font-bold">
                {formatCurrency(getTotalBudget())}
              </span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Manpower Breakdown */}
        {project.manpower_breakdown && project.manpower_breakdown.length > 0 && (
          <CollapsibleSection title="Manpower Breakdown" icon={Users} sectionKey="manpower">
            <div className="mt-4">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {project.manpower_breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-slate-900">{item.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Equipment Breakdown */}
        {project.equipment_breakdown && project.equipment_breakdown.length > 0 && (
          <CollapsibleSection title="Equipment Breakdown" icon={Briefcase} sectionKey="equipment">
            <div className="mt-4">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {project.equipment_breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-slate-900">{item.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Funds Received */}
        {project.funds && project.funds.length > 0 && (
          <CollapsibleSection title="Funds Received" icon={TrendingUp} sectionKey="funds">
            <div className="mt-4">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {project.funds.map((fund, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(fund.received_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{fund.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {formatCurrency(fund.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50">
                    <td colSpan="2" className="px-4 py-3 font-bold text-emerald-900">Total Funds</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-900">
                      {formatCurrency(getTotalFunds())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Expenditure */}
        {project.expenditures && project.expenditures.length > 0 && (
          <CollapsibleSection title="Expenditure" icon={TrendingDown} sectionKey="expenditure">
            <div className="mt-4">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Head</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {project.expenditures.map((exp, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(exp.expenditure_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {exp.head}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{exp.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-600">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50">
                    <td colSpan="3" className="px-4 py-3 font-bold text-orange-900">Total Expenditure</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-900">
                      {formatCurrency(getTotalExpenditure())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsFullPage;