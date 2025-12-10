// frontend/src/pages/ReportsLandingPage.jsx
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
  Download
} from 'lucide-react';
import projectService from '../services/projectService';

const ReportsLandingPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      action: 'select-project',
      projects: projects
    },
    {
      id: 'financial-summary',
      title: 'Institutional Financial Summary',
      description: 'Overview of all projects and institutional finances',
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      action: () => navigate('/financial-summary'),
      available: true
    },
    {
      id: 'department-reports',
      title: 'Department-wise Reports',
      description: 'Consolidated reports grouped by departments',
      icon: Building2,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      action: null,
      available: false
    },
    {
      id: 'yearly-reports',
      title: 'Financial Year Reports',
      description: 'Year-end reports and FY comparisons',
      icon: Calendar,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      action: null,
      available: false
    },
    {
      id: 'analytics-reports',
      title: 'Analytics & Insights',
      description: 'Data-driven insights and trend analysis',
      icon: BarChart3,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      action: () => navigate('/analytics'),
      available: true
    },
    {
      id: 'custom-reports',
      title: 'Custom Reports',
      description: 'Create custom reports with specific parameters',
      icon: PieChart,
      color: 'pink',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200',
      action: null,
      available: false
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showProjectSelection, setShowProjectSelection] = useState(false);

  const handleCategoryClick = (category) => {
    if (category.available === false) {
      return; // Coming soon
    }

    if (category.action === 'select-project') {
      setSelectedCategory(category);
      setShowProjectSelection(true);
    } else if (typeof category.action === 'function') {
      category.action();
    }
  };

  const handleProjectSelect = (projectId) => {
    navigate(`/projects/${projectId}/reports`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports Center</h1>
          <p className="text-gray-600">
            Generate and access various reports for your research projects
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <FileText className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === 'Active').length}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Report Types</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportCategories.filter(c => c.available !== false).length}
                </p>
              </div>
              <BarChart3 className="text-purple-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Coming Soon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportCategories.filter(c => c.available === false).length}
                </p>
              </div>
              <Calendar className="text-orange-600" size={32} />
            </div>
          </div>
        </div>

        {/* Report Categories Grid */}
        {!showProjectSelection ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className={`
                  bg-white rounded-lg shadow-sm border-2 p-6 transition-all duration-200
                  ${category.available === false 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'
                  }
                  ${category.borderColor}
                `}
              >
                <div className={`${category.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <category.icon className={category.iconColor} size={24} />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {category.title}
                  {category.available === false && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  )}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {category.description}
                </p>

                {category.available !== false && (
                  <div className="flex items-center text-sm font-medium text-blue-600">
                    <span>Generate Report</span>
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Project Selection View */
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Select a Project</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a project to generate reports for
                  </p>
                </div>
                <button
                  onClick={() => setShowProjectSelection(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No projects available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {project.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {project.project_id}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              project.status === 'Active' 
                                ? 'bg-green-100 text-green-800'
                                : project.status === 'Completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {project.department}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            About Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="mb-2">
                <strong>Project Reports:</strong> Detailed financial reports for individual projects including budget allocation, funds received, and expenditure tracking.
              </p>
              <p>
                <strong>Financial Summary:</strong> Institutional-level overview of all active projects and consolidated financial data.
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>Analytics:</strong> Visual insights, trends, and comparative analysis across projects and time periods.
              </p>
              <p>
                <strong>Custom Reports:</strong> More report types coming soon including department-wise analysis and FY reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsLandingPage;