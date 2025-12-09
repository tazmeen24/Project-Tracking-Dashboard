/**
 * Burn Rate Analysis Component
 * Shows projects with burn rate, runway, and projected depletion dates
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
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <div className="text-gray-600">Loading burn rate analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
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
          <h2 className="text-2xl font-bold text-gray-900">Burn Rate Analysis</h2>
          <p className="text-gray-600 mt-1">
            Track spending velocity and predict when projects run out of funds
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span>📥</span>
          Export to Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Critical</p>
              <p className="text-2xl font-bold text-red-800">{urgencyCounts.critical}</p>
              <p className="text-red-600 text-xs">{'<'}30 days runway</p>
            </div>
            <span className="text-3xl">🔴</span>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">High</p>
              <p className="text-2xl font-bold text-orange-800">{urgencyCounts.high}</p>
              <p className="text-orange-600 text-xs">30-90 days runway</p>
            </div>
            <span className="text-3xl">🟡</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Medium</p>
              <p className="text-2xl font-bold text-yellow-800">{urgencyCounts.medium}</p>
              <p className="text-yellow-600 text-xs">90-180 days runway</p>
            </div>
            <span className="text-3xl">🔵</span>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Low Risk</p>
              <p className="text-2xl font-bold text-green-800">{urgencyCounts.low}</p>
              <p className="text-green-600 text-xs">{'>'}180 days runway</p>
            </div>
            <span className="text-3xl">🟢</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-700">Filter by Urgency:</label>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Projects</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Risk Only</option>
        </select>
        
        <span className="text-sm text-gray-600 ml-auto">
          Showing {sortedProjects.length} of {projects.length} projects
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('urgency')}
                >
                  Status {sortField === 'urgency' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('project_code')}
                >
                  Project {sortField === 'project_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('monthly_burn_rate')}
                >
                  Monthly Burn {sortField === 'monthly_burn_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('runway_days')}
                >
                  Runway {sortField === 'runway_days' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Depletion Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No projects match the selected filter
                  </td>
                </tr>
              ) : (
                sortedProjects.map((project) => (
                  <tr key={project.project_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex items-center gap-2 text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(project.urgency)}`}>
                        {getUrgencyIcon(project.urgency)}
                        {project.urgency.charAt(0).toUpperCase() + project.urgency.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{project.project_code}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">{project.project_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(project.current_balance)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Last 3 mo: {formatCurrency(project.last_3_months_spending)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(project.monthly_burn_rate)}/mo
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(project.daily_burn_rate)}/day
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.runway_days ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.runway_days} days
                          </div>
                          <div className="text-xs text-gray-500">
                            ({project.runway_months} months)
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">N/A</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📘 How to Read This Report</h3>
        <ul className="text-sm text-blue-800 space-y-1">
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