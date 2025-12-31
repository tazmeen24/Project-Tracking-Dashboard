// frontend/src/pages/UCManagementPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowLeft,
  FileText
} from 'lucide-react';
import projectService from '../services/projectService';
import ucService from '../services/ucService';

const UCManagementPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch projects with multiple method attempts
      let projectsData;
      
      try {
        // Try getAllProjects first
        if (typeof projectService.getAllProjects === 'function') {
          projectsData = await projectService.getAllProjects();
        } else if (typeof projectService.getProjects === 'function') {
          projectsData = await projectService.getProjects();
        } else if (typeof projectService.fetchProjects === 'function') {
          projectsData = await projectService.fetchProjects();
        } else if (typeof projectService.list === 'function') {
          projectsData = await projectService.list();
        } else {
          throw new Error('No suitable method found in projectService');
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        projectsData = [];
      }

      // Handle different response formats
      let projectList = [];
      if (Array.isArray(projectsData)) {
        projectList = projectsData;
      } else if (projectsData && Array.isArray(projectsData.projects)) {
        projectList = projectsData.projects;
      } else if (projectsData && Array.isArray(projectsData.data)) {
        projectList = projectsData.data;
      } else if (projectsData && typeof projectsData === 'object') {
        // Check if it's a single project object
        if (projectsData.project_id || projectsData.id) {
          projectList = [projectsData];
        } else {
          projectList = [];
        }
      }

      setProjects(projectList);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUC = (project) => {
    navigate('/uc/new', { state: { project } });
  };

  const handleViewUC = (project) => {
    navigate(`/uc/project/${project.project_id || project.id}`);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: {
        bg: 'bg-yellow-100/80 dark:bg-yellow-950/40',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200/50 dark:border-yellow-900/50',
        icon: Clock
      },
      submitted: {
        bg: 'bg-blue-100/80 dark:bg-blue-950/40',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200/50 dark:border-blue-900/50',
        icon: FileText
      },
      approved: {
        bg: 'bg-green-100/80 dark:bg-green-950/40',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200/50 dark:border-green-900/50',
        icon: CheckCircle
      }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <Icon size={12} className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getFinancialYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Utilization Certificates
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Generate and manage GFR 12-A format UCs for your projects
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start">
          <AlertCircle className="text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-900/50 rounded-xl p-6">
        <div className="flex items-start">
          <FileCheck className="text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
              About Utilization Certificates
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300/90 mb-2">
              UCs are generated for each financial year (April - March) and must be submitted to funding agencies 
              to demonstrate proper utilization of grants.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <strong className="font-semibold text-blue-900 dark:text-blue-300">Current FY:</strong>
                <span className="ml-2 text-blue-800 dark:text-blue-300/90">{getFinancialYear()}</span>
              </div>
              <div>
                <strong className="font-semibold text-blue-900 dark:text-blue-300">Format:</strong>
                <span className="ml-2 text-blue-800 dark:text-blue-300/90">GFR 12-A</span>
              </div>
              <div>
                <strong className="font-semibold text-blue-900 dark:text-blue-300">Output:</strong>
                <span className="ml-2 text-blue-800 dark:text-blue-300/90">Word / PDF</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Draft UCs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0</p>
            </div>
            <Clock className="text-yellow-600 dark:text-yellow-400" size={32} />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Submitted</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0</p>
            </div>
            <FileCheck className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Approved</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0</p>
            </div>
            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Projects
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Select a project to generate or view UCs
              </p>
            </div>
            {projects.length > 0 && (
              <button
                onClick={() => {
                  // Navigate to first project's create page by default
                  // Or show a project selector modal
                  if (projects.length === 1) {
                    handleCreateUC(projects[0]);
                  } else {
                    // For multiple projects, user clicks on specific project card
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }
                }}
                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                <Plus size={20} className="mr-2" />
                Create New UC
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading projects...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle size={64} className="text-red-400 dark:text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Failed to Load Projects
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {error}
              </p>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={64} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No projects available
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Create a project first to generate utilization certificates
              </p>
              <button
                onClick={() => navigate('/projects/new')}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                <Plus size={20} className="mr-2" />
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const projectId = project.project_id || project.id;
                const projectNo = project.project_no || project.projectNo || '';
                
                return (
                  <div
                    key={projectId}
                    className="bg-white/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-5 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all backdrop-blur-sm group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {project.title}
                        </h3>
                        {projectNo && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {projectNo}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prominent Create UC Button */}
                    <div className="space-y-2 mt-4">
                      <button
                        onClick={() => handleCreateUC(project)}
                        className="w-full flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md group-hover:scale-[1.02]"
                      >
                        <Plus size={18} className="mr-2" />
                        Create UC
                      </button>
                      <button
                        onClick={() => handleViewUC(project)}
                        className="w-full flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        <Eye size={16} className="mr-2" />
                        View Existing UCs
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UCManagementPage;