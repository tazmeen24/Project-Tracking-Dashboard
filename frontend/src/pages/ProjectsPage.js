// pages/ProjectsPage.js
import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  X,
  Eye,
  Edit,
  Trash2,
  Wallet,
  MoreVertical,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts/ProjectContext";
import projectService from "../services/projectService";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import { formatCurrency } from "../utils/helpers";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const {
    projects,
    loading,
    refreshProjects,
    fundingAgencies,
    technicalGroups,
  } = useProject();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Add Fund/Expenditure modals
  const [showAddFund, setShowAddFund] = useState(false);
  const [showAddExpenditure, setShowAddExpenditure] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filter states
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getAvailableYears = () => {
    const years = new Set();
    projects.forEach((project) => {
      years.add(new Date(project.start_date).getFullYear());
      if (project.end_date) {
        years.add(new Date(project.end_date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getProjectStatus = (project) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = project.end_date ? new Date(project.end_date) : null;
    if (startDate > now) return "Upcoming";
    if (endDate && endDate < now) return "Completed";
    return "Active";
  };

  const getTotalAllocation = (project) => {
    return project.total_allocation || 0;
  };

  const getTotalExpenditure = (project) => {
    return project.total_expenditure || 0;
  };

  const getTotalFundsReceived = (project) => {
    return project.total_funds_received || 0;
  };

  const projectList = Array.isArray(projects) ? projects : [];
  
  // Filter logic
  const filteredProjects = projectList.filter((project) => {
    const matchesSearch =
      project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_no?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || project.project_category === filterCategory;
    const matchesType =
      filterType === "all" || project.project_type === filterType;
    const matchesAgency =
      filterAgency === "all" ||
      project.funding_agency_id === parseInt(filterAgency);
    const matchesGroup =
      filterGroup === "all" ||
      project.technical_group_id === parseInt(filterGroup);

    const matchesYear =
      filterYear === "all" ||
      new Date(project.start_date).getFullYear() === parseInt(filterYear) ||
      (project.end_date &&
        new Date(project.end_date).getFullYear() === parseInt(filterYear));

    const matchesMonth =
      filterMonth === "all" ||
      new Date(project.start_date).getMonth() + 1 === parseInt(filterMonth) ||
      (project.end_date &&
        new Date(project.end_date).getMonth() + 1 === parseInt(filterMonth));

    let matchesDateRange = true;
    if (dateRangeStart && dateRangeEnd) {
      const startDate = new Date(project.start_date);
      const rangeStart = new Date(dateRangeStart);
      const rangeEnd = new Date(dateRangeEnd);
      matchesDateRange = startDate >= rangeStart && startDate <= rangeEnd;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesType &&
      matchesAgency &&
      matchesGroup &&
      matchesYear &&
      matchesMonth &&
      matchesDateRange
    );
  });

  const activeFilterCount = [
    filterCategory !== "all",
    filterType !== "all",
    filterAgency !== "all",
    filterGroup !== "all",
    filterYear !== "all",
    filterMonth !== "all",
    dateRangeStart && dateRangeEnd,
  ].filter(Boolean).length;

  const handleDelete = async (e, project) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
      try {
        await projectService.deleteProject(project.project_id);
        refreshProjects();
      } catch (error) {
        console.error('Delete error:', error);
        alert("Failed to delete project");
      }
    }
    setOpenDropdown(null);
  };

  const handleAddFund = (project) => {
    setSelectedProject(project);
    setShowAddFund(true);
  };

  const handleAddExpenditure = (project) => {
    setSelectedProject(project);
    setShowAddExpenditure(true);
  };

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterType("all");
    setFilterAgency("all");
    setFilterGroup("all");
    setFilterYear("all");
    setFilterMonth("all");
    setDateRangeStart("");
    setDateRangeEnd("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Manage and track all research projects
          </p>
        </div>
        <Button onClick={() => navigate("/projects/new")} icon={Plus}>
          New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by project title or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                showFilters
                  ? "bg-slate-900 dark:bg-slate-700 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-slate-700 dark:bg-slate-500 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="font-medium">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="sponsored">Sponsored</option>
                <option value="non-sponsored">Non-Sponsored</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="PFMS">PFMS</option>
                <option value="NON-PFMS">NON-PFMS</option>
                <option value="contract-research">Contract Research</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Funding Agency
              </label>
              <select
                value={filterAgency}
                onChange={(e) => setFilterAgency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Agencies</option>
                {fundingAgencies.map((agency) => (
                  <option key={agency.agency_id} value={agency.agency_id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Technical Group
              </label>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Groups</option>
                {technicalGroups.map((group) => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Year
              </label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Years</option>
                {getAvailableYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Month
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Months</option>
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((month, idx) => (
                  <option key={idx} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date Range
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <span className="text-slate-500 dark:text-slate-400">to</span>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Table */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Project Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Category & Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Investigators
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Timeline
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Financials
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  const totalAllocation = getTotalAllocation(project);
                  const totalExpenditure = getTotalExpenditure(project);
                  const totalFunds = getTotalFundsReceived(project);
                  const status = getProjectStatus(project);

                  return (
                    <tr
                      key={project.project_id}
                      onClick={() =>
                        navigate(`/projects/${project.project_id}`)
                      }
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      {/* Project Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1 truncate">
                              {project.title}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                              {project.project_no}
                            </div>
                            <div className="mt-2">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                  status === "Active"
                                    ? "bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50"
                                    : status === "Upcoming"
                                    ? "bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50"
                                    : "bg-slate-100/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                                }`}
                              >
                                {status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Type */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {project.project_category && (
                            <div className="inline-block px-2.5 py-1 bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded border border-blue-200/50 dark:border-blue-900/50">
                              {project.project_category}
                            </div>
                          )}
                          {project.project_type && (
                            <div className="inline-block px-2.5 py-1 bg-purple-100/80 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-xs font-medium rounded ml-1 border border-purple-200/50 dark:border-purple-900/50">
                              {project.project_type}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white font-medium mb-1">
                          {project.funding_agency_name || "N/A"}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {project.technical_group_name || "N/A"}
                        </div>
                      </td>

                      {/* Investigators */}
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900 dark:text-white mb-0.5">
                            {project.principal_investigator || "N/A"}
                          </div>
                          {project.co_investigator && (
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              Co-PI: {project.co_investigator}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="text-slate-900 dark:text-white">
                            {new Date(project.start_date).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">to</div>
                          <div className="text-slate-900 dark:text-white">
                            {project.end_date
                              ? new Date(project.end_date).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "Ongoing"}
                          </div>
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              Budget:
                            </span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {formatCurrency(totalAllocation)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              Funds:
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(totalFunds)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              Spent:
                            </span>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(totalExpenditure)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.project_id}/installments`)
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors"
                          >
                            + Fund
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddExpenditure(project);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-xs font-medium rounded transition-colors"
                          >
                            + Exp
                          </button>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(
                                  openDropdown === project.project_id
                                    ? null
                                    : project.project_id
                                );
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>

                            {openDropdown === project.project_id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.project_id}`);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/projects/${project.project_id}/edit`
                                    );
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                  <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/projects/${project.project_id}/finances`
                                    );
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                  <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Manage Finances</span>
                                </button>
                                <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                                <button
                                  onClick={(e) => handleDelete(e, project)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-slate-600 dark:text-slate-400"
                  >
                    {searchTerm || activeFilterCount > 0
                      ? "No projects match your filters"
                      : "No projects found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expenditure Modal */}
      <AddExpenditureModal
        isOpen={showAddExpenditure}
        onClose={() => setShowAddExpenditure(false)}
        project={selectedProject}
        onSuccess={() => {
          refreshProjects();
          setShowAddExpenditure(false);
        }}
      />
    </div>
  );
};

// Add Expenditure Modal Component with proper routing to correct endpoints
const AddExpenditureModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [formData, setFormData] = useState({
    head: "manpower",
    amount: "",
    date_incurred: "",
    description: "",
  });

  const [manpowerData, setManpowerData] = useState([
    { role: "", salary_per_month: "", months: 12, num_personnel: 1 },
  ]);

  const [equipmentData, setEquipmentData] = useState([
    { name: "", quantity: 1, unit_cost: "", purchase_date: "" },
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
      return manpowerData.reduce((sum, item) => {
        const amount =
          (parseFloat(item.salary_per_month) || 0) *
          (parseInt(item.months) || 0) *
          (parseInt(item.num_personnel) || 0);
        return sum + amount;
      }, 0);
    } else if (formData.head === "equipment") {
      return equipmentData.reduce((sum, item) => {
        const amount =
          (parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity) || 0);
        return sum + amount;
      }, 0);
    }
    return parseFloat(formData.amount) || 0;
  };

  const addManpowerRow = () => {
    setManpowerData([
      ...manpowerData,
      { role: "", salary_per_month: "", months: 12, num_personnel: 1 },
    ]);
  };

  const removeManpowerRow = (index) => {
    setManpowerData(manpowerData.filter((_, i) => i !== index));
  };

  const handleManpowerRoleSelect = (index, role) => {
    const approved = approvedManpower.find((m) => m.role === role);
    if (approved) {
      const updated = [...manpowerData];
      updated[index] = {
        role: approved.role,
        salary_per_month: approved.salary_per_month,
        months: approved.months,
        num_personnel: approved.num_personnel,
      };
      setManpowerData(updated);
    } else {
      updateManpowerRow(index, "role", role);
    }
  };

  const updateManpowerRow = (index, field, value) => {
    const updated = [...manpowerData];
    updated[index][field] = value;
    setManpowerData(updated);
  };

  const addEquipmentRow = () => {
    setEquipmentData([
      ...equipmentData,
      {
        name: "",
        quantity: 1,
        unit_cost: "",
        purchase_date: formData.date_incurred,
      },
    ]);
  };

  const removeEquipmentRow = (index) => {
    setEquipmentData(equipmentData.filter((_, i) => i !== index));
  };

  const handleEquipmentSelect = (index, itemName) => {
    const approved = approvedEquipment.find((e) => e.item_name === itemName);
    if (approved) {
      const updated = [...equipmentData];
      updated[index] = {
        name: approved.item_name,
        quantity: approved.quantity,
        unit_cost: approved.unit_cost,
        purchase_date: formData.date_incurred,
      };
      setEquipmentData(updated);
    } else {
      updateEquipmentRow(index, "name", itemName);
    }
  };

  const updateEquipmentRow = (index, field, value) => {
    const updated = [...equipmentData];
    updated[index][field] = value;
    setEquipmentData(updated);
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.head) newErrors.push("Budget head is required");
    if (!formData.date_incurred) newErrors.push("Date incurred is required");

    const totalAmount = calculateTotalAmount();

    if (formData.head === "manpower") {
      if (manpowerData.length === 0) {
        newErrors.push("At least one manpower entry is required");
      }
      manpowerData.forEach((item, idx) => {
        if (!item.role) newErrors.push(`Row ${idx + 1}: Role is required`);
        if (!item.salary_per_month || item.salary_per_month <= 0)
          newErrors.push(`Row ${idx + 1}: Valid salary is required`);
        if (!item.months || item.months <= 0)
          newErrors.push(`Row ${idx + 1}: Valid months is required`);
        if (!item.num_personnel || item.num_personnel <= 0)
          newErrors.push(`Row ${idx + 1}: Valid personnel count is required`);
      });
    } else if (formData.head === "equipment") {
      if (equipmentData.length === 0) {
        newErrors.push("At least one equipment entry is required");
      }
      equipmentData.forEach((item, idx) => {
        if (!item.name) newErrors.push(`Row ${idx + 1}: Item name is required`);
        if (!item.quantity || item.quantity <= 0)
          newErrors.push(`Row ${idx + 1}: Valid quantity is required`);
        if (!item.unit_cost || item.unit_cost <= 0)
          newErrors.push(`Row ${idx + 1}: Valid unit cost is required`);
      });
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

  // Route to correct endpoints based on head type
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setWarnings([]);

    if (!validateForm()) return;

    setLoading(true);

    try {
      let collectedWarnings = [];

      // ---------------------------------------------------
      // MANPOWER
      // ---------------------------------------------------
      if (formData.head === "manpower") {
        for (const item of manpowerData) {
          const response = await projectService.addManpower({
            project_id: project.project_id,
            role: item.role,
            salary_per_month: parseFloat(item.salary_per_month),
            months: parseInt(item.months),
            num_personnel: parseInt(item.num_personnel),
            date_incurred: formData.date_incurred,
          });

          if (response?.warnings?.length > 0) {
            collectedWarnings.push(...response.warnings);
          }
        }
      }

      // ---------------------------------------------------
      // EQUIPMENT
      // ---------------------------------------------------
      else if (formData.head === "equipment") {
        for (const item of equipmentData) {
          const response = await projectService.addEquipment({
            project_id: project.project_id,
            name: item.name,
            quantity: parseInt(item.quantity),
            unit_cost: parseFloat(item.unit_cost),
            purchase_date: item.purchase_date || formData.date_incurred,
          });

          if (response?.warnings?.length > 0) {
            collectedWarnings.push(...response.warnings);
          }
        }
      }

      // ---------------------------------------------------
      // OTHER HEADS → expenditure endpoint
      // ---------------------------------------------------
      else {
        const response = await projectService.addExpenditure({
          project_id: project.project_id,
          head: formData.head,
          amount: parseFloat(formData.amount),
          date_incurred: formData.date_incurred,
          description: formData.description,
        });

        if (response?.warnings?.length > 0) {
          collectedWarnings.push(...response.warnings);
        }
      }

      // Update warnings state after all API calls
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
        "Failed to record expenditure";

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
    setManpowerData([
      { role: "", salary_per_month: "", months: 12, num_personnel: 1 },
    ]);
    setEquipmentData([
      { name: "", quantity: 1, unit_cost: "", purchase_date: "" },
    ]);
    setErrors([]);
    setWarnings([]);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!project) return null;

  const totalAmount = calculateTotalAmount();
  const budget = getBudgetForHead(formData.head);
  const needsBreakdown =
    formData.head === "manpower" || formData.head === "equipment";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Expenditure"
      size="lg"
    >
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
              onChange={(e) =>
                setFormData({ ...formData, head: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              required
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
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                + Add Row
              </button>
            </div>

            <div className="space-y-2">
              {manpowerData.map((item, idx) => (
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
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="">Select Role</option>
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
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mt-1"
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
                      value={item.months}
                      onChange={(e) =>
                        updateManpowerRow(idx, "months", e.target.value)
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
                      value={item.num_personnel}
                      onChange={(e) =>
                        updateManpowerRow(idx, "num_personnel", e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    {manpowerData.length > 1 && (
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
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                + Add Row
              </button>
            </div>

            <div className="space-y-2">
              {equipmentData.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="block text-xs text-slate-600 mb-1">
                      Item Name
                    </label>
                    <select
                      value={item.name}
                      onChange={(e) =>
                        handleEquipmentSelect(idx, e.target.value)
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
                      <option value="__custom__">+ Add Custom Equipment</option>
                    </select>
                    {item.name === "__custom__" && (
                      <input
                        type="text"
                        placeholder="Enter custom equipment"
                        onChange={(e) =>
                          updateEquipmentRow(idx, "name", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mt-1"
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
                      value={item.unit_cost}
                      onChange={(e) =>
                        updateEquipmentRow(idx, "unit_cost", e.target.value)
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
                        (item.unit_cost || 0) * (item.quantity || 0)
                      ).toLocaleString()}
                    </span>
                    {equipmentData.length > 1 && (
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
            {loading ? "Saving..." : "Save Expenditure"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectsPage;
