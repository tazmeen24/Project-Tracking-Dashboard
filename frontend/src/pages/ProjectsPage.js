// pages/ProjectsPage.js
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, X, Calendar, Eye, Edit, Trash2, MoreVertical, DollarSign, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import ProjectForm from '../components/projects/ProjectForm';
import { formatCurrency } from '../utils/helpers';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { projects, loading, refreshProjects, fundingAgencies, technicalGroups } = useProject();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Add Fund/Expenditure modals
  const [showAddFund, setShowAddFund] = useState(false);
  const [showAddExpenditure, setShowAddExpenditure] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filter states
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAgency, setFilterAgency] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getAvailableYears = () => {
    const years = new Set();
    projects.forEach(project => {
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
    if (startDate > now) return 'Upcoming';
    if (endDate && endDate < now) return 'Completed';
    return 'Active';
  };

  const getTotalAllocation = (project) => {
    if (project.planned_allocation !== undefined) {
      return project.planned_allocation;
    }
    return (
      (project.manpower_allocation || 0) +
      (project.equipment_allocation || 0) +
      (project.consumables_allocation || 0) +
      (project.contingency_allocation || 0) +
      (project.travel_training_allocation || 0) +
      (project.overhead_allocation || 0)
    );
  };

  const getTotalExpenditure = (project) => {
    return project.actual_expenditure || 0;
  };

  const getTotalFundsReceived = (project) => {
    return project.funds_received || 0;
  };

  // Filter logic
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_no.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || project.project_category === filterCategory;
    const matchesType = filterType === 'all' || project.project_type === filterType;
    const matchesStatus = filterStatus === 'all' || getProjectStatus(project).toLowerCase() === filterStatus.toLowerCase();
    const matchesAgency = filterAgency === 'all' || project.funding_agency_id === parseInt(filterAgency);
    const matchesGroup = filterGroup === 'all' || project.technical_group_id === parseInt(filterGroup);

    const matchesYear = filterYear === 'all' || (() => {
      const startYear = new Date(project.start_date).getFullYear();
      const endYear = project.end_date ? new Date(project.end_date).getFullYear() : startYear;
      return parseInt(filterYear) >= startYear && parseInt(filterYear) <= endYear;
    })();

    const matchesMonth = filterMonth === 'all' || (() => {
      const selectedMonth = parseInt(filterMonth);
      const checkYear = filterYear !== 'all' ? parseInt(filterYear) : new Date().getFullYear();
      const checkDate = new Date(checkYear, selectedMonth - 1, 1);
      const startDate = new Date(project.start_date);
      const endDate = project.end_date ? new Date(project.end_date) : new Date();
      return checkDate >= startDate && checkDate <= endDate;
    })();

    const matchesDateRange = (() => {
      if (!dateRangeStart && !dateRangeEnd) return true;
      const startDate = new Date(project.start_date);
      const endDate = project.end_date ? new Date(project.end_date) : new Date();
      
      if (dateRangeStart && dateRangeEnd) {
        const rangeStart = new Date(dateRangeStart);
        const rangeEnd = new Date(dateRangeEnd);
        return startDate <= rangeEnd && endDate >= rangeStart;
      } else if (dateRangeStart) {
        return endDate >= new Date(dateRangeStart);
      } else if (dateRangeEnd) {
        return startDate <= new Date(dateRangeEnd);
      }
      return true;
    })();

    return matchesSearch && matchesCategory && matchesType && matchesStatus && 
           matchesAgency && matchesGroup && matchesYear && matchesMonth && matchesDateRange;
  });

  const clearAllFilters = () => {
    setFilterCategory('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterAgency('all');
    setFilterGroup('all');
    setFilterYear('all');
    setFilterMonth('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSearchTerm('');
  };

  const activeFilterCount = [
    filterCategory !== 'all',
    filterType !== 'all',
    filterStatus !== 'all',
    filterAgency !== 'all',
    filterGroup !== 'all',
    filterYear !== 'all',
    filterMonth !== 'all',
    dateRangeStart !== '',
    dateRangeEnd !== '',
  ].filter(Boolean).length;

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
    setOpenDropdown(null);
  };

  const handleDelete = (project) => {
    if (window.confirm(`Delete "${project.title}"? This cannot be undone.`)) {
      console.log('Delete project:', project.project_id);
    }
    setOpenDropdown(null);
  };

  const handleAddFund = (project) => {
    setSelectedProject(project);
    setShowAddFund(true);
    setOpenDropdown(null);
  };

  const handleAddExpenditure = (project) => {
    setSelectedProject(project);
    setShowAddExpenditure(true);
    setOpenDropdown(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-700 font-medium text-lg">Loading projects...</div>
      </div>
    );
  }

  const availableYears = getAvailableYears();

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

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
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
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All</option>
                  <option value="sponsored">Sponsored</option>
                  <option value="non-sponsored">Non-Sponsored</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All</option>
                  <option value="PFMS">PFMS</option>
                  <option value="NON-PFMS">NON-PFMS</option>
                  <option value="contract-research">Contract Research</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Agency</label>
                <select value={filterAgency} onChange={(e) => setFilterAgency(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All</option>
                  {fundingAgencies.map((agency) => (
                    <option key={agency.agency_id} value={agency.agency_id}>{agency.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Group</label>
                <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All</option>
                  {technicalGroups.map((group) => (
                    <option key={group.group_id} value={group.group_id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />Year
                </label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="all">All Months</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <option key={idx} value={idx + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
                <input type="date" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
                <input type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" icon={X} onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-600">
        Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> projects
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Project Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Category & Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Investigators
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Timeline
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Financials
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  const status = getProjectStatus(project);
                  const totalAllocation = getTotalAllocation(project);
                  const totalExpenditure = getTotalExpenditure(project);
                  const totalFunds = getTotalFundsReceived(project);

                  const statusColors = {
                    Active: 'bg-emerald-100 text-emerald-800',
                    Completed: 'bg-slate-100 text-slate-800',
                    Upcoming: 'bg-blue-100 text-blue-800',
                  };

                  return (
                    <tr key={project.project_id} className="hover:bg-slate-50 transition-colors">
                      {/* Project Info */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 mb-1">{project.title}</div>
                        <div className="text-xs text-slate-500 mb-2">{project.project_no}</div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                          {status}
                        </span>
                      </td>

                      {/* Category & Type */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {project.project_category}
                          </div>
                          <div className="inline-block px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded ml-1">
                            {project.project_type}
                          </div>
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 font-medium mb-1">
                          {project.funding_agency_name || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-600">
                          {project.technical_group_name || 'N/A'}
                        </div>
                      </td>

                      {/* Investigators */}
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900 mb-0.5">
                            {project.principal_investigator || 'N/A'}
                          </div>
                          {project.co_investigator && (
                            <div className="text-xs text-slate-600">
                              Co-PI: {project.co_investigator}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="text-slate-900">
                            {new Date(project.start_date).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </div>
                          <div className="text-slate-600">
                            to
                          </div>
                          <div className="text-slate-900">
                            {project.end_date 
                              ? new Date(project.end_date).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })
                              : 'Ongoing'}
                          </div>
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-medium">Budget:</span>
                            <span className="font-semibold text-blue-600">{formatCurrency(totalAllocation)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-medium">Funds:</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(totalFunds)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-medium">Spent:</span>
                            <span className="font-semibold text-red-600">{formatCurrency(totalExpenditure)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFund(project);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            + Fund
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddExpenditure(project);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            + Exp
                          </button>
                          
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === project.project_id ? null : project.project_id);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {openDropdown === project.project_id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                                <button
                                  onClick={() => navigate(`/projects/${project.project_id}`)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleEdit(project)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <div className="border-t border-slate-200 my-1"></div>
                                <button
                                  onClick={() => handleDelete(project)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-600">
                    {searchTerm || activeFilterCount > 0 ? 'No projects match your filters' : 'No projects found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={() => {
          refreshProjects();
          handleFormClose();
        }}
        editProject={editingProject}
      />

      {/* Add Fund Modal */}
      <AddFundModal
        isOpen={showAddFund}
        onClose={() => setShowAddFund(false)}
        project={selectedProject}
        onSuccess={() => {
          refreshProjects();
          setShowAddFund(false);
        }}
      />

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

// Add Fund Modal Component
const AddFundModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    date_received: '',
    reference_no: '',
    remarks: '',
  });

  if (!project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: API call to save fund
    console.log('Add fund:', { project_id: project.project_id, ...formData });
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Fund Received" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="text-sm font-semibold text-slate-900 mb-1">{project.title}</div>
          <div className="text-xs text-slate-600">{project.project_no}</div>
        </div>

        <Input
          label="Amount Received"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          placeholder="Enter amount in rupees"
        />

        <Input
          label="Date Received"
          type="date"
          value={formData.date_received}
          onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
          required
        />

        <Input
          label="Reference Number"
          value={formData.reference_no}
          onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
          placeholder="Transaction or cheque reference"
        />

        <Input
          label="Remarks (Optional)"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="Additional notes"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" icon={DollarSign}>Save Fund Entry</Button>
        </div>
      </form>
    </Modal>
  );
};

// Add Expenditure Modal Component
const AddExpenditureModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [formData, setFormData] = useState({
    head: 'manpower',
    amount: '',
    date_incurred: '',
    description: '',
    invoice_no: '',
  });

  if (!project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: API call to save expenditure
    console.log('Add expenditure:', { project_id: project.project_id, ...formData });
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Expenditure" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="text-sm font-semibold text-slate-900 mb-1">{project.title}</div>
          <div className="text-xs text-slate-600">{project.project_no}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Budget Head</label>
          <select
            value={formData.head}
            onChange={(e) => setFormData({ ...formData, head: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
            required
          >
            <option value="manpower">Manpower</option>
            <option value="equipment">Equipment</option>
            <option value="consumables">Consumables</option>
            <option value="travel & training">Travel & Training</option>
            <option value="contingency">Contingency</option>
            <option value="overhead">Overhead</option>
          </select>
        </div>

        <Input
          label="Amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          placeholder="Enter amount in rupees"
        />

        <Input
          label="Date Incurred"
          type="date"
          value={formData.date_incurred}
          onChange={(e) => setFormData({ ...formData, date_incurred: e.target.value })}
          required
        />

        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          placeholder="What was purchased or paid for"
        />

        <Input
          label="Invoice/Bill Number (Optional)"
          value={formData.invoice_no}
          onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
          placeholder="Invoice or bill reference"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" type="submit" icon={TrendingDown}>Save Expenditure</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectsPage;