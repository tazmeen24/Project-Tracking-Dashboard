// pages/ProjectsPage.js
import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ProjectForm from '../components/projects/ProjectForm';
import { formatCurrency } from '../utils/helpers';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { projects, loading, refreshProjects, fundingAgencies, technicalGroups } = useProject();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAgency, setFilterAgency] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');

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
      filterCategory === 'all' || project.project_category === filterCategory;

    // Type filter
    const matchesType =
      filterType === 'all' || project.project_type === filterType;

    // Status filter
    const matchesStatus = filterStatus === 'all' || (() => {
      const status = getProjectStatus(project);
      return status.toLowerCase() === filterStatus.toLowerCase();
    })();

    // Agency filter
    const matchesAgency =
      filterAgency === 'all' || project.funding_agency_id === parseInt(filterAgency);

    // Group filter
    const matchesGroup =
      filterGroup === 'all' || project.technical_group_id === parseInt(filterGroup);

    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesAgency && matchesGroup;
  });

  const getProjectStatus = (project) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = project.end_date ? new Date(project.end_date) : null;

    if (startDate > now) return 'Upcoming';
    if (endDate && endDate < now) return 'Completed';
    return 'Active';
  };

  const getTotalAllocation = (project) => {
    return (
      (project.manpower_allocation || 0) +
      (project.equipment_allocation || 0) +
      (project.consumables_allocation || 0) +
      (project.contingency_allocation || 0) +
      (project.travel_training_allocation || 0) +
      (project.overhead_allocation || 0)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-700 font-medium text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
          <p className="text-slate-600">Manage and track all your projects</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
          Create New Project
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-5 gap-3">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All</option>
              <option value="sponsored">Sponsored</option>
              <option value="non-sponsored">Non-Sponsored</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All</option>
              <option value="PFMS">PFMS</option>
              <option value="NON-PFMS">NON-PFMS</option>
              <option value="contract-research">Contract Research</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>

          {/* Agency Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Funding Agency</label>
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All</option>
              {fundingAgencies.map((agency) => (
                <option key={agency.agency_id} value={agency.agency_id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Technical Group</label>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All</option>
              {technicalGroups.map((group) => (
                <option key={group.group_id} value={group.group_id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-600">
        Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> projects
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => {
            const status = getProjectStatus(project);
            const statusColors = {
              Active: 'bg-emerald-100 text-emerald-800',
              Completed: 'bg-slate-100 text-slate-800',
              Upcoming: 'bg-blue-100 text-blue-800',
            };

            return (
              <Card
                key={project.project_id}
                hover
                onClick={() => navigate(`/projects/${project.project_id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  {/* Left: Project Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {project.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                        {status}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600 mb-3">
                      <span className="font-medium">{project.project_no}</span>
                      <span className="mx-2">•</span>
                      <span>Started: {new Date(project.start_date).toLocaleDateString('en-IN')}</span>
                    </div>

                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-lg">
                        {project.project_category}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-lg">
                        {project.project_type}
                      </span>
                    </div>
                  </div>

                  {/* Right: Budget */}
                  <div className="text-right">
                    <div className="text-sm text-slate-500 mb-1">Total Allocation</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(getTotalAllocation(project))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="text-center p-12">
            <div className="text-slate-600 mb-4">No projects found</div>
            <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
              Create Your First Project
            </Button>
          </Card>
        )}
      </div>

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          refreshProjects();
          setShowForm(false);
        }}
      />
    </div>
  );
};

export default ProjectsPage;