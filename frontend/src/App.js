import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Eye,
  X,
  Users,
  Wrench,
  CreditCard,
  Receipt,
  AlertCircle,
  BarChart3,
  Download,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";

// CONFIGURATION & CONSTANTS

const API_BASE_URL = "http://localhost:8000";

const BUDGET_HEADS = [
  "manpower",
  "equipment",
  "consumables",
  "contingency",
  "travel & training",
  "overhead",
];

const EXPENDITURE_HEADS = [
  "consumables",
  "contingency",
  "travel & training",
  "overhead",
];

const VIEWS = {
  PROJECTS: "projects",
  BUDGET_BREAKDOWN: "budget-breakdown",
  ANALYTICS: "analytics",
  REPORTS: "reports",
};

const VIEW_LABELS = {
  [VIEWS.PROJECTS]: "Projects Management",
  [VIEWS.BUDGET_BREAKDOWN]: "Budget Breakdown",
  [VIEWS.ANALYTICS]: "Analytics & Charts",
  [VIEWS.REPORTS]: "Download Reports",
};

// UTILITY FUNCTIONS

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatCurrencyForPDF = (amount) => {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `Rs. ${formatted}`;
};

const formatCurrencyShort = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN");
};

const getProjectStatus = (project) => {
  if (!project.end_date) return "Active";
  const endDate = new Date(project.end_date);
  return endDate >= new Date() ? "Active" : "Completed";
};

const getStatusColor = (status) => {
  return status === "Active"
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-800";
};

const calculateUtilization = (expenditure, total) => {
  if (!total || total === 0) return 0;
  return ((expenditure / total) * 100).toFixed(1);
};

const getUtilizationColor = (percentage) => {
  if (percentage >= 90) return "text-red-600";
  if (percentage >= 75) return "text-yellow-600";
  return "text-green-600";
};

// API HELPER HOOK (UPDATED WITH AUTH)

const useAPI = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiCall = useCallback(
    async (endpoint, options = {}) => {
      const url = `${API_BASE_URL}${endpoint}`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      };

      setLoading(true);
      setError("");

      try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
          // Handle 401 Unauthorized
          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.reload();
            return;
          }

          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } catch (e) {
            // Use default message if parsing fails
          }
          throw new Error(errorMessage);
        }

        return await response.json();
      } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        const errorMsg =
          error.message || `Failed to ${options.method || "fetch"} data`;
        setError(errorMsg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const apiGet = useCallback((endpoint) => apiCall(endpoint), [apiCall]);

  const apiPost = useCallback(
    (endpoint, data) =>
      apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiCall]
  );

  const apiDelete = useCallback(
    (endpoint) => apiCall(endpoint, { method: "DELETE" }),
    [apiCall]
  );

  const clearError = useCallback(() => setError(""), []);

  return { loading, error, apiGet, apiPost, apiDelete, clearError };
};


// MAIN APP COMPONENT


const ProjectDashboard = () => {
  const [currentView, setCurrentView] = useState(VIEWS.PROJECTS);
  const { loading, error, apiGet, clearError } = useAPI();

  const [projects, setProjects] = useState([]);
  const [fundingAgencies, setFundingAgencies] = useState([]);
  const [technicalGroups, setTechnicalGroups] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalAllocation: 0,
    totalFunds: 0,
    totalExpenditure: 0,
    balance: 0,
  });

  
  // PROJECTS VIEW - FILTERS & STATE


  const [filters, setFilters] = useState({
    agency: "All Agencies",
    group: "All Groups",
    status: "All Statuses",
    sortBy: "Project Title",
    order: "Ascending",
  });

  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [projectsData, agenciesData, groupsData, statsData] =
          await Promise.all([
            apiGet("/projects"),
            apiGet("/funding-agencies"),
            apiGet("/technical-groups"),
            apiGet("/dashboard/stats"),
          ]);

        setProjects(projectsData);
        setFundingAgencies(agenciesData);
        setTechnicalGroups(groupsData);
        setStats({
          totalProjects: statsData.total_projects,
          activeProjects: statsData.active_projects,
          totalAllocation: statsData.total_allocation,
          totalFunds: statsData.total_funds,
          totalExpenditure: statsData.total_expenditure,
          balance: statsData.balance,
        });
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };

    loadInitialData();
  }, [apiGet]);

  // Apply filters to projects
  useEffect(() => {
    let filtered = [...projects];

    if (filters.agency !== "All Agencies") {
      filtered = filtered.filter(
        (p) => p.funding_agency_name === filters.agency
      );
    }

    if (filters.group !== "All Groups") {
      filtered = filtered.filter(
        (p) => p.technical_group_name === filters.group
      );
    }

    if (filters.status !== "All Statuses") {
      filtered = filtered.filter((p) => getProjectStatus(p) === filters.status);
    }

    // Sort
    if (filters.sortBy === "Project Title") {
      filtered.sort((a, b) =>
        filters.order === "Ascending"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      );
    } else if (filters.sortBy === "Start Date") {
      filtered.sort((a, b) =>
        filters.order === "Ascending"
          ? new Date(a.start_date) - new Date(b.start_date)
          : new Date(b.start_date) - new Date(a.start_date)
      );
    } else if (filters.sortBy === "Budget") {
      filtered.sort((a, b) =>
        filters.order === "Ascending"
          ? (a.planned_allocation || 0) - (b.planned_allocation || 0)
          : (b.planned_allocation || 0) - (a.planned_allocation || 0)
      );
    }

    setFilteredProjects(filtered);
  }, [projects, filters]);

  const Header = () => (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Project Management Dashboard
          </h1>
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-600">Total Projects:</span>
              <span className="ml-2 font-bold text-blue-600">
                {stats.totalProjects}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-gray-600">Active:</span>
              <span className="ml-2 font-bold text-green-600">
                {stats.activeProjects}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-gray-600">Budget:</span>
              <span className="ml-2 font-bold text-purple-600">
                {formatCurrencyShort(stats.totalAllocation)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-gray-600">Expenditure:</span>
              <span className="ml-2 font-bold text-red-600">
                {formatCurrencyShort(stats.totalExpenditure)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  const ErrorDisplay = () => {
    if (!error) return null;
    return (
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
          <span className="text-red-800 flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const NavigationTabs = () => (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-8">
          {Object.entries(VIEW_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const LoadingSpinner = () => {
    if (!loading) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex items-center space-x-3 shadow-xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700 font-medium">Loading...</span>
        </div>
      </div>
    );
  };

  const ProjectFilters = () => (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={() => setShowAddProject(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Funding Agency
          </label>
          <select
            value={filters.agency}
            onChange={(e) => setFilters({ ...filters, agency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Agencies">All Agencies</option>
            {fundingAgencies.map((agency) => (
              <option key={agency.agency_id} value={agency.name}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Technical Group
          </label>
          <select
            value={filters.group}
            onChange={(e) => setFilters({ ...filters, group: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Groups">All Groups</option>
            {technicalGroups.map((group) => (
              <option key={group.group_id} value={group.name}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Project Title">Project Title</option>
            <option value="Start Date">Start Date</option>
            <option value="Budget">Budget</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            value={filters.order}
            onChange={(e) => setFilters({ ...filters, order: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Ascending">Ascending</option>
            <option value="Descending">Descending</option>
          </select>
        </div>
      </div>
    </div>
  );

  const ProjectsTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budget Analysis
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Funds Analysis
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const budgetBalance =
                  (project.planned_allocation || 0) -
                  (project.actual_expenditure || 0);
                const fundsBalance =
                  (project.funds_received || 0) -
                  (project.actual_expenditure || 0);
                const budgetUtilization = calculateUtilization(
                  project.actual_expenditure,
                  project.planned_allocation
                );
                const fundsUtilization = calculateUtilization(
                  project.actual_expenditure,
                  project.funds_received
                );
                const status = getProjectStatus(project);

                return (
                  <tr key={project.project_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {project.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.project_no}
                        </div>
                        {project.alias && (
                          <div className="text-xs text-gray-400">
                            Alias: {project.alias}
                          </div>
                        )}
                        <span
                          className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {project.technical_group_name || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {project.funding_agency_name || "N/A"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Start: {formatDate(project.start_date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        End: {formatDate(project.end_date)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Allocation:</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(project.planned_allocation || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expenditure:</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(project.actual_expenditure || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-gray-600">Balance:</span>
                          <span
                            className={`font-medium ${
                              budgetBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(budgetBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Utilization:</span>
                          <span
                            className={`font-medium ${getUtilizationColor(
                              budgetUtilization
                            )}`}
                          >
                            {budgetUtilization}%
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Received:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(project.funds_received || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expenditure:</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(project.actual_expenditure || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-gray-600">Balance:</span>
                          <span
                            className={`font-medium ${
                              fundsBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(fundsBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Utilization:</span>
                          <span
                            className={`font-medium ${getUtilizationColor(
                              fundsUtilization
                            )}`}
                          >
                            {fundsUtilization}%
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedProject(project)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No projects found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Try adjusting your filters or create a new project.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // MODULE 6: PROJECT DETAILS VIEW

  const ProjectDetailsView = ({ project, onClose, onUpdate }) => {
    const { loading, error, apiGet, apiPost, clearError } = useAPI();
    const [activeTab, setActiveTab] = useState("overview");
    const [showAddFunds, setShowAddFunds] = useState(false);
    const [showAddExpenditure, setShowAddExpenditure] = useState(false);

    const [fundsData, setFundsData] = useState([]);
    const [expenditureData, setExpenditureData] = useState([]);
    const [budgetAllocation, setBudgetAllocation] = useState([]);
    const [manpowerData, setManpowerData] = useState([]);
    const [equipmentData, setEquipmentData] = useState([]);

    // Load project details
    useEffect(() => {
      if (project?.project_id) {
        loadProjectDetails();
      }
    }, [project]);

    const loadProjectDetails = async () => {
      try {
        const [funds, expenditure, budget, manpower, equipment] =
          await Promise.all([
            apiGet(`/projects/${project.project_id}/funds-received`),
            apiGet(`/projects/${project.project_id}/budget-expenditure`),
            apiGet(`/projects/${project.project_id}/budget-allocation`),
            apiGet(`/projects/${project.project_id}/manpower`),
            apiGet(`/projects/${project.project_id}/equipment`),
          ]);

        setFundsData(funds);
        setManpowerData(manpower);
        setEquipmentData(equipment);

        // Combine all expenditure types for display
        const allExpenditure = [
          ...expenditure,
          ...manpower.map((m) => ({
            expenditure_id: `manpower-${m.manpower_id}`,
            head: "manpower",
            amount: m.salary_per_month * m.months * m.num_personnel,
            date_incurred: m.date_incurred,
            description: `${m.role} - ${m.num_personnel}x personnel, ${
              m.months
            } months @ ₹${m.salary_per_month.toLocaleString()}/month`,
          })),
          ...equipment.map((e) => ({
            expenditure_id: `equipment-${e.equipment_id}`,
            head: "equipment",
            amount: e.quantity * e.unit_cost,
            date_incurred: e.purchase_date,
            description: `${e.name} - Qty: ${
              e.quantity
            } @ ₹${e.unit_cost.toLocaleString()}/unit`,
          })),
        ];

        setExpenditureData(allExpenditure);
        setBudgetAllocation(budget);
      } catch (err) {
        console.error("Failed to load project details:", err);
      }
    };

    const tabs = [
      { key: "overview", label: "Overview", icon: Eye },
      { key: "funds", label: "Funds Received", icon: CreditCard },
      { key: "expenditure", label: "Expenditure", icon: Receipt },
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {project.title}
              </h2>
              <p className="text-sm text-gray-500">{project.project_no}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm flex-1">{error}</span>
              <button onClick={clearError} className="text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b px-6">
            <div className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                      activeTab === tab.key
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "overview" && (
              <OverviewTab
                project={project}
                budgetAllocation={budgetAllocation}
              />
            )}
            {activeTab === "funds" && (
              <FundsTab
                project={project}
                fundsData={fundsData}
                onAddFunds={() => setShowAddFunds(true)}
                onRefresh={loadProjectDetails}
              />
            )}
            {activeTab === "expenditure" && (
              <ExpenditureTab
                project={project}
                expenditureData={expenditureData}
                onAddExpenditure={() => setShowAddExpenditure(true)}
                onRefresh={loadProjectDetails}
              />
            )}
          </div>

          {/* Modals */}
          {showAddFunds && (
            <AddFundsModal
              project={project}
              onClose={() => setShowAddFunds(false)}
              onSuccess={() => {
                setShowAddFunds(false);
                loadProjectDetails();
                onUpdate();
              }}
            />
          )}
          {showAddExpenditure && (
            <AddExpenditureModal
              project={project}
              onClose={() => setShowAddExpenditure(false)}
              onSuccess={() => {
                setShowAddExpenditure(false);
                loadProjectDetails();
                onUpdate();
              }}
            />
          )}
        </div>
      </div>
    );
  };

  // Overview Tab Component
  const OverviewTab = ({ project, budgetAllocation }) => {
    const budgetBalance =
      (project.planned_allocation || 0) - (project.actual_expenditure || 0);
    const fundsBalance =
      (project.funds_received || 0) - (project.actual_expenditure || 0);

    return (
      <div className="space-y-6">
        {/* Project Information */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              Project Information
            </h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Project No:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {project.project_no}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Alias:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {project.alias || "N/A"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Technical Group:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {project.technical_group_name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Funding Agency:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {project.funding_agency_name}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Timeline</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Start Date:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(project.start_date)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">End Date:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(project.end_date)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Status:</dt>
                <dd>
                  <span
                    className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                      getProjectStatus(project)
                    )}`}
                  >
                    {getProjectStatus(project)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="text-xs font-medium text-blue-600 mb-2">
              Budget Allocation
            </h4>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(project.planned_allocation || 0)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="text-xs font-medium text-green-600 mb-2">
              Funds Received
            </h4>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(project.funds_received || 0)}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="text-xs font-medium text-red-600 mb-2">
              Total Expenditure
            </h4>
            <p className="text-2xl font-bold text-red-900">
              {formatCurrency(project.actual_expenditure || 0)}
            </p>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg border ${
              budgetBalance >= 0
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <h4
              className={`text-xs font-medium mb-2 ${
                budgetBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              Budget Balance
            </h4>
            <p
              className={`text-2xl font-bold ${
                budgetBalance >= 0 ? "text-green-900" : "text-red-900"
              }`}
            >
              {formatCurrency(budgetBalance)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {calculateUtilization(
                project.actual_expenditure,
                project.planned_allocation
              )}
              % utilized
            </p>
          </div>
          <div
            className={`p-4 rounded-lg border ${
              fundsBalance >= 0
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <h4
              className={`text-xs font-medium mb-2 ${
                fundsBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              Funding Balance
            </h4>
            <p
              className={`text-2xl font-bold ${
                fundsBalance >= 0 ? "text-green-900" : "text-red-900"
              }`}
            >
              {formatCurrency(fundsBalance)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {calculateUtilization(
                project.actual_expenditure,
                project.funds_received
              )}
              % utilized
            </p>
          </div>
        </div>

        {/* Budget Allocation by Head */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Budget Allocation by Head
          </h3>
          <div className="space-y-2">
            {budgetAllocation.map((item) => (
              <div
                key={item.allocation_id}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {item.head}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(item.allocated_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Funds Tab Component
  const FundsTab = ({ project, fundsData, onAddFunds, onRefresh }) => {
    const fundsByHead = fundsData.reduce((acc, fund) => {
      if (!acc[fund.head]) acc[fund.head] = [];
      acc[fund.head].push(fund);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Funds Received</h3>
          <button
            onClick={onAddFunds}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </button>
        </div>

        {fundsData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No funds received yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(fundsByHead).map(([head, funds]) => (
              <div key={head} className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 capitalize mb-3">
                  {head}
                </h4>
                <div className="space-y-2">
                  {funds.map((fund) => (
                    <div
                      key={fund.fund_id}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(fund.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(fund.date_received)}
                        </p>
                        {fund.remarks && (
                          <p className="text-xs text-gray-400 mt-1">
                            {fund.remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Total:
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(
                          funds.reduce((sum, f) => sum + f.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Expenditure Tab Component
  const ExpenditureTab = ({
    project,
    expenditureData,
    onAddExpenditure,
    onRefresh,
  }) => {
    const expenditureByHead = expenditureData.reduce((acc, exp) => {
      if (!acc[exp.head]) acc[exp.head] = [];
      acc[exp.head].push(exp);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Budget Expenditure
          </h3>
          <button
            onClick={onAddExpenditure}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expenditure
          </button>
        </div>

        {expenditureData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No expenditure recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(expenditureByHead).map(([head, expenses]) => (
              <div key={head} className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 capitalize mb-3">
                  {head}
                </h4>
                <div className="space-y-2">
                  {expenses.map((exp) => (
                    <div
                      key={exp.expenditure_id}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(exp.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(exp.date_incurred)}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-gray-400 mt-1">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Total:
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(
                          expenses.reduce((sum, e) => sum + e.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ADD FUNDS MODAL

  const ManpowerBreakdownRow = ({
    item,
    index,
    projectId,
    onUpdate,
    onRemove,
    canRemove,
  }) => {
    const { apiGet } = useAPI();
    const [approvedRoles, setApprovedRoles] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      loadApprovedRoles();
    }, [projectId]);

    const loadApprovedRoles = async () => {
      setLoading(true);
      try {
        const data = await apiGet(
          `/projects/${projectId}/approved-manpower-roles`
        );
        setApprovedRoles(data);
      } catch (err) {
        console.error("Failed to load approved roles:", err);
      } finally {
        setLoading(false);
      }
    };

    const handleRoleChange = (e) => {
      const selectedRole = approvedRoles.find((r) => r.role === e.target.value);
      if (selectedRole) {
        onUpdate("role", selectedRole.role);
        onUpdate("salary_per_month", selectedRole.salary_per_month);
        onUpdate("months", selectedRole.months);
      } else {
        onUpdate("role", e.target.value);
      }
    };

    return (
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Role
          </label>
          {loading ? (
            <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50">
              Loading...
            </div>
          ) : approvedRoles.length > 0 ? (
            <select
              value={item.role}
              onChange={handleRoleChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select role...</option>
              {approvedRoles.map((role) => (
                <option key={role.role} value={role.role}>
                  {role.role} (Available: {role.available_posts})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={item.role}
              onChange={(e) => onUpdate("role", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="No approved roles"
            />
          )}
        </div>
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Salary/Month
          </label>
          <input
            type="number"
            step="0.01"
            value={item.salary_per_month}
            onChange={(e) => onUpdate("salary_per_month", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="50000"
            readOnly={approvedRoles.some((r) => r.role === item.role)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Months
          </label>
          <input
            type="number"
            value={item.months}
            onChange={(e) => onUpdate("months", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="12"
            readOnly={approvedRoles.some((r) => r.role === item.role)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Count
          </label>
          <input
            type="number"
            value={item.num_personnel}
            onChange={(e) => onUpdate("num_personnel", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="1"
            max={
              approvedRoles.find((r) => r.role === item.role)
                ?.available_posts || 999
            }
          />
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Rs.{" "}
            {(
              item.salary_per_month * item.months * item.num_personnel || 0
            ).toLocaleString()}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const EquipmentBreakdownRow = ({
    item,
    index,
    projectId,
    onUpdate,
    onRemove,
    canRemove,
  }) => {
    const { apiGet } = useAPI();
    const [approvedItems, setApprovedItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      loadApprovedItems();
    }, [projectId]);

    const loadApprovedItems = async () => {
      setLoading(true);
      try {
        const data = await apiGet(
          `/projects/${projectId}/approved-equipment-items`
        );
        setApprovedItems(data);
      } catch (err) {
        console.error("Failed to load approved items:", err);
      } finally {
        setLoading(false);
      }
    };

    const handleItemChange = (e) => {
      const selectedItem = approvedItems.find(
        (i) => i.item_name === e.target.value
      );
      if (selectedItem) {
        onUpdate("item_name", selectedItem.item_name);
        onUpdate("unit_cost", selectedItem.unit_cost);
      } else {
        onUpdate("item_name", e.target.value);
      }
    };

    return (
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Item Name
          </label>
          {loading ? (
            <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50">
              Loading...
            </div>
          ) : approvedItems.length > 0 ? (
            <select
              value={item.item_name}
              onChange={handleItemChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select item...</option>
              {approvedItems.map((equip) => (
                <option key={equip.item_name} value={equip.item_name}>
                  {equip.item_name} (Available: {equip.available_quantity})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={item.item_name}
              onChange={(e) => onUpdate("item_name", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="No approved items"
            />
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate("quantity", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="1"
            max={
              approvedItems.find((i) => i.item_name === item.item_name)
                ?.available_quantity || 999
            }
          />
        </div>
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Unit Cost
          </label>
          <input
            type="number"
            step="0.01"
            value={item.unit_cost}
            onChange={(e) => onUpdate("unit_cost", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="50000"
            readOnly={approvedItems.some((i) => i.item_name === item.item_name)}
          />
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Rs. {(item.quantity * item.unit_cost || 0).toLocaleString()}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const ManpowerExpenditureRow = ({
    item,
    index,
    projectId,
    onUpdate,
    onRemove,
    canRemove,
  }) => {
    const { apiGet } = useAPI();
    const [approvedRoles, setApprovedRoles] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      loadApprovedRoles();
    }, [projectId]);

    const loadApprovedRoles = async () => {
      setLoading(true);
      try {
        const data = await apiGet(
          `/projects/${projectId}/approved-manpower-roles`
        );
        setApprovedRoles(data);
      } catch (err) {
        console.error("Failed to load approved roles:", err);
      } finally {
        setLoading(false);
      }
    };

    const handleRoleChange = (e) => {
      const selectedRole = approvedRoles.find((r) => r.role === e.target.value);
      if (selectedRole) {
        onUpdate("role", selectedRole.role);
        onUpdate("salary_per_month", selectedRole.salary_per_month);
        // Don't auto-fill months and num_personnel - let user decide
      } else {
        onUpdate("role", e.target.value);
      }
    };

    return (
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Role
          </label>
          {loading ? (
            <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50">
              Loading...
            </div>
          ) : approvedRoles.length > 0 ? (
            <select
              value={item.role}
              onChange={handleRoleChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">Select role...</option>
              {approvedRoles.map((role) => (
                <option key={role.role} value={role.role}>
                  {role.role} (Available: {role.available_posts})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={item.role}
              onChange={(e) => onUpdate("role", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="No approved roles"
            />
          )}
        </div>
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Salary/Month
          </label>
          <input
            type="number"
            step="0.01"
            value={item.salary_per_month}
            onChange={(e) => onUpdate("salary_per_month", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-50"
            placeholder="50000"
            readOnly={approvedRoles.some((r) => r.role === item.role)}
            title={
              approvedRoles.some((r) => r.role === item.role)
                ? "Salary is fixed for approved roles"
                : ""
            }
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Months
          </label>
          <input
            type="number"
            value={item.months}
            onChange={(e) => onUpdate("months", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="12"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Count
          </label>
          <input
            type="number"
            value={item.num_personnel}
            onChange={(e) => onUpdate("num_personnel", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="1"
            max={
              approvedRoles.find((r) => r.role === item.role)
                ?.available_posts || 999
            }
          />
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Rs.{" "}
            {(
              item.salary_per_month * item.months * item.num_personnel || 0
            ).toLocaleString()}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const EquipmentExpenditureRow = ({
    item,
    index,
    projectId,
    onUpdate,
    onRemove,
    canRemove,
  }) => {
    const { apiGet } = useAPI();
    const [approvedItems, setApprovedItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      loadApprovedItems();
    }, [projectId]);

    const loadApprovedItems = async () => {
      setLoading(true);
      try {
        const data = await apiGet(
          `/projects/${projectId}/approved-equipment-items`
        );
        setApprovedItems(data);
      } catch (err) {
        console.error("Failed to load approved items:", err);
      } finally {
        setLoading(false);
      }
    };

    const handleItemChange = (e) => {
      const selectedItem = approvedItems.find(
        (i) => i.item_name === e.target.value
      );
      if (selectedItem) {
        onUpdate("name", selectedItem.item_name);
        onUpdate("unit_cost", selectedItem.unit_cost);
        // Don't auto-fill quantity - let user decide
      } else {
        onUpdate("name", e.target.value);
      }
    };

    return (
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Equipment Name
          </label>
          {loading ? (
            <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50">
              Loading...
            </div>
          ) : approvedItems.length > 0 ? (
            <select
              value={item.name}
              onChange={handleItemChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">Select item...</option>
              {approvedItems.map((equip) => (
                <option key={equip.item_name} value={equip.item_name}>
                  {equip.item_name} (Available: {equip.available_quantity})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={item.name}
              onChange={(e) => onUpdate("name", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="No approved items"
            />
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate("quantity", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="1"
            max={
              approvedItems.find((i) => i.item_name === item.name)
                ?.available_quantity || 999
            }
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Unit Cost
          </label>
          <input
            type="number"
            step="0.01"
            value={item.unit_cost}
            onChange={(e) => onUpdate("unit_cost", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="50000"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={item.purchase_date}
            onChange={(e) => onUpdate("purchase_date", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Rs. {(item.quantity * item.unit_cost || 0).toLocaleString()}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const AddFundsModal = ({ project, onClose, onSuccess }) => {
    const { loading, error, apiPost, clearError } = useAPI();
    const [formData, setFormData] = useState({
      head: "manpower",
      amount: "",
      date_received: new Date().toISOString().split("T")[0],
      remarks: "",
    });

    const [manpowerBreakdown, setManpowerBreakdown] = useState([
      { role: "", salary_per_month: "", months: "", num_personnel: 1 },
    ]);

    const [equipmentBreakdown, setEquipmentBreakdown] = useState([
      { item_name: "", quantity: 1, unit_cost: "" },
    ]);

    const showBreakdown =
      formData.head === "manpower" || formData.head === "equipment";

    const calculateTotal = () => {
      if (formData.head === "manpower") {
        return manpowerBreakdown.reduce(
          (sum, item) =>
            sum +
            (item.salary_per_month * item.months * item.num_personnel || 0),
          0
        );
      }
      if (formData.head === "equipment") {
        return equipmentBreakdown.reduce(
          (sum, item) => sum + (item.quantity * item.unit_cost || 0),
          0
        );
      }
      return parseFloat(formData.amount) || 0;
    };

    const addManpowerRow = () => {
      setManpowerBreakdown([
        ...manpowerBreakdown,
        { role: "", salary_per_month: "", months: "", num_personnel: 1 },
      ]);
    };

    const removeManpowerRow = (index) => {
      setManpowerBreakdown(manpowerBreakdown.filter((_, i) => i !== index));
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

    const updateEquipmentRow = (index, field, value) => {
      const updated = [...equipmentBreakdown];
      updated[index][field] = value;
      setEquipmentBreakdown(updated);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const totalAmount = calculateTotal();

        // Create funds received entry
        const fundResponse = await apiPost("/funds-received", {
          project_id: project.project_id,
          head: formData.head,
          amount: totalAmount,
          date_received: formData.date_received,
          remarks: formData.remarks,
        });

        const fundId = fundResponse.fund_id;

        // Add breakdown details if applicable
        if (formData.head === "manpower") {
          for (const item of manpowerBreakdown) {
            if (item.role && item.salary_per_month && item.months) {
              await apiPost("/manpower-funds-breakdown", {
                fund_id: fundId,
                project_id: project.project_id,
                role: item.role,
                salary_per_month: parseFloat(item.salary_per_month),
                months: parseInt(item.months),
                num_personnel: parseInt(item.num_personnel),
              });
            }
          }
        }

        if (formData.head === "equipment") {
          for (const item of equipmentBreakdown) {
            if (item.item_name && item.quantity && item.unit_cost) {
              await apiPost("/equipment-funds-breakdown", {
                fund_id: fundId,
                project_id: project.project_id,
                item_name: item.item_name,
                quantity: parseInt(item.quantity),
                unit_cost: parseFloat(item.unit_cost),
              });
            }
          }
        }

        onSuccess();
      } catch (err) {
        console.error("Failed to add funds:", err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">
              Add Funds Received
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm flex-1">{error}</span>
              <button onClick={clearError} className="text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Head *
                </label>
                <select
                  value={formData.head}
                  onChange={(e) =>
                    setFormData({ ...formData, head: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  {BUDGET_HEADS.map((head) => (
                    <option key={head} value={head}>
                      {head.charAt(0).toUpperCase() + head.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Received *
                </label>
                <input
                  type="date"
                  value={formData.date_received}
                  onChange={(e) =>
                    setFormData({ ...formData, date_received: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            {!showBreakdown && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  placeholder="Enter amount"
                />
              </div>
            )}

            {formData.head === "manpower" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">
                    Manpower Breakdown
                  </h4>
                  <button
                    type="button"
                    onClick={addManpowerRow}
                    className="text-sm text-green-600 hover:text-green-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {manpowerBreakdown.map((item, index) => (
                    <ManpowerBreakdownRow
                      key={index}
                      item={item}
                      index={index}
                      projectId={project.project_id}
                      onUpdate={(field, value) =>
                        updateManpowerRow(index, field, value)
                      }
                      onRemove={() => removeManpowerRow(index)}
                      canRemove={manpowerBreakdown.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {formData.head === "equipment" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">
                    Equipment Breakdown
                  </h4>
                  <button
                    type="button"
                    onClick={addEquipmentRow}
                    className="text-sm text-green-600 hover:text-green-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {equipmentBreakdown.map((item, index) => (
                    <EquipmentBreakdownRow
                      key={index}
                      item={item}
                      index={index}
                      projectId={project.project_id}
                      onUpdate={(field, value) =>
                        updateEquipmentRow(index, field, value)
                      }
                      onRemove={() => removeEquipmentRow(index)}
                      canRemove={equipmentBreakdown.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {showBreakdown && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">
                    Total Amount:
                  </span>
                  <span className="text-xl font-bold text-green-900">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Optional notes or remarks"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add Funds
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ADD EXPENDITURE MODAL

  const AddExpenditureModal = ({ project, onClose, onSuccess }) => {
    const { loading, error, apiPost, clearError } = useAPI();
    const [formData, setFormData] = useState({
      head: "consumables",
      date_incurred: new Date().toISOString().split("T")[0],
      description: "",
      expenditure_type: "general", // general, manpower, equipment
    });

    const [manpowerExpenditure, setManpowerExpenditure] = useState([
      { role: "", salary_per_month: "", months: "", num_personnel: 1 },
    ]);

    const [equipmentExpenditure, setEquipmentExpenditure] = useState([
      { name: "", quantity: 1, unit_cost: "", purchase_date: "" },
    ]);

    const [generalAmount, setGeneralAmount] = useState("");

    const calculateTotal = () => {
      if (formData.expenditure_type === "manpower") {
        return manpowerExpenditure.reduce(
          (sum, item) =>
            sum +
            (item.salary_per_month * item.months * item.num_personnel || 0),
          0
        );
      }
      if (formData.expenditure_type === "equipment") {
        return equipmentExpenditure.reduce(
          (sum, item) => sum + (item.quantity * item.unit_cost || 0),
          0
        );
      }
      return parseFloat(generalAmount) || 0;
    };

    const addManpowerRow = () => {
      setManpowerExpenditure([
        ...manpowerExpenditure,
        { role: "", salary_per_month: "", months: "", num_personnel: 1 },
      ]);
    };

    const removeManpowerRow = (index) => {
      setManpowerExpenditure(manpowerExpenditure.filter((_, i) => i !== index));
    };

    const updateManpowerRow = (index, field, value) => {
      const updated = [...manpowerExpenditure];
      updated[index][field] = value;
      setManpowerExpenditure(updated);
    };

    const addEquipmentRow = () => {
      setEquipmentExpenditure([
        ...equipmentExpenditure,
        {
          name: "",
          quantity: 1,
          unit_cost: "",
          purchase_date: formData.date_incurred,
        },
      ]);
    };

    const removeEquipmentRow = (index) => {
      setEquipmentExpenditure(
        equipmentExpenditure.filter((_, i) => i !== index)
      );
    };

    const updateEquipmentRow = (index, field, value) => {
      const updated = [...equipmentExpenditure];
      updated[index][field] = value;
      setEquipmentExpenditure(updated);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (formData.expenditure_type === "manpower") {
          // Add manpower expenditure entries
          for (const item of manpowerExpenditure) {
            if (item.role && item.salary_per_month && item.months) {
              await apiPost("/manpower", {
                project_id: project.project_id,
                role: item.role,
                salary_per_month: parseFloat(item.salary_per_month),
                months: parseInt(item.months),
                num_personnel: parseInt(item.num_personnel),
                date_incurred: formData.date_incurred,
              });
            }
          }
        } else if (formData.expenditure_type === "equipment") {
          // Add equipment expenditure entries
          for (const item of equipmentExpenditure) {
            if (item.name && item.quantity && item.unit_cost) {
              await apiPost("/equipment", {
                project_id: project.project_id,
                name: item.name,
                quantity: parseInt(item.quantity),
                unit_cost: parseFloat(item.unit_cost),
                purchase_date: item.purchase_date || formData.date_incurred,
              });
            }
          }
        } else {
          // Add general budget expenditure
          const totalAmount = calculateTotal();
          await apiPost("/budget-expenditure", {
            project_id: project.project_id,
            head: formData.head,
            amount: totalAmount,
            date_incurred: formData.date_incurred,
            description: formData.description,
          });
        }

        onSuccess();
      } catch (err) {
        console.error("Failed to add expenditure:", err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Add Expenditure</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm flex-1">{error}</span>
              <button onClick={clearError} className="text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expenditure Type *
                </label>
                <select
                  value={formData.expenditure_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expenditure_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="general">General Expenditure</option>
                  <option value="manpower">Manpower</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Incurred *
                </label>
                <input
                  type="date"
                  value={formData.date_incurred}
                  onChange={(e) =>
                    setFormData({ ...formData, date_incurred: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            {formData.expenditure_type === "general" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Head *
                  </label>
                  <select
                    value={formData.head}
                    onChange={(e) =>
                      setFormData({ ...formData, head: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    {EXPENDITURE_HEADS.map((head) => (
                      <option key={head} value={head}>
                        {head.charAt(0).toUpperCase() + head.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={generalAmount}
                    onChange={(e) => setGeneralAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                    placeholder="Enter amount"
                  />
                </div>
              </>
            )}

            {formData.expenditure_type === "manpower" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">
                    Manpower Expenditure Details
                  </h4>
                  <button
                    type="button"
                    onClick={addManpowerRow}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {manpowerExpenditure.map((item, index) => (
                    <ManpowerExpenditureRow
                      key={index}
                      item={item}
                      index={index}
                      projectId={project.project_id}
                      onUpdate={(field, value) =>
                        updateManpowerRow(index, field, value)
                      }
                      onRemove={() => removeManpowerRow(index)}
                      canRemove={manpowerExpenditure.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {formData.expenditure_type === "equipment" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">
                    Equipment Expenditure Details
                  </h4>
                  <button
                    type="button"
                    onClick={addEquipmentRow}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {equipmentExpenditure.map((item, index) => (
                    <EquipmentExpenditureRow
                      key={index}
                      item={item}
                      index={index}
                      projectId={project.project_id}
                      onUpdate={(field, value) =>
                        updateEquipmentRow(index, field, value)
                      }
                      onRemove={() => removeEquipmentRow(index)}
                      canRemove={equipmentExpenditure.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {(formData.expenditure_type === "manpower" ||
              formData.expenditure_type === "equipment") && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-700">
                    Total Amount:
                  </span>
                  <span className="text-xl font-bold text-red-900">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Optional notes or description"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 mr-2" />
                    Add Expenditure
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ADD PROJECT MODAL

  const AddProjectModal = ({
    onClose,
    onSuccess,
    fundingAgencies,
    technicalGroups,
  }) => {
    const { loading, error, apiPost, clearError } = useAPI();

    const [formData, setFormData] = useState({
      project_no: "",
      title: "",
      alias: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      funding_agency_id: "",
      technical_group_id: "",
    });

    const [budgetAllocations, setBudgetAllocations] = useState({
      manpower: {
        amount: "",
        breakdown: [
          { role: "", salary_per_month: "", months: "", num_personnel: 1 },
        ],
      },
      equipment: {
        amount: "",
        breakdown: [{ item_name: "", quantity: 1, unit_cost: "" }],
      },
      consumables: { amount: "" },
      contingency: { amount: "" },
      travel_training: { amount: "" },
      overhead: { amount: "" },
    });

    const [activeBreakdown, setActiveBreakdown] = useState(null);

    // Calculate total from breakdown
    const calculateManpowerTotal = () => {
      return budgetAllocations.manpower.breakdown.reduce(
        (sum, item) =>
          sum + (item.salary_per_month * item.months * item.num_personnel || 0),
        0
      );
    };

    const calculateEquipmentTotal = () => {
      return budgetAllocations.equipment.breakdown.reduce(
        (sum, item) => sum + (item.quantity * item.unit_cost || 0),
        0
      );
    };

    const calculateTotalBudget = () => {
      return (
        calculateManpowerTotal() +
        calculateEquipmentTotal() +
        parseFloat(budgetAllocations.consumables.amount || 0) +
        parseFloat(budgetAllocations.contingency.amount || 0) +
        parseFloat(budgetAllocations.travel_training.amount || 0) +
        parseFloat(budgetAllocations.overhead.amount || 0)
      );
    };

    // Manpower breakdown handlers
    const addManpowerRow = () => {
      setBudgetAllocations({
        ...budgetAllocations,
        manpower: {
          ...budgetAllocations.manpower,
          breakdown: [
            ...budgetAllocations.manpower.breakdown,
            { role: "", salary_per_month: "", months: "", num_personnel: 1 },
          ],
        },
      });
    };

    const removeManpowerRow = (index) => {
      setBudgetAllocations({
        ...budgetAllocations,
        manpower: {
          ...budgetAllocations.manpower,
          breakdown: budgetAllocations.manpower.breakdown.filter(
            (_, i) => i !== index
          ),
        },
      });
    };

    const updateManpowerRow = (index, field, value) => {
      const updated = [...budgetAllocations.manpower.breakdown];
      updated[index][field] = value;
      setBudgetAllocations({
        ...budgetAllocations,
        manpower: { ...budgetAllocations.manpower, breakdown: updated },
      });
    };

    // Equipment breakdown handlers
    const addEquipmentRow = () => {
      setBudgetAllocations({
        ...budgetAllocations,
        equipment: {
          ...budgetAllocations.equipment,
          breakdown: [
            ...budgetAllocations.equipment.breakdown,
            { item_name: "", quantity: 1, unit_cost: "" },
          ],
        },
      });
    };

    const removeEquipmentRow = (index) => {
      setBudgetAllocations({
        ...budgetAllocations,
        equipment: {
          ...budgetAllocations.equipment,
          breakdown: budgetAllocations.equipment.breakdown.filter(
            (_, i) => i !== index
          ),
        },
      });
    };

    const updateEquipmentRow = (index, field, value) => {
      const updated = [...budgetAllocations.equipment.breakdown];
      updated[index][field] = value;
      setBudgetAllocations({
        ...budgetAllocations,
        equipment: { ...budgetAllocations.equipment, breakdown: updated },
      });
    };

    const updateSimpleBudget = (head, value) => {
      setBudgetAllocations({
        ...budgetAllocations,
        [head]: { amount: value },
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        // Prepare project data
        const projectData = {
          project_no: formData.project_no,
          title: formData.title,
          alias: formData.alias || null,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          funding_agency_id: parseInt(formData.funding_agency_id),
          technical_group_id: parseInt(formData.technical_group_id),
          manpower_allocation: calculateManpowerTotal(),
          equipment_allocation: calculateEquipmentTotal(),
          consumables_allocation: parseFloat(
            budgetAllocations.consumables.amount || 0
          ),
          contingency_allocation: parseFloat(
            budgetAllocations.contingency.amount || 0
          ),
          travel_training_allocation: parseFloat(
            budgetAllocations.travel_training.amount || 0
          ),
          overhead_allocation: parseFloat(
            budgetAllocations.overhead.amount || 0
          ),
          manpower_breakdown: budgetAllocations.manpower.breakdown.filter(
            (item) => item.role && item.salary_per_month && item.months
          ),
          equipment_breakdown: budgetAllocations.equipment.breakdown.filter(
            (item) => item.item_name && item.quantity && item.unit_cost
          ),
        };

        await apiPost("/projects", projectData);
        onSuccess();
      } catch (err) {
        console.error("Failed to create project:", err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">
              Create New Project
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm flex-1">{error}</span>
              <button onClick={clearError} className="text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">
                Project Information
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Number *
                  </label>
                  <input
                    type="text"
                    value={formData.project_no}
                    onChange={(e) =>
                      setFormData({ ...formData, project_no: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., PRJ-2025-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alias
                  </label>
                  <input
                    type="text"
                    value={formData.alias}
                    onChange={(e) =>
                      setFormData({ ...formData, alias: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional short name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Enter project title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Funding Agency *
                  </label>
                  <select
                    value={formData.funding_agency_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        funding_agency_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Agency</option>
                    {fundingAgencies.map((agency) => (
                      <option key={agency.agency_id} value={agency.agency_id}>
                        {agency.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technical Group *
                  </label>
                  <select
                    value={formData.technical_group_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        technical_group_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Group</option>
                    {technicalGroups.map((group) => (
                      <option key={group.group_id} value={group.group_id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Budget Allocation */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">
                Budget Allocation
              </h4>

              {/* Manpower */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h5 className="font-medium text-gray-900">Manpower</h5>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveBreakdown(
                        activeBreakdown === "manpower" ? null : "manpower"
                      )
                    }
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    {activeBreakdown === "manpower" ? "Hide" : "Show"} Breakdown
                  </button>
                </div>

                {activeBreakdown === "manpower" && (
                  <div className="space-y-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Add detailed manpower breakdown
                      </span>
                      <button
                        type="button"
                        onClick={addManpowerRow}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Row
                      </button>
                    </div>
                    {budgetAllocations.manpower.breakdown.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-end bg-white p-2 rounded"
                      >
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <input
                            type="text"
                            value={item.role}
                            onChange={(e) =>
                              updateManpowerRow(index, "role", e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g., Engineer"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Salary/Month
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.salary_per_month}
                            onChange={(e) =>
                              updateManpowerRow(
                                index,
                                "salary_per_month",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="50000"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Months
                          </label>
                          <input
                            type="number"
                            value={item.months}
                            onChange={(e) =>
                              updateManpowerRow(index, "months", e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="12"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Count
                          </label>
                          <input
                            type="number"
                            value={item.num_personnel}
                            onChange={(e) =>
                              updateManpowerRow(
                                index,
                                "num_personnel",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="1"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            ₹
                            {(
                              item.salary_per_month *
                                item.months *
                                item.num_personnel || 0
                            ).toLocaleString()}
                          </span>
                          {budgetAllocations.manpower.breakdown.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeManpowerRow(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Manpower:
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(calculateManpowerTotal())}
                  </span>
                </div>
              </div>

              {/* Equipment */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Wrench className="w-5 h-5 text-purple-600" />
                    <h5 className="font-medium text-gray-900">Equipment</h5>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveBreakdown(
                        activeBreakdown === "equipment" ? null : "equipment"
                      )
                    }
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                  >
                    {activeBreakdown === "equipment" ? "Hide" : "Show"}{" "}
                    Breakdown
                  </button>
                </div>

                {activeBreakdown === "equipment" && (
                  <div className="space-y-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Add detailed equipment breakdown
                      </span>
                      <button
                        type="button"
                        onClick={addEquipmentRow}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Row
                      </button>
                    </div>
                    {budgetAllocations.equipment.breakdown.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-2 items-end bg-white p-2 rounded"
                        >
                          <div className="col-span-5">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Item Name
                            </label>
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) =>
                                updateEquipmentRow(
                                  index,
                                  "item_name",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder="e.g., Laptop"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateEquipmentRow(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder="1"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Unit Cost
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) =>
                                updateEquipmentRow(
                                  index,
                                  "unit_cost",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder="50000"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">
                              ₹
                              {(
                                item.quantity * item.unit_cost || 0
                              ).toLocaleString()}
                            </span>
                            {budgetAllocations.equipment.breakdown.length >
                              1 && (
                              <button
                                type="button"
                                onClick={() => removeEquipmentRow(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Equipment:
                  </span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatCurrency(calculateEquipmentTotal())}
                  </span>
                </div>
              </div>

              {/* Other Budget Heads */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consumables
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAllocations.consumables.amount}
                    onChange={(e) =>
                      updateSimpleBudget("consumables", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contingency
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAllocations.contingency.amount}
                    onChange={(e) =>
                      updateSimpleBudget("contingency", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Travel & Training
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAllocations.travel_training.amount}
                    onChange={(e) =>
                      updateSimpleBudget("travel_training", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overhead
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAllocations.overhead.amount}
                    onChange={(e) =>
                      updateSimpleBudget("overhead", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Total Budget Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-blue-900">
                  Total Project Budget:
                </span>
                <span className="text-2xl font-bold text-blue-900">
                  {formatCurrency(calculateTotalBudget())}
                </span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ProjectsView = () => (
    <>
      <ProjectFilters />
      <ProjectsTable />
    </>
  );

  const BudgetBreakdownView = () => {
    const { loading, apiGet } = useAPI();
    const [viewMode, setViewMode] = useState("by-head");
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Date filter mode
    const [dateFilterMode, setDateFilterMode] = useState("as-of"); // "as-of" or "range"
    const [asOfDate, setAsOfDate] = useState(
      new Date().toISOString().split("T")[0]
    );
    const [startDate, setStartDate] = useState(
      new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString()
        .split("T")[0]
    );
    const [endDate, setEndDate] = useState(
      new Date().toISOString().split("T")[0]
    );

    const [breakdownData, setBreakdownData] = useState([]);
    const [detailedBreakdownData, setDetailedBreakdownData] = useState({});
    const [allProjectsData, setAllProjectsData] = useState([]);
    const [allGroupsData, setAllGroupsData] = useState({});
    const [allAgenciesData, setAllAgenciesData] = useState({});
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
      loadBreakdownData();
    }, [asOfDate, startDate, endDate, dateFilterMode, viewMode]);

    const loadBreakdownData = async () => {
      try {
        if (
          (viewMode === "by-head" || viewMode === "by-head-detailed") &&
          selectedProject
        ) {
          // Build query string based on filter mode
          let queryString;
          if (dateFilterMode === "range") {
            queryString = `start_date=${startDate}&end_date=${endDate}`;
          } else {
            queryString = `as_of_date=${asOfDate}`;
          }

          const data = await apiGet(
            `/projects/${selectedProject.project_id}/budget-breakdown-comparison?${queryString}`
          );
          setBreakdownData(data.data || []);

          if (viewMode === "by-head-detailed") {
            const [
              manpowerAllocation,
              equipmentAllocation,
              manpowerFunds,
              equipmentFunds,
              manpowerExpenditure,
              equipmentExpenditure,
              budgetAllocation,
            ] = await Promise.all([
              apiGet(
                `/projects/${selectedProject.project_id}/manpower-allocation-breakdown`
              ),
              apiGet(
                `/projects/${selectedProject.project_id}/equipment-allocation-breakdown`
              ),
              apiGet(
                `/projects/${selectedProject.project_id}/manpower-funds-breakdown`
              ),
              apiGet(
                `/projects/${selectedProject.project_id}/equipment-funds-breakdown`
              ),
              apiGet(`/projects/${selectedProject.project_id}/manpower`),
              apiGet(`/projects/${selectedProject.project_id}/equipment`),
              apiGet(
                `/projects/${selectedProject.project_id}/budget-allocation`
              ),
            ]);

            setDetailedBreakdownData({
              manpowerAllocation: manpowerAllocation || [],
              equipmentAllocation: equipmentAllocation || [],
              manpowerFunds: manpowerFunds || [],
              equipmentFunds: equipmentFunds || [],
              manpowerExpenditure: manpowerExpenditure || [],
              equipmentExpenditure: equipmentExpenditure || [],
              budgetAllocation: budgetAllocation || [],
            });
          }
        } else if (viewMode === "by-project") {
          let queryString =
            dateFilterMode === "range"
              ? `start_date=${startDate}&end_date=${endDate}`
              : `as_of_date=${asOfDate}`;
          const data = await apiGet(
            `/budget-breakdown-all-projects?${queryString}`
          );
          setAllProjectsData(data.data || []);
        } else if (viewMode === "by-group") {
          let queryString =
            dateFilterMode === "range"
              ? `start_date=${startDate}&end_date=${endDate}`
              : `as_of_date=${asOfDate}`;
          const data = await apiGet(
            `/budget-breakdown-by-technical-group?${queryString}`
          );
          setAllGroupsData(data.data || {});
        } else if (viewMode === "by-agency") {
          let queryString =
            dateFilterMode === "range"
              ? `start_date=${startDate}&end_date=${endDate}`
              : `as_of_date=${asOfDate}`;
          const data = await apiGet(
            `/budget-breakdown-by-funding-agency?${queryString}`
          );
          setAllAgenciesData(data.data || {});
        }
      } catch (err) {
        console.error("Failed to load breakdown data:", err);
      }
    };

    useEffect(() => {
      if (
        (viewMode === "by-head" || viewMode === "by-head-detailed") &&
        selectedProject
      ) {
        loadBreakdownData();
      }
    }, [selectedProject]);

    const toggleSection = (section) => {
      setExpandedSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    };

    const exportToExcel = () => {
      let csvContent = "";

      if (
        (viewMode === "by-head" || viewMode === "by-head-detailed") &&
        selectedProject
      ) {
        csvContent = `Budget Breakdown - ${
          selectedProject.title
        }\nAs of Date: ${formatDate(asOfDate)}\n\n`;
        csvContent +=
          "Budget Head,Approved Budget,Funds Received,Expenditure Incurred,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        breakdownData.forEach((row) => {
          const budgetBalance = row.approved_budget - row.total_expenditure;
          const fundsBalance = row.funds_received - row.total_expenditure;
          csvContent += `${row.head},${row.approved_budget},${row.funds_received},${row.total_expenditure},${budgetBalance},${fundsBalance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += budgetBalance;
          totals.fundsBalance += fundsBalance;
        });

        csvContent += `\nGrand Total,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      } else if (viewMode === "by-project") {
        csvContent = `Project-wise Budget Breakdown\nAs of Date: ${formatDate(
          asOfDate
        )}\n\n`;
        csvContent +=
          "Project No,Project Title,Approved Budget,Total Funds Received,Total Expenditure,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        allProjectsData.forEach((row) => {
          const budgetBalance = row.approved_budget - row.total_expenditure;
          const fundsBalance = row.total_funds_received - row.total_expenditure;
          csvContent += `${row.project_no},"${row.title}",${row.approved_budget},${row.total_funds_received},${row.total_expenditure},${budgetBalance},${fundsBalance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.total_funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += budgetBalance;
          totals.fundsBalance += fundsBalance;
        });

        csvContent += `\nGrand Total,,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      } else if (viewMode === "by-group" && selectedGroup) {
        const groupData = allGroupsData[selectedGroup] || [];
        csvContent = `Budget Breakdown - ${selectedGroup}\nAs of Date: ${formatDate(
          asOfDate
        )}\n\n`;
        csvContent +=
          "Budget Head,Approved Budget,Funds Received,Expenditure Incurred,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        groupData.forEach((row) => {
          csvContent += `${row.head},${row.approved_budget},${row.funds_received},${row.total_expenditure},${row.budget_balance},${row.funds_balance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += row.budget_balance;
          totals.fundsBalance += row.funds_balance;
        });

        csvContent += `\nGrand Total,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      } else if (viewMode === "by-agency" && selectedAgency) {
        const agencyData = allAgenciesData[selectedAgency] || [];
        csvContent = `Budget Breakdown - ${selectedAgency}\nAs of Date: ${formatDate(
          asOfDate
        )}\n\n`;
        csvContent +=
          "Budget Head,Approved Budget,Funds Received,Expenditure Incurred,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        agencyData.forEach((row) => {
          csvContent += `${row.head},${row.approved_budget},${row.funds_received},${row.total_expenditure},${row.budget_balance},${row.funds_balance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += row.budget_balance;
          totals.fundsBalance += row.funds_balance;
        });

        csvContent += `\nGrand Total,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `budget_breakdown_${asOfDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const calculateTotals = (data) => {
      return data.reduce(
        (acc, row) => {
          const budgetBalance =
            row.budget_balance || row.approved_budget - row.total_expenditure;
          const fundsBalance =
            row.funds_balance || row.funds_received - row.total_expenditure;
          return {
            budget: acc.budget + row.approved_budget,
            funds: acc.funds + row.funds_received,
            expenditure: acc.expenditure + row.total_expenditure,
            budgetBalance: acc.budgetBalance + budgetBalance,
            fundsBalance: acc.fundsBalance + fundsBalance,
          };
        },
        {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        }
      );
    };

    const calculateProjectTotals = (data) => {
      return data.reduce(
        (acc, row) => {
          const budgetBalance = row.approved_budget - row.total_expenditure;
          const fundsBalance = row.total_funds_received - row.total_expenditure;
          return {
            budget: acc.budget + row.approved_budget,
            funds: acc.funds + row.total_funds_received,
            expenditure: acc.expenditure + row.total_expenditure,
            budgetBalance: acc.budgetBalance + budgetBalance,
            fundsBalance: acc.fundsBalance + fundsBalance,
          };
        },
        {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        }
      );
    };

    const renderDetailedBreakdown = (head) => {
      if (head !== "manpower" && head !== "equipment") return null;
      if (!expandedSections[head]) return null;

      // Get budget allocation for this head
      const budgetAllocation = breakdownData.find((b) => b.head === head);
      const approvedBudget = budgetAllocation?.approved_budget || 0;

      // Get breakdown items from allocation
      const fundsItems =
        head === "manpower"
          ? detailedBreakdownData.manpowerFunds || []
          : detailedBreakdownData.equipmentFunds || [];

      const expenditureItems =
        head === "manpower"
          ? detailedBreakdownData.manpowerExpenditure || []
          : detailedBreakdownData.equipmentExpenditure || [];

      // Create a map to consolidate all data by designation/item
      const itemsMap = new Map();

      // Process funds received
      fundsItems.forEach((item) => {
        const key = head === "manpower" ? item.role : item.item_name;
        if (!itemsMap.has(key)) {
          if (head === "manpower") {
            itemsMap.set(key, {
              designation: key,
              approvedPosts: item.num_personnel || 0,
              monthlySalary: item.salary_per_month || 0,
              months: item.months || 0,
              approvedTotal:
                item.salary_per_month * item.months * item.num_personnel,
              fundsReceived: 0,
              expenditure: 0,
            });
          } else {
            itemsMap.set(key, {
              itemName: key,
              approvedQty: item.quantity || 0,
              approvedAmount: item.unit_cost || 0,
              approvedTotal: item.quantity * item.unit_cost,
              fundsReceived: 0,
              expenditure: 0,
            });
          }
        }
        const itemData = itemsMap.get(key);
        const fundsTotal =
          head === "manpower"
            ? item.salary_per_month * item.months * item.num_personnel
            : item.quantity * item.unit_cost;
        itemData.fundsReceived += fundsTotal;
      });

      // Process expenditures
      expenditureItems.forEach((item) => {
        const key = head === "manpower" ? item.role : item.name;
        if (!itemsMap.has(key)) {
          if (head === "manpower") {
            itemsMap.set(key, {
              designation: key,
              approvedPosts: 0,
              monthlySalary: item.salary_per_month || 0,
              months: item.months || 0,
              approvedTotal: 0,
              fundsReceived: 0,
              expenditure: 0,
            });
          } else {
            itemsMap.set(key, {
              itemName: key,
              approvedQty: 0,
              approvedAmount: item.unit_cost || 0,
              approvedTotal: 0,
              fundsReceived: 0,
              expenditure: 0,
            });
          }
        }
        const itemData = itemsMap.get(key);
        const expTotal =
          head === "manpower"
            ? item.salary_per_month * item.months * item.num_personnel
            : item.quantity * item.unit_cost;
        itemData.expenditure += expTotal;
      });

      // Calculate subtotals
      let subtotals = {
        approvedTotal: 0,
        fundsReceived: 0,
        expenditure: 0,
        unspent: 0,
        balance: 0,
      };

      itemsMap.forEach((item) => {
        subtotals.approvedTotal += item.approvedTotal || 0;
        subtotals.fundsReceived += item.fundsReceived || 0;
        subtotals.expenditure += item.expenditure || 0;
      });

      subtotals.unspent = subtotals.fundsReceived - subtotals.expenditure;
      subtotals.balance = subtotals.approvedTotal - subtotals.expenditure;

      return (
        <tr>
          <td colSpan="6" className="px-0 py-0">
            <div className="bg-blue-50 border-t-2 border-b-2 border-blue-200">
              <table className="min-w-full">
                <thead className="bg-yellow-100">
                  <tr>
                    {head === "manpower" ? (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-semibold border-r">
                          Designation
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold border-r">
                          No. of Approved Post
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold border-r">
                          Monthly Salary
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold border-r">
                          No. of Months
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Total
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Funds Received as on {formatDate(asOfDate)}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Expenditure Incurred as on {formatDate(asOfDate)}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Unspent Balance (Funds - Exp.)
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold">
                          Balance (Budget - Exp.)
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-semibold border-r">
                          List of Products
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold border-r">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Amount
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Total
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Funds Received as on {formatDate(asOfDate)}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Expenditure Incurred as on {formatDate(asOfDate)}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold border-r">
                          Unspent Balance (Funds - Exp.)
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold">
                          Balance (Budget - Exp.)
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from(itemsMap.entries()).map(([key, item], idx) => {
                    const unspentBalance =
                      item.fundsReceived - item.expenditure;
                    const balance = item.approvedTotal - item.expenditure;

                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {head === "manpower" ? (
                          <>
                            <td className="px-4 py-2 text-sm border-r">
                              {item.designation}
                            </td>
                            <td className="px-4 py-2 text-center text-sm border-r">
                              {item.approvedPosts}
                            </td>
                            <td className="px-4 py-2 text-center text-sm border-r">
                              {formatCurrency(item.monthlySalary)}
                            </td>
                            <td className="px-4 py-2 text-center text-sm border-r">
                              {item.months}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.approvedTotal)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.fundsReceived)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.expenditure)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              <span
                                className={
                                  unspentBalance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {formatCurrency(unspentBalance)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              <span
                                className={
                                  balance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {formatCurrency(balance)}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm border-r">
                              {item.itemName}
                            </td>
                            <td className="px-4 py-2 text-center text-sm border-r">
                              {item.approvedQty}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.approvedAmount)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.approvedTotal)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.fundsReceived)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              {formatCurrency(item.expenditure)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm border-r">
                              <span
                                className={
                                  unspentBalance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {formatCurrency(unspentBalance)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              <span
                                className={
                                  balance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {formatCurrency(balance)}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-yellow-100 font-bold">
                    {head === "manpower" ? (
                      <>
                        <td
                          colSpan="4"
                          className="px-4 py-2 text-sm text-right border-r"
                        >
                          Total Manpower
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          {formatCurrency(subtotals.approvedTotal)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          {formatCurrency(subtotals.fundsReceived)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          {formatCurrency(subtotals.expenditure)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          <span
                            className={
                              subtotals.unspent >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(subtotals.unspent)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          <span
                            className={
                              subtotals.balance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(subtotals.balance)}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          colSpan="3"
                          className="px-4 py-2 text-sm text-right border-r"
                        >
                          Total Equipment
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          {formatCurrency(subtotals.approvedTotal)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          {formatCurrency(subtotals.fundsReceived)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          {formatCurrency(subtotals.expenditure)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm border-r">
                          <span
                            className={
                              subtotals.unspent >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(subtotals.unspent)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          <span
                            className={
                              subtotals.balance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(subtotals.balance)}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      );
    };

    const renderBudgetHeadTable = (
      data,
      title,
      subtitle,
      showDetailedOption = false
    ) => {
      if (data.length === 0) {
        return (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No data available</p>
          </div>
        );
      }

      const totals = calculateTotals(data);

      return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Head
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funds Received
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expenditure
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Balance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funds Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => {
                  const budgetBalance =
                    row.budget_balance ||
                    row.approved_budget - row.total_expenditure;
                  const fundsBalance =
                    row.funds_balance ||
                    row.funds_received - row.total_expenditure;
                  const canExpand =
                    showDetailedOption &&
                    (row.head === "manpower" || row.head === "equipment");

                  return (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {canExpand && (
                              <button
                                onClick={() => toggleSection(row.head)}
                                className="mr-2 text-blue-600 hover:text-blue-800"
                              >
                                {expandedSections[row.head] ? "▼" : "▶"}
                              </button>
                            )}
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {row.head}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(row.approved_budget)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                          {formatCurrency(row.funds_received)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                          {formatCurrency(row.total_expenditure)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span
                            className={`font-medium ${
                              budgetBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(budgetBalance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span
                            className={`font-medium ${
                              fundsBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(fundsBalance)}
                          </span>
                        </td>
                      </tr>
                      {showDetailedOption && renderDetailedBreakdown(row.head)}
                    </React.Fragment>
                  );
                })}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Grand Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(totals.budget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                    {formatCurrency(totals.funds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                    {formatCurrency(totals.expenditure)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <span
                      className={
                        totals.budgetBalance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(totals.budgetBalance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <span
                      className={
                        totals.fundsBalance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(totals.fundsBalance)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                View Mode
              </label>
              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setSelectedProject(null);
                  setSelectedGroup(null);
                  setSelectedAgency(null);
                  setExpandedSections({});
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="by-head">By Budget Head (Project)</option>
                <option value="by-head-detailed">
                  By Budget Head - Detailed (Project)
                </option>
                <option value="by-project">By Project</option>
                <option value="by-group">By Technical Group</option>
                <option value="by-agency">By Funding Agency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Filter Mode
              </label>
              <select
                value={dateFilterMode}
                onChange={(e) => setDateFilterMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="as-of">As of Date (Cumulative)</option>
                <option value="range">Date Range (Between)</option>
              </select>
            </div>

            {dateFilterMode === "as-of" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  As of Date
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {(viewMode === "by-head" || viewMode === "by-head-detailed") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Project
                </label>
                <select
                  value={selectedProject?.project_id || ""}
                  onChange={(e) => {
                    const proj = projects.find(
                      (p) => p.project_id === parseInt(e.target.value)
                    );
                    setSelectedProject(proj);
                    setExpandedSections({});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((proj) => (
                    <option key={proj.project_id} value={proj.project_id}>
                      {proj.project_no} - {proj.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "by-group" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Technical Group
                </label>
                <select
                  value={selectedGroup || ""}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a group...</option>
                  {Object.keys(allGroupsData).map((groupName) => (
                    <option key={groupName} value={groupName}>
                      {groupName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "by-agency" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Funding Agency
                </label>
                <select
                  value={selectedAgency || ""}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an agency...</option>
                  {Object.keys(allAgenciesData).map((agencyName) => (
                    <option key={agencyName} value={agencyName}>
                      {agencyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={exportToExcel}
                disabled={
                  ((viewMode === "by-head" ||
                    viewMode === "by-head-detailed") &&
                    !selectedProject) ||
                  (viewMode === "by-group" && !selectedGroup) ||
                  (viewMode === "by-agency" && !selectedAgency)
                }
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>

        {/* By Budget Head View (Project) */}
        {(viewMode === "by-head" || viewMode === "by-head-detailed") && (
          <>
            {!selectedProject ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Project
                </h3>
                <p className="text-gray-500">
                  Choose a project to view its budget breakdown by head
                  {viewMode === "by-head-detailed" &&
                    " with detailed breakdowns"}
                </p>
              </div>
            ) : (
              renderBudgetHeadTable(
                breakdownData,
                selectedProject.title,
                `As of ${formatDate(asOfDate)}`,
                viewMode === "by-head-detailed"
              )
            )}
          </>
        )}

        {/* By Technical Group View */}
        {viewMode === "by-group" && (
          <>
            {!selectedGroup ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Technical Group
                </h3>
                <p className="text-gray-500">
                  Choose a technical group to view its consolidated budget
                  breakdown
                </p>
              </div>
            ) : (
              renderBudgetHeadTable(
                allGroupsData[selectedGroup] || [],
                `Technical Group: ${selectedGroup}`,
                `As of ${formatDate(asOfDate)}`
              )
            )}
          </>
        )}

        {/* By Funding Agency View */}
        {viewMode === "by-agency" && (
          <>
            {!selectedAgency ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Funding Agency
                </h3>
                <p className="text-gray-500">
                  Choose a funding agency to view its consolidated budget
                  breakdown
                </p>
              </div>
            ) : (
              renderBudgetHeadTable(
                allAgenciesData[selectedAgency] || [],
                `Funding Agency: ${selectedAgency}`,
                `As of ${formatDate(asOfDate)}`
              )
            )}
          </>
        )}

        {/* By Project View */}
        {viewMode === "by-project" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                Project-wise Budget Summary
              </h3>
              <p className="text-sm text-gray-500">
                As of {formatDate(asOfDate)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Title
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved Budget
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Funds Received
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expenditure
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Funds Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allProjectsData.map((row) => {
                    const budgetBalance =
                      row.approved_budget - row.total_expenditure;
                    const fundsBalance =
                      row.total_funds_received - row.total_expenditure;
                    return (
                      <tr key={row.project_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.project_no}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {row.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(row.approved_budget)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                          {formatCurrency(row.total_funds_received)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                          {formatCurrency(row.total_expenditure)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span
                            className={`font-medium ${
                              budgetBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(budgetBalance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span
                            className={`font-medium ${
                              fundsBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(fundsBalance)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {allProjectsData.length > 0 &&
                    (() => {
                      const totals = calculateProjectTotals(allProjectsData);
                      return (
                        <tr className="bg-blue-50 font-bold">
                          <td
                            colSpan="2"
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            Grand Total
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(totals.budget)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                            {formatCurrency(totals.funds)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                            {formatCurrency(totals.expenditure)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <span
                              className={
                                totals.budgetBalance >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {formatCurrency(totals.budgetBalance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <span
                              className={
                                totals.fundsBalance >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {formatCurrency(totals.fundsBalance)}
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const AnalyticsView = () => {
    const { apiGet } = useAPI();
    const [viewMode, setViewMode] = useState("by-head");
    const [asOfDate, setAsOfDate] = useState(
      new Date().toISOString().split("T")[0]
    );
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [technicalGroups, setTechnicalGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [fundingAgencies, setFundingAgencies] = useState([]);
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Data states
    const [breakdownData, setBreakdownData] = useState([]);
    const [allProjectsData, setAllProjectsData] = useState([]);
    const [allGroupsData, setAllGroupsData] = useState({});
    const [allAgenciesData, setAllAgenciesData] = useState({});

    useEffect(() => {
      const loadInitialData = async () => {
        try {
          const [projectsData, agenciesData, groupsData] = await Promise.all([
            apiGet("/projects"),
            apiGet("/funding-agencies"),
            apiGet("/technical-groups"),
          ]);
          setProjects(projectsData);
          setFundingAgencies(agenciesData);
          setTechnicalGroups(groupsData);
        } catch (err) {
          console.error("Failed to load initial data:", err);
        }
      };
      loadInitialData();
    }, [apiGet]);

    // Load data based on view mode
    useEffect(() => {
      if (viewMode === "by-project") {
        loadAllProjectsData();
      } else if (viewMode === "by-group") {
        loadAllGroupsData();
      } else if (viewMode === "by-agency") {
        loadAllAgenciesData();
      }
    }, [viewMode, asOfDate]);

    const loadBreakdownData = async () => {
      try {
        const data = await apiGet(
          `/projects/${selectedProject.project_id}/budget-breakdown-comparison?as_of_date=${asOfDate}`
        );
        setBreakdownData(data.data || []);
      } catch (err) {
        console.error("Failed to load breakdown data:", err);
      }
    };

    const loadAllProjectsData = async () => {
      try {
        const data = await apiGet(
          `/budget-breakdown-all-projects?as_of_date=${asOfDate}`
        );
        setAllProjectsData(data.data || []);
      } catch (err) {
        console.error("Failed to load all projects data:", err);
      }
    };

    const loadAllGroupsData = async () => {
      try {
        const data = await apiGet(
          `/budget-breakdown-by-technical-group?as_of_date=${asOfDate}`
        );
        setAllGroupsData(data.data || {});
      } catch (err) {
        console.error("Failed to load groups data:", err);
      }
    };

    const loadAllAgenciesData = async () => {
      try {
        const data = await apiGet(
          `/budget-breakdown-by-funding-agency?as_of_date=${asOfDate}`
        );
        setAllAgenciesData(data.data || {});
      } catch (err) {
        console.error("Failed to load agencies data:", err);
      }
    };

    // Reload when project selection changes
    useEffect(() => {
      if (viewMode === "by-head" && selectedProject) {
        loadBreakdownData();
      }
    }, [selectedProject, asOfDate]);

    const exportToExcel = () => {
      let csvContent = "";

      if (viewMode === "by-head" && selectedProject) {
        csvContent = `Budget Breakdown - ${
          selectedProject.title
        }\nAs of Date: ${formatDate(asOfDate)}\n\n`;
        csvContent +=
          "Budget Head,Approved Budget,Funds Received,Expenditure Incurred,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        breakdownData.forEach((row) => {
          const budgetBalance = row.approved_budget - row.total_expenditure;
          const fundsBalance = row.funds_received - row.total_expenditure;
          csvContent += `${row.head},${row.approved_budget},${row.funds_received},${row.total_expenditure},${budgetBalance},${fundsBalance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += budgetBalance;
          totals.fundsBalance += fundsBalance;
        });

        csvContent += `\nGrand Total,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      } else if (viewMode === "by-project") {
        csvContent = `Project-wise Budget Breakdown\nAs of Date: ${formatDate(
          asOfDate
        )}\n\n`;
        csvContent +=
          "Project No,Project Title,Approved Budget,Total Funds Received,Total Expenditure,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        allProjectsData.forEach((row) => {
          const budgetBalance = row.approved_budget - row.total_expenditure;
          const fundsBalance = row.total_funds_received - row.total_expenditure;
          csvContent += `${row.project_no},"${row.title}",${row.approved_budget},${row.total_funds_received},${row.total_expenditure},${budgetBalance},${fundsBalance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.total_funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += budgetBalance;
          totals.fundsBalance += fundsBalance;
        });

        csvContent += `\nGrand Total,,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      } else if (viewMode === "by-group" && selectedGroup) {
        const groupData = allGroupsData[selectedGroup] || [];
        csvContent = `Budget Breakdown - ${selectedGroup}\nAs of Date: ${formatDate(
          asOfDate
        )}\n\n`;
        csvContent +=
          "Budget Head,Approved Budget,Funds Received,Expenditure Incurred,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        groupData.forEach((row) => {
          csvContent += `${row.head},${row.approved_budget},${row.funds_received},${row.total_expenditure},${row.budget_balance},${row.funds_balance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += row.budget_balance;
          totals.fundsBalance += row.funds_balance;
        });

        csvContent += `\nGrand Total,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      } else if (viewMode === "by-agency" && selectedAgency) {
        const agencyData = allAgenciesData[selectedAgency] || [];
        csvContent = `Budget Breakdown - ${selectedAgency}\nAs of Date: ${formatDate(
          asOfDate
        )}\n\n`;
        csvContent +=
          "Budget Head,Approved Budget,Funds Received,Expenditure Incurred,Budget Balance,Funds Balance\n";

        let totals = {
          budget: 0,
          funds: 0,
          expenditure: 0,
          budgetBalance: 0,
          fundsBalance: 0,
        };

        agencyData.forEach((row) => {
          csvContent += `${row.head},${row.approved_budget},${row.funds_received},${row.total_expenditure},${row.budget_balance},${row.funds_balance}\n`;
          totals.budget += row.approved_budget;
          totals.funds += row.funds_received;
          totals.expenditure += row.total_expenditure;
          totals.budgetBalance += row.budget_balance;
          totals.fundsBalance += row.funds_balance;
        });

        csvContent += `\nGrand Total,${totals.budget},${totals.funds},${totals.expenditure},${totals.budgetBalance},${totals.fundsBalance}\n`;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `analytics_breakdown_${asOfDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const renderBarChart = (data, xKey, title, subtitle) => {
      if (data.length === 0) {
        return (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No data available</p>
          </div>
        );
      }

      const chartData = data.map((row) => {
        const budgetBalance = row.approved_budget - row.total_expenditure;
        const fundsBalance = row.funds_received - row.total_expenditure;
        return {
          ...row,
          budgetBalance,
          fundsBalance,
        };
      });

      return (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis tickFormatter={(value) => formatCurrencyShort(value)} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar
                dataKey="approved_budget"
                fill="#3b82f6"
                name="Approved Budget"
              />
              <Bar
                dataKey="funds_received"
                fill="#22c55e"
                name="Funds Received"
              />
              <Bar
                dataKey="total_expenditure"
                fill="#ef4444"
                name="Expenditure"
              />
              <Bar
                dataKey="budgetBalance"
                fill="#eab308"
                name="Budget Balance"
              />
              <Bar dataKey="fundsBalance" fill="#a855f7" name="Funds Balance" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                View Mode
              </label>
              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setSelectedProject(null);
                  setSelectedGroup(null);
                  setSelectedAgency(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="by-head">By Budget Head (Project)</option>
                <option value="by-project">By Project</option>
                <option value="by-group">By Technical Group</option>
                <option value="by-agency">By Funding Agency</option>
              </select>
            </div>

            {viewMode === "by-head" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Project
                </label>
                <select
                  value={selectedProject?.project_id || ""}
                  onChange={(e) => {
                    const proj = projects.find(
                      (p) => p.project_id === parseInt(e.target.value)
                    );
                    setSelectedProject(proj);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((proj) => (
                    <option key={proj.project_id} value={proj.project_id}>
                      {proj.project_no} - {proj.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "by-group" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Technical Group
                </label>
                <select
                  value={selectedGroup || ""}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a group...</option>
                  {technicalGroups.map((group) => (
                    <option key={group.group_id} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "by-agency" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Funding Agency
                </label>
                <select
                  value={selectedAgency || ""}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an agency...</option>
                  {fundingAgencies.map((agency) => (
                    <option key={agency.agency_id} value={agency.name}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                As of Date
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={exportToExcel}
                disabled={
                  (viewMode === "by-head" && !selectedProject) ||
                  (viewMode === "by-group" && !selectedGroup) ||
                  (viewMode === "by-agency" && !selectedAgency) ||
                  (viewMode === "by-head" && breakdownData.length === 0) ||
                  (viewMode === "by-project" && allProjectsData.length === 0) ||
                  (viewMode === "by-group" &&
                    (!selectedGroup || !allGroupsData[selectedGroup])) ||
                  (viewMode === "by-agency" &&
                    (!selectedAgency || !allAgenciesData[selectedAgency]))
                }
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>

        {/* By Budget Head View (Project) */}
        {viewMode === "by-head" && (
          <>
            {!selectedProject ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Project
                </h3>
                <p className="text-gray-500">
                  Choose a project to view its budget analytics
                </p>
              </div>
            ) : (
              renderBarChart(
                breakdownData,
                "head",
                selectedProject.title,
                `As of ${formatDate(asOfDate)}`
              )
            )}
          </>
        )}

        {/* By Technical Group View */}
        {viewMode === "by-group" && (
          <>
            {!selectedGroup ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Technical Group
                </h3>
                <p className="text-gray-500">
                  Choose a technical group to view its analytics
                </p>
              </div>
            ) : (
              renderBarChart(
                allGroupsData[selectedGroup] || [],
                "head",
                `Technical Group: ${selectedGroup}`,
                `As of ${formatDate(asOfDate)}`
              )
            )}
          </>
        )}

        {/* By Funding Agency View */}
        {viewMode === "by-agency" && (
          <>
            {!selectedAgency ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Funding Agency
                </h3>
                <p className="text-gray-500">
                  Choose a funding agency to view its analytics
                </p>
              </div>
            ) : (
              renderBarChart(
                allAgenciesData[selectedAgency] || [],
                "head",
                `Funding Agency: ${selectedAgency}`,
                `As of ${formatDate(asOfDate)}`
              )
            )}
          </>
        )}

        {/* By Project View */}
        {viewMode === "by-project" &&
          renderBarChart(
            allProjectsData.map((row) => ({
              ...row,
              name: row.project_no, // Use for XAxis
            })),
            "name",
            "Project-wise Budget Analytics",
            `As of ${formatDate(asOfDate)}`
          )}
      </div>
    );
  };

  const ReportsView = () => {
    const { loading, apiGet } = useAPI();
    const [reportType, setReportType] = useState("project-summary");
    const [selectedProject, setSelectedProject] = useState(null);
    const [asOfDate, setAsOfDate] = useState(
      new Date().toISOString().split("T")[0]
    );

    const generatePDF = async () => {
      if (reportType === "project-summary" && !selectedProject) {
        alert("Please select a project");
        return;
      }

      try {
        let reportData;
        let fileName;

        switch (reportType) {
          case "project-summary":
            reportData = await Promise.all([
              apiGet(`/projects/${selectedProject.project_id}`),
              apiGet(
                `/projects/${selectedProject.project_id}/budget-breakdown-comparison?as_of_date=${asOfDate}`
              ),
              apiGet(
                `/projects/${selectedProject.project_id}/manpower-allocation-breakdown`
              ),
              apiGet(
                `/projects/${selectedProject.project_id}/equipment-allocation-breakdown`
              ),
            ]);
            fileName = `Project_Summary_${selectedProject.project_no}_${asOfDate}.pdf`;
            generateProjectSummaryPDF(reportData, fileName);
            break;

          case "financial-statement":
            reportData = await apiGet(
              `/projects/${selectedProject.project_id}/budget-breakdown-comparison?as_of_date=${asOfDate}`
            );
            fileName = `Financial_Statement_${selectedProject.project_no}_${asOfDate}.pdf`;
            generateFinancialStatementPDF(
              selectedProject,
              reportData,
              fileName
            );
            break;

          case "all-projects":
            reportData = await apiGet(
              `/budget-breakdown-all-projects?as_of_date=${asOfDate}`
            );
            fileName = `All_Projects_Report_${asOfDate}.pdf`;
            generateAllProjectsReportPDF(reportData, fileName);
            break;

          case "group-wise":
            reportData = await apiGet(
              `/budget-breakdown-by-technical-group?as_of_date=${asOfDate}`
            );
            fileName = `Technical_Groups_Report_${asOfDate}.pdf`;
            generateGroupWiseReportPDF(reportData, fileName);
            break;

          case "agency-wise":
            reportData = await apiGet(
              `/budget-breakdown-by-funding-agency?as_of_date=${asOfDate}`
            );
            fileName = `Funding_Agencies_Report_${asOfDate}.pdf`;
            generateAgencyWiseReportPDF(reportData, fileName);
            break;

          case "expenditure-detail":
            reportData = await Promise.all([
              apiGet(`/projects/${selectedProject.project_id}/manpower`),
              apiGet(`/projects/${selectedProject.project_id}/equipment`),
              apiGet(
                `/projects/${selectedProject.project_id}/budget-expenditure`
              ),
            ]);
            fileName = `Expenditure_Detail_${selectedProject.project_no}_${asOfDate}.pdf`;
            generateExpenditureDetailPDF(selectedProject, reportData, fileName);
            break;

          case "funds-received":
            reportData = await apiGet(
              `/projects/${selectedProject.project_id}/funds-received`
            );
            fileName = `Funds_Received_${selectedProject.project_no}_${asOfDate}.pdf`;
            generateFundsReceivedPDF(selectedProject, reportData, fileName);
            break;
        }
      } catch (err) {
        alert("Failed to generate report: " + err.message);
      }
    };

    // PDF Generation Functions
    const generateProjectSummaryPDF = (
      [project, budgetData, manpowerBreakdown, equipmentBreakdown],
      fileName
    ) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("PROJECT SUMMARY REPORT", 105, yPos, { align: "center" });
      yPos += 10;

      // Project Details
      doc.setFontSize(14);
      doc.text(project.title, 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Project No: ${project.project_no}`, 20, yPos);
      yPos += 5;
      if (project.alias) {
        doc.text(`Alias: ${project.alias}`, 20, yPos);
        yPos += 5;
      }
      doc.text(`Technical Group: ${project.technical_group_name}`, 20, yPos);
      yPos += 5;
      doc.text(`Funding Agency: ${project.funding_agency_name}`, 20, yPos);
      yPos += 5;
      doc.text(
        `Duration: ${formatDate(project.start_date)} to ${
          project.end_date ? formatDate(project.end_date) : "Ongoing"
        }`,
        20,
        yPos
      );
      yPos += 5;
      doc.text(`Report Date: ${formatDate(asOfDate)}`, 20, yPos);
      yPos += 10;

      // Financial Summary
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Financial Summary", 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Total Allocation: ${formatCurrencyForPDF(project.planned_allocation)}`,
        20,
        yPos
      );
      yPos += 5;
      doc.text(
        `Funds Received: ${formatCurrencyForPDF(project.funds_received)}`,
        20,
        yPos
      );
      yPos += 5;
      doc.text(
        `Total Expenditure: ${formatCurrencyForPDF(
          project.actual_expenditure
        )}`,
        20,
        yPos
      );
      yPos += 5;
      doc.text(
        `Budget Balance: ${formatCurrencyForPDF(project.budget_balance)}`,
        20,
        yPos
      );
      yPos += 5;
      doc.text(
        `Funding Balance: ${formatCurrencyForPDF(project.funding_balance)}`,
        20,
        yPos
      );
      yPos += 10;

      // Budget Breakdown Table
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Budget Breakdown by Head", 20, yPos);
      yPos += 5;

      const budgetTableData = budgetData.data.map((row) => [
        row.head.toUpperCase(),
        formatCurrencyForPDF(row.approved_budget),
        formatCurrencyForPDF(row.funds_received),
        formatCurrencyForPDF(row.total_expenditure),
        formatCurrencyForPDF(row.unspent_balance),
      ]);

      doc.autoTable({
        startY: yPos,
        head: [["Head", "Allocated", "Received", "Expenditure", "Balance"]],
        body: budgetTableData,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Manpower Breakdown
      if (manpowerBreakdown.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Manpower Allocation Breakdown", 20, yPos);
        yPos += 5;

        const manpowerData = manpowerBreakdown.map((row) => [
          row.role,
          formatCurrencyForPDF(row.salary_per_month),
          row.months.toString(),
          row.num_personnel.toString(),
          formatCurrencyForPDF(
            row.salary_per_month * row.months * row.num_personnel
          ),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Role", "Salary/Month", "Months", "Personnel", "Total"]],
          body: manpowerData,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Equipment Breakdown
      if (equipmentBreakdown.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Equipment Allocation Breakdown", 20, yPos);
        yPos += 5;

        const equipmentData = equipmentBreakdown.map((row) => [
          row.item_name,
          row.quantity.toString(),
          formatCurrencyForPDF(row.unit_cost),
          formatCurrencyForPDF(row.quantity * row.unit_cost),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Item", "Quantity", "Unit Cost", "Total"]],
          body: equipmentData,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);
        doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: "right" });
      }

      doc.save(fileName);
    };

    const generateFinancialStatementPDF = (project, budgetData, fileName) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("FINANCIAL STATEMENT", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(12);
      doc.text(project.title, 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Project No: ${project.project_no}`, 20, yPos);
      yPos += 5;
      doc.text(`As of: ${formatDate(asOfDate)}`, 20, yPos);
      yPos += 10;

      const tableData = budgetData.data.map((row) => [
        row.head.toUpperCase(),
        formatCurrencyForPDF(row.approved_budget),
        formatCurrencyForPDF(row.funds_received),
        formatCurrencyForPDF(row.total_expenditure),
        formatCurrencyForPDF(row.funds_received - row.total_expenditure),
        `${((row.total_expenditure / row.funds_received) * 100 || 0).toFixed(
          1
        )}%`,
      ]);

      // Add totals
      const totals = budgetData.data.reduce(
        (acc, row) => ({
          budget: acc.budget + row.approved_budget,
          funds: acc.funds + row.funds_received,
          exp: acc.exp + row.total_expenditure,
        }),
        { budget: 0, funds: 0, exp: 0 }
      );

      tableData.push([
        "TOTAL",
        formatCurrencyForPDF(totals.budget),
        formatCurrencyForPDF(totals.funds),
        formatCurrencyForPDF(totals.exp),
        formatCurrencyForPDF(totals.funds - totals.exp),
        `${((totals.exp / totals.funds) * 100 || 0).toFixed(1)}%`,
      ]);

      doc.autoTable({
        startY: yPos,
        head: [["Head", "Budget", "Received", "Spent", "Balance", "Util %"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        foot: [],
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      doc.save(fileName);
    };

    const generateAllProjectsReportPDF = (reportData, fileName) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("ALL PROJECTS FINANCIAL REPORT", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`As of: ${formatDate(asOfDate)}`, 20, yPos);
      yPos += 10;

      const tableData = reportData.data.map((row) => [
        row.project_no,
        row.title.substring(0, 30),
        formatCurrencyForPDF(row.approved_budget),
        formatCurrencyForPDF(row.total_funds_received),
        formatCurrencyForPDF(row.total_expenditure),
        formatCurrencyForPDF(row.unspent_balance),
      ]);

      doc.autoTable({
        startY: yPos,
        head: [
          ["Project No", "Title", "Budget", "Received", "Spent", "Balance"],
        ],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          1: { cellWidth: 50 },
        },
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      doc.save(fileName);
    };

    const generateGroupWiseReportPDF = (reportData, fileName) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("TECHNICAL GROUP-WISE REPORT", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`As of: ${formatDate(asOfDate)}`, 20, yPos);
      yPos += 10;

      Object.entries(reportData.data).forEach(([groupName, groupData]) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(groupName, 20, yPos);
        yPos += 5;

        const tableData = groupData.map((row) => [
          row.head.toUpperCase(),
          formatCurrencyForPDF(row.approved_budget),
          formatCurrencyForPDF(row.funds_received),
          formatCurrencyForPDF(row.total_expenditure),
          formatCurrencyForPDF(row.funds_balance),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Head", "Budget", "Received", "Spent", "Balance"]],
          body: tableData,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
        });

        yPos = doc.lastAutoTable.finalY + 10;
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      doc.save(fileName);
    };

    const generateAgencyWiseReportPDF = (reportData, fileName) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("FUNDING AGENCY-WISE REPORT", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`As of: ${formatDate(asOfDate)}`, 20, yPos);
      yPos += 10;

      Object.entries(reportData.data).forEach(([agencyName, agencyData]) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(agencyName, 20, yPos);
        yPos += 5;

        const tableData = agencyData.map((row) => [
          row.head.toUpperCase(),
          formatCurrencyForPDF(row.approved_budget),
          formatCurrencyForPDF(row.funds_received),
          formatCurrencyForPDF(row.total_expenditure),
          formatCurrencyForPDF(row.funds_balance),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Head", "Budget", "Received", "Spent", "Balance"]],
          body: tableData,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
        });

        yPos = doc.lastAutoTable.finalY + 10;
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      doc.save(fileName);
    };

    const generateExpenditureDetailPDF = (
      project,
      [manpower, equipment, expenditure],
      fileName
    ) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("EXPENDITURE DETAIL REPORT", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(12);
      doc.text(project.title, 20, yPos);
      yPos += 10;

      // Manpower
      if (manpower.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Manpower Expenditure", 20, yPos);
        yPos += 5;

        const manpowerData = manpower.map((row) => [
          row.role,
          formatDate(row.date_incurred),
          formatCurrencyForPDF(row.salary_per_month),
          row.months.toString(),
          row.num_personnel.toString(),
          formatCurrencyForPDF(
            row.salary_per_month * row.months * row.num_personnel
          ),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Role", "Date", "Salary/Mo", "Months", "Count", "Total"]],
          body: manpowerData,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Equipment
      if (equipment.length > 0) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Equipment Expenditure", 20, yPos);
        yPos += 5;

        const equipmentData = equipment.map((row) => [
          row.name,
          formatDate(row.purchase_date),
          row.quantity.toString(),
          formatCurrencyForPDF(row.unit_cost),
          formatCurrencyForPDF(row.quantity * row.unit_cost),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Item", "Date", "Qty", "Unit Cost", "Total"]],
          body: equipmentData,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Other Expenditure
      if (expenditure.length > 0) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Other Expenditure", 20, yPos);
        yPos += 5;

        const expData = expenditure.map((row) => [
          row.head.toUpperCase(),
          formatDate(row.date_incurred),
          formatCurrencyForPDF(row.amount),
          row.description || "",
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Head", "Date", "Amount", "Description"]],
          body: expData,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
          columnStyles: {
            3: { cellWidth: 60 },
          },
        });
      }

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      doc.save(fileName);
    };

    const generateFundsReceivedPDF = (project, fundsData, fileName) => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("FUNDS RECEIVED REPORT", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(12);
      doc.text(project.title, 20, yPos);
      yPos += 10;

      const tableData = fundsData.map((row) => [
        row.head.toUpperCase(),
        formatDate(row.date_received),
        formatCurrencyForPDF(row.amount),
        row.remarks || "",
      ]);

      // Calculate total
      const total = fundsData.reduce((sum, row) => sum + row.amount, 0);
      tableData.push(["TOTAL", "", formatCurrencyForPDF(total), ""]);

      doc.autoTable({
        startY: yPos,
        head: [["Head", "Date Received", "Amount", "Remarks"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          3: { cellWidth: 60 },
        },
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      doc.save(fileName);
    };

    const reportTypes = [
      {
        value: "project-summary",
        label: "Project Summary Report",
        needsProject: true,
      },
      {
        value: "financial-statement",
        label: "Financial Statement",
        needsProject: true,
      },
      {
        value: "expenditure-detail",
        label: "Detailed Expenditure Report",
        needsProject: true,
      },
      {
        value: "funds-received",
        label: "Funds Received Report",
        needsProject: true,
      },
      {
        value: "all-projects",
        label: "All Projects Summary",
        needsProject: false,
      },
      {
        value: "group-wise",
        label: "Technical Group-wise Report",
        needsProject: false,
      },
      {
        value: "agency-wise",
        label: "Funding Agency-wise Report",
        needsProject: false,
      },
    ];

    const selectedReportConfig = reportTypes.find(
      (r) => r.value === reportType
    );

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Generate Reports
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setSelectedProject(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedReportConfig?.needsProject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject?.project_id || ""}
                  onChange={(e) => {
                    const proj = projects.find(
                      (p) => p.project_id === parseInt(e.target.value)
                    );
                    setSelectedProject(proj);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((proj) => (
                    <option key={proj.project_id} value={proj.project_id}>
                      {proj.project_no} - {proj.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                As of Date
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={generatePDF}
            disabled={
              loading ||
              (selectedReportConfig?.needsProject && !selectedProject)
            }
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
          >
            <Download className="w-5 h-5 mr-2" />
            Generate PDF Report
          </button>
        </div>

        {/* Report Descriptions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Report Descriptions
          </h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900">
                Project Summary Report
              </h4>
              <p className="text-sm text-gray-600">
                Complete project overview with budget breakdown and detailed
                manpower/equipment allocation
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900">Financial Statement</h4>
              <p className="text-sm text-gray-600">
                Comprehensive financial status showing budget, funds received,
                expenditure, and utilization percentages
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium text-gray-900">
                Detailed Expenditure Report
              </h4>
              <p className="text-sm text-gray-600">
                Complete breakdown of all expenditures including manpower,
                equipment, and other budget heads with dates
              </p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium text-gray-900">
                Funds Received Report
              </h4>
              <p className="text-sm text-gray-600">
                Chronological record of all funds received by budget head with
                dates and remarks
              </p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium text-gray-900">
                All Projects Summary
              </h4>
              <p className="text-sm text-gray-600">
                Consolidated view of all projects with their financial status
                and balances
              </p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-medium text-gray-900">
                Technical Group-wise Report
              </h4>
              <p className="text-sm text-gray-600">
                Budget summary grouped by technical groups across all projects
              </p>
            </div>
            <div className="border-l-4 border-pink-500 pl-4">
              <h4 className="font-medium text-gray-900">
                Funding Agency-wise Report
              </h4>
              <p className="text-sm text-gray-600">
                Budget summary grouped by funding agencies across all projects
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ErrorDisplay />
      <NavigationTabs />
      <LoadingSpinner />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {currentView === VIEWS.PROJECTS && <ProjectsView />}
        {currentView === VIEWS.BUDGET_BREAKDOWN && <BudgetBreakdownView />}
        {currentView === VIEWS.ANALYTICS && <AnalyticsView />}
        {currentView === VIEWS.REPORTS && <ReportsView />}
      </main>
      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          fundingAgencies={fundingAgencies}
          technicalGroups={technicalGroups}
          onSuccess={async () => {
            setShowAddProject(false);
            const [projectsData, statsData] = await Promise.all([
              apiGet("/projects"),
              apiGet("/dashboard/stats"),
            ]);
            setProjects(projectsData);
            setStats({
              totalProjects: statsData.total_projects,
              activeProjects: statsData.active_projects,
              totalAllocation: statsData.total_allocation,
              totalFunds: statsData.total_funds,
              totalExpenditure: statsData.total_expenditure,
              balance: statsData.balance,
            });
          }}
        />
      )}
      {selectedProject && (
        <ProjectDetailsView
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={async () => {
            const [projectsData, statsData] = await Promise.all([
              apiGet("/projects"),
              apiGet("/dashboard/stats"),
            ]);
            setProjects(projectsData);
            setStats({
              totalProjects: statsData.total_projects,
              activeProjects: statsData.active_projects,
              totalAllocation: statsData.total_allocation,
              totalFunds: statsData.total_funds,
              totalExpenditure: statsData.total_expenditure,
              balance: statsData.balance,
            });
          }}
        />
      )}
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 flex items-center space-x-3 shadow-xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user?.full_name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user?.role}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <ProjectDashboard />
    </div>
  );
};

// MAIN APP WITH AUTH PROVIDER

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
