/**
 * Burn Rate Analysis Component
 */

import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';

const BurnRateAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [sortField, setSortField] = useState('urgency');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterUrgency, setFilterUrgency] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getBurnRateAnalysis();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError('Failed to load burn rate analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/50';
      case 'high': return 'bg-orange-100/80 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200/50 dark:border-orange-900/50';
      case 'medium': return 'bg-yellow-100/80 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-900/50';
      case 'low': return 'bg-green-100/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-900/50';
      default: return 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'critical': return '🔴';
      case 'high': return '🟡';
      case 'medium': return '🔵';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredProjects = projects.filter(p => 
    filterUrgency === 'all' || p.urgency === filterUrgency
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let aVal, bVal;
    
    if (sortField === 'urgency') {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      aVal = urgencyOrder[a.urgency] ?? 999;
      bVal = urgencyOrder[b.urgency] ?? 999;
    } else {
      aVal = a[sortField] ?? 0;
      bVal = b[sortField] ?? 0;
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const exportToExcel = async () => {
    try {
      await analyticsService.exportToExcel('burn_rate');
      alert('Export successful!');
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading burn rate analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  const urgencyCounts = {
    critical: projects.filter(p => p.urgency === 'critical').length,
    high: projects.filter(p => p.urgency === 'high').length,
    medium: projects.filter(p => p.urgency === 'medium').length,
    low: projects.filter(p => p.urgency === 'low').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Burn Rate Analysis</h2>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Track spending velocity and predict when projects run out of funds
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
        <div className="bg-red-50/80 dark:bg-red-950/30 backdrop-blur-sm border border-red-200/50 dark:border-red-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">Critical</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">{urgencyCounts.critical}</p>
              <p className="text-red-600 dark:text-red-400 text-xs">{'<'}30 days runway</p>
            </div>
            <span className="text-3xl">🔴</span>
          </div>
        </div>

        <div className="bg-orange-50/80 dark:bg-orange-950/30 backdrop-blur-sm border border-orange-200/50 dark:border-orange-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">High</p>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">{urgencyCounts.high}</p>
              <p className="text-orange-600 dark:text-orange-400 text-xs">30-90 days runway</p>
            </div>
            <span className="text-3xl">🟡</span>
          </div>
        </div>

        <div className="bg-yellow-50/80 dark:bg-yellow-950/30 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Medium</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{urgencyCounts.medium}</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs">90-180 days runway</p>
            </div>
            <span className="text-3xl">🔵</span>
          </div>
        </div>

        <div className="bg-green-50/80 dark:bg-green-950/30 backdrop-blur-sm border border-green-200/50 dark:border-green-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">Low Risk</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">{urgencyCounts.low}</p>
              <p className="text-green-600 dark:text-green-400 text-xs">{'>'}180 days runway</p>
            </div>
            <span className="text-3xl">🟢</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by Urgency:</label>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        >
          <option value="all">All Projects</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Risk Only</option>
        </select>
        
        <span className="text-sm text-slate-600 dark:text-slate-400 ml-auto">
          Showing {sortedProjects.length} of {projects.length} projects
        </span>
      </div>

      {/* Table */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
            <thead className="bg-slate-50/80 dark:bg-slate-900/30">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30"
                  onClick={() => handleSort('urgency')}
                >
                  Status {sortField === 'urgency' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30"
                  onClick={() => handleSort('project_code')}
                >
                  Project {sortField === 'project_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Current Balance
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30"
                  onClick={() => handleSort('monthly_burn_rate')}
                >
                  Monthly Burn {sortField === 'monthly_burn_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30"
                  onClick={() => handleSort('runway_days')}
                >
                  Runway {sortField === 'runway_days' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Depletion Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/60 dark:bg-slate-800/30 divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No projects match the selected filter
                  </td>
                </tr>
              ) : (
                sortedProjects.map((project) => (
                  <tr key={project.project_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex items-center gap-2 text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(project.urgency)}`}>
                        {getUrgencyIcon(project.urgency)}
                        {project.urgency.charAt(0).toUpperCase() + project.urgency.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{project.project_code}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{project.project_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(project.current_balance)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Last 3 mo: {formatCurrency(project.last_3_months_spending)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(project.monthly_burn_rate)}/mo
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(project.daily_burn_rate)}/day
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.runway_days ? (
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {project.runway_days} days
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            ({project.runway_months} months)
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 dark:text-slate-500">N/A</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {project.projected_depletion_date || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-900/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">📘 How to Read This Report</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>Burn Rate:</strong> How fast the project spends money (based on last 3 months)</li>
          <li>• <strong>Runway:</strong> Days/months until project runs out of funds at current burn rate</li>
          <li>• <strong>Urgency Levels:</strong> Critical ({'<'}30 days), High (30-90 days), Medium (90-180 days), Low ({'>'}180 days)</li>
          <li>• <strong>Depletion Date:</strong> Predicted date when funds will be exhausted</li>
        </ul>
      </div>
    </div>
  );
};

export default BurnRateAnalysis;