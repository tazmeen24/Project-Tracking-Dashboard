// frontend/src/pages/ReportsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  TrendingUp, 
  Building2, 
  Calendar,
  ChevronRight,
  BarChart3,
  PieChart,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import projectService from '../services/projectService';
import UCReportCard from '../components/reports/UCReportCard';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let data;
      if (typeof projectService.getAllProjects === 'function') {
        data = await projectService.getAllProjects();
      } else if (typeof projectService.getProjects === 'function') {
        data = await projectService.getProjects();
      } else if (typeof projectService.fetchProjects === 'function') {
        data = await projectService.fetchProjects();
      } else if (typeof projectService.list === 'function') {
        data = await projectService.list();
      } else {
        throw new Error('No suitable method found in projectService');
      }
      
      let projectList = [];
      if (Array.isArray(data)) {
        projectList = data;
      } else if (data && Array.isArray(data.projects)) {
        projectList = data.projects;
      } else if (data && Array.isArray(data.data)) {
        projectList = data.data;
      } else if (data && typeof data === 'object') {
        projectList = [data];
      } else {
        projectList = [];
      }
      
      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.message || 'Failed to fetch projects. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const reportCategories = [
    {
      id: 'project-reports',
      title: 'Project Reports',
      description: 'Generate comprehensive financial reports for individual projects',
      icon: FileText,
      color: 'blue',
      action: 'select-project',
      projects: projects
    },
    {
      id: 'financial-summary',
      title: 'Institutional Financial Summary',
      description: 'Overview of all projects and institutional finances',
      icon: TrendingUp,
      color: 'green',
      action: () => navigate('/financial-summary'),
      available: true
    },
    {
      id: 'department-reports',
      title: 'Department-wise Reports',
      description: 'Consolidated reports grouped by departments',
      icon: Building2,
      color: 'purple',
      action: null,
      available: false
    },
    {
      id: 'yearly-reports',
      title: 'Financial Year Reports',
      description: 'Year-end reports and FY comparisons',
      icon: Calendar,
      color: 'orange',
      action: null,
      available: false
    },
    {
      id: 'analytics-reports',
      title: 'Analytics & Insights',
      description: 'Data-driven insights and trend analysis',
      icon: BarChart3,
      color: 'indigo',
      action: () => navigate('/analytics'),
      available: true
    },
    {
      id: 'custom-reports',
      title: 'Custom Reports',
      description: 'Create custom reports with specific parameters',
      icon: PieChart,
      color: 'pink',
      action: null,
      available: false
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showProjectSelection, setShowProjectSelection] = useState(false);

  const handleCategoryClick = (category) => {
    if (category.available === false) {
      return;
    }

    if (category.action === 'select-project') {
      setSelectedCategory(category);
      setShowProjectSelection(true);
    } else if (typeof category.action === 'function') {
      category.action();
    }
  };

  const handleProjectSelect = (project) => {
    const projectId = project.id || project.project_id || project.projectId;
    if (projectId) {
      navigate(`/projects/${projectId}/reports`, {
        state: { fromReportsTab: true }
      });
    } else {
      console.error('Project ID not found:', project);
    }
  };

  const getProjectStatus = (project) => {
    return project.status || project.projectStatus || 'Active';
  };

  const getProjectDepartment = (project) => {
    return project.department || project.technical_group || project.technicalGroup || '';
  };

  const getProjectIdentifier = (project) => {
    return project.project_no || project.projectNo || project.project_id || project.id || '';
  };

  const colorConfig = {
    blue: {
      bg: 'bg-blue-50/80 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/50 dark:border-blue-800/30',
      text: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      bg: 'bg-green-50/80 dark:bg-green-950/30',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      icon: 'text-green-600 dark:text-green-400',
      border: 'border-green-200/50 dark:border-green-800/30',
      text: 'text-green-600 dark:text-green-400'
    },
    purple: {
      bg: 'bg-purple-50/80 dark:bg-purple-950/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200/50 dark:border-purple-800/30',
      text: 'text-purple-600 dark:text-purple-400'
    },
    orange: {
      bg: 'bg-orange-50/80 dark:bg-orange-950/30',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      icon: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200/50 dark:border-orange-800/30',
      text: 'text-orange-600 dark:text-orange-400'
    },
    indigo: {
      bg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      icon: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200/50 dark:border-indigo-800/30',
      text: 'text-indigo-600 dark:text-indigo-400'
    },
    pink: {
      bg: 'bg-pink-50/80 dark:bg-pink-950/30',
      iconBg: 'bg-pink-100 dark:bg-pink-900/40',
      icon: 'text-pink-600 dark:text-pink-400',
      border: 'border-pink-200/50 dark:border-pink-800/30',
      text: 'text-pink-600 dark:text-pink-400'
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reports Center</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Generate and access various reports for your research projects
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start">
          <AlertCircle className="text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 dark:text-red-300 font-medium">Error loading projects</p>
            <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Projects</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoading ? '...' : projects.length}
              </p>
            </div>
            <FileText className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Projects</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoading ? '...' : projects.filter(p => getProjectStatus(p) === 'Active').length}
              </p>
            </div>
            <TrendingUp className="text-green-600 dark:text-green-400" size={32} />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Report Types</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {reportCategories.filter(c => c.available !== false).length + 1}
              </p>
            </div>
            <BarChart3 className="text-purple-600 dark:text-purple-400" size={32} />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Coming Soon</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {reportCategories.filter(c => c.available === false).length}
              </p>
            </div>
            <Calendar className="text-orange-600 dark:text-orange-400" size={32} />
          </div>
        </div>
      </div>

      {/* Report Categories Grid */}
      {!showProjectSelection ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* UC Card - Featured Position */}
          <UCReportCard />

          {/* Other Report Categories */}
          {reportCategories.map((category) => {
            const colors = colorConfig[category.color];
            return (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className={`
                  ${colors.bg} ${colors.border} backdrop-blur-sm rounded-xl shadow-sm border-2 p-6 transition-all duration-200
                  ${category.available === false 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                  }
                `}
              >
                <div className={`${colors.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                  <category.icon className={colors.icon} size={24} />
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {category.title}
                  {category.available === false && (
                    <span className="ml-2 text-xs bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  {category.description}
                </p>

                {category.available !== false && (
                  <div className={`flex items-center text-sm font-medium ${colors.text}`}>
                    <span>Generate Report</span>
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Project Selection View */
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Select a Project</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Choose a project to generate reports for
                </p>
              </div>
              <button
                onClick={() => setShowProjectSelection(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading projects...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                <button
                  onClick={fetchProjects}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No projects available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => {
                  const projectId = project.id || project.project_id || project.projectId;
                  const projectNo = getProjectIdentifier(project);
                  const status = getProjectStatus(project);
                  const department = getProjectDepartment(project);
                  
                  return (
                    <div
                      key={projectId}
                      onClick={() => handleProjectSelect(project)}
                      className="bg-white/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer transition-all backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            {project.title}
                          </h3>
                          {projectNo && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {projectNo}
                            </p>
                          )}
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              status === 'Active' 
                                ? 'bg-green-100/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-900/50'
                                : status === 'Completed'
                                ? 'bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50'
                                : 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50'
                            }`}>
                              {status}
                            </span>
                            {department && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {department}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="text-slate-400 dark:text-slate-500 mt-1" size={20} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
          About Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-300/90">
          <div className="space-y-2">
            <p>
              <strong className="font-semibold">Project Reports:</strong> Detailed financial reports for individual projects including budget allocation, funds received, and expenditure tracking.
            </p>
            <p>
              <strong className="font-semibold">Financial Summary:</strong> Institutional-level overview of all active projects and consolidated financial data.
            </p>
            <p>
              <strong className="font-semibold">Utilization Certificates:</strong> Generate GFR 12-A format UCs for annual financial year reporting to funding agencies.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <strong className="font-semibold">Analytics:</strong> Visual insights, trends, and comparative analysis across projects and time periods.
            </p>
            <p>
              <strong className="font-semibold">Custom Reports:</strong> More report types coming soon including department-wise analysis and FY reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;