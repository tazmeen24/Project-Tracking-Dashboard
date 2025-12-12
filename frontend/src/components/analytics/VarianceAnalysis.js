/**
 * Variance Analysis Component - DARK MODE COMPATIBLE
 * Shows budget vs actual spending with category breakdown
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import analyticsService from '../../services/analyticsService';

const VarianceAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'single'

  useEffect(() => {
    fetchData(selectedProject);
  }, [selectedProject]);

  const fetchData = async (projectId = null) => {
    try {
      setLoading(true);
      console.log('Fetching variance data for project:', projectId);
      const result = await analyticsService.getVarianceAnalysis(projectId);
      console.log('Received variance data:', result);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load variance analysis');
      console.error('Variance analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'over': return 'text-red-600 dark:text-red-400';
      case 'under': return 'text-green-600 dark:text-green-400';
      case 'on-track': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'over': return 'bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/50';
      case 'under': return 'bg-green-100/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-900/50';
      case 'on-track': return 'bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50';
      default: return 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50';
    }
  };

  const exportToExcel = async () => {
    try {
      await analyticsService.exportToExcel('variance');
      alert('Export successful!');
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading variance analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300">{error}</p>
        <button
          onClick={() => fetchData(selectedProject)}
          className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Prepare chart data for overall summary
  const chartData = [
    {
      name: 'Overall',
      Budgeted: data.summary.total_budgeted,
      Spent: data.summary.total_spent,
      Variance: Math.abs(data.summary.total_variance)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Budget Variance Analysis</h2>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Compare planned budget vs actual spending across projects and categories
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <span>📥</span>
          Export to Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Total Budgeted</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.summary.total_budgeted)}</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Total Spent</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.summary.total_spent)}</p>
        </div>

        <div className={`bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border rounded-lg p-4 ${data.summary.total_variance > 0 ? 'border-red-300 dark:border-red-900/50' : 'border-green-300 dark:border-green-900/50'}`}>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Variance</p>
          <p className={`text-2xl font-bold ${data.summary.total_variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {data.summary.total_variance > 0 ? '+' : ''}{formatCurrency(data.summary.total_variance)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {data.summary.variance_percentage > 0 ? '+' : ''}{data.summary.variance_percentage.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Project Status</p>
          <div className="flex gap-2 mt-2">
            <span className="text-red-600 dark:text-red-400 font-bold">{data.summary.projects_over_budget}</span>
            <span className="text-slate-400 dark:text-slate-500">/</span>
            <span className="text-green-600 dark:text-green-400 font-bold">{data.summary.projects_under_budget}</span>
            <span className="text-slate-400 dark:text-slate-500">/</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{data.summary.projects_on_track}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Over / Under / On Track</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Budget vs Actual Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              stroke="currentColor"
            />
            <YAxis 
              tick={{ fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              stroke="currentColor"
              tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '0.5rem'
              }}
            />
            <Legend />
            <Bar dataKey="Budgeted" fill="#3B82F6" name="Budgeted" />
            <Bar dataKey="Spent" fill="#10B981" name="Spent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project Filter */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">View:</label>
          <select
            value={viewMode}
            onChange={(e) => {
              setViewMode(e.target.value);
              if (e.target.value === 'all') {
                setSelectedProject(null);
              }
            }}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">All Projects</option>
            <option value="single">Single Project</option>
          </select>

          {viewMode === 'single' && (
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Select a project...</option>
              {data.projects.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_code} - {p.project_title}
                </option>
              ))}
            </select>
          )}
          
          {viewMode === 'single' && selectedProject && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Viewing: <strong className="text-slate-900 dark:text-white">Project #{selectedProject}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
            <thead className="bg-slate-50/80 dark:bg-slate-900/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Budgeted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/60 dark:bg-slate-800/30 divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {data.projects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No variance data available
                  </td>
                </tr>
              ) : (
                data.projects.map((project) => (
                <React.Fragment key={project.project_id}>
                  {project.categories.map((category, idx) => (
                    <tr key={`${project.project_id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                      {idx === 0 && (
                        <td 
                          className="px-6 py-4 border-r border-slate-200/50 dark:border-slate-700/50" 
                          rowSpan={project.categories.length}
                        >
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{project.project_code}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{project.project_title}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Total Variance: {formatCurrency(project.total_variance)}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {category.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
                        {formatCurrency(category.budgeted)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
                        {formatCurrency(category.actual_spent)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getStatusColor(category.status)}`}>
                        {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                        <div className="text-xs">
                          ({category.variance_percentage > 0 ? '+' : ''}{category.variance_percentage.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
                        {category.utilization_percentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(category.status)}`}>
                          {category.status === 'on-track' ? 'On Track' : category.status.charAt(0).toUpperCase() + category.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-900/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">📘 Understanding Variance</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong className="text-red-600 dark:text-red-400">Over Budget:</strong> Actual spending exceeds allocated budget (positive variance)</li>
          <li>• <strong className="text-green-600 dark:text-green-400">Under Budget:</strong> Spending is below allocated budget (negative variance)</li>
          <li>• <strong className="text-blue-600 dark:text-blue-400">On Track:</strong> Spending matches budget exactly</li>
          <li>• <strong>Utilization %:</strong> Percentage of allocated budget that has been spent</li>
        </ul>
      </div>
    </div>
  );
};

export default VarianceAnalysis;