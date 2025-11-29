// pages/ProjectsPage.js
import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, X } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import Button from "../components/common/Button";
import ProjectForm from "../components/projects/ProjectForm";
import ProjectCard from "../components/projects/ProjectCard";
import ConfirmDialog from "../components/common/ConfirmDialog";
import projectService from "../services/projectService";

const ProjectsPage = () => {
  const {
    projects,
    loading,
    refreshProjects,
    fundingAgencies,
    technicalGroups,
  } = useProject();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    project: null,
  });
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Filter logic
  const filteredProjects = projects.filter((project) => {
    // Search
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_no.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory =
      filterCategory === "all" || project.project_category === filterCategory;

    // Type filter
    const matchesType =
      filterType === "all" || project.project_type === filterType;

    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      (() => {
        const now = new Date();
        const startDate = new Date(project.start_date);
        const endDate = project.end_date ? new Date(project.end_date) : null;

        if (filterStatus === "active") {
          return startDate <= now && (!endDate || endDate >= now);
        } else if (filterStatus === "completed") {
          return endDate && endDate < now;
        } else if (filterStatus === "upcoming") {
          return startDate > now;
        }
        return true;
      })();

    // Agency filter
    const matchesAgency =
      filterAgency === "all" ||
      project.funding_agency_id === parseInt(filterAgency);

    // Group filter
    const matchesGroup =
      filterGroup === "all" ||
      project.technical_group_id === parseInt(filterGroup);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesType &&
      matchesStatus &&
      matchesAgency &&
      matchesGroup
    );
  });

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = (project) => {
    setDeleteConfirm({ show: true, project });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.project) return;

    setDeleting(true);
    try {
      await projectService.deleteProject(deleteConfirm.project.project_id);
      await refreshProjects();
      setDeleteConfirm({ show: false, project: null });
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  const handleFormSuccess = async () => {
    await refreshProjects();
    handleFormClose();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("all");
    setFilterType("all");
    setFilterStatus("all");
    setFilterAgency("all");
    setFilterGroup("all");
  };

  const activeFilterCount = [
    filterCategory !== "all",
    filterType !== "all",
    filterStatus !== "all",
    filterAgency !== "all",
    filterGroup !== "all",
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="text-slate-700 font-medium text-lg">
            Loading projects...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
          <p className="text-slate-600 text-lg">
            Manage and track all your projects
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
          Create New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? "primary" : "secondary"}
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white text-slate-900 rounded-full text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Export */}
          <Button variant="secondary" icon={Download}>
            Export
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t border-slate-200 pt-4 mt-4 animate-slideDown">
            <div className="grid grid-cols-5 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">All Categories</option>
                  <option value="sponsored">Sponsored</option>
                  <option value="non-sponsored">Non-Sponsored</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">All Types</option>
                  <option value="PFMS">PFMS</option>
                  <option value="NON-PFMS">NON-PFMS</option>
                  <option value="contract-research">Contract Research</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              {/* Agency Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Funding Agency
                </label>
                <select
                  value={filterAgency}
                  onChange={(e) => setFilterAgency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">All Agencies</option>
                  {fundingAgencies.map((agency) => (
                    <option key={agency.agency_id} value={agency.agency_id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technical Group
                </label>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">All Groups</option>
                  {technicalGroups.map((group) => (
                    <option key={group.group_id} value={group.group_id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={clearFilters}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Showing{" "}
          <strong className="text-slate-900">{filteredProjects.length}</strong>{" "}
          of <strong className="text-slate-900">{projects.length}</strong>{" "}
          projects
        </span>
      </div>

      {/* Projects List */}
      <div className="grid gap-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <div
              key={project.project_id}
              style={{
                animation: `slideInRight 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              <ProjectCard
                project={project}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No projects found
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || activeFilterCount > 0
                ? "Try adjusting your search or filters"
                : "Get started by creating your first project"}
            </p>
            {searchTerm || activeFilterCount > 0 ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setShowForm(true)}
              >
                Create New Project
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editProject={editingProject}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, project: null })}
        onConfirm={confirmDelete}
        title="Delete Project?"
        message={`Are you sure you want to delete "${deleteConfirm.project?.title}"? This action cannot be undone and will delete all associated data.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProjectsPage;
