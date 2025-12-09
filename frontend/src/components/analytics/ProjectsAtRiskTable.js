import React, { useState } from 'react';
import { AlertTriangle, TrendingDown, Eye } from 'lucide-react';

const ProjectsAtRiskTable = ({ projects }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'funds_balance_percentage',
    direction: 'asc'
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const getRiskBadge = (riskLevel) => {
    const badges = {
      high: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: 'bg-red-200',
        label: 'High Risk'
      },
      medium: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: 'bg-yellow-200',
        label: 'Medium Risk'
      },
      low: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: 'bg-blue-200',
        label: 'Low Risk'
      }
    };

    const badge = badges[riskLevel] || badges.low;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <div className={`w-2 h-2 rounded-full ${badge.icon}`} />
        {badge.label}
      </span>
    );
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProjects = React.useMemo(() => {
    let sortableProjects = [...projects];
    if (sortConfig.key) {
      sortableProjects.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProjects;
  }, [projects, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400">⇅</span>;
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <AlertTriangle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Projects at Risk
        </h3>
        <p className="text-gray-600">
          All active projects have adequate funds balance. Great job!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('project_code')}
              >
                <div className="flex items-center gap-1">
                  Project Code {getSortIcon('project_code')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Project Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                PI Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('funds_balance')}
              >
                <div className="flex items-center justify-end gap-1">
                  Funds Balance {getSortIcon('funds_balance')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('funds_balance_percentage')}
              >
                <div className="flex items-center justify-end gap-1">
                  Balance % {getSortIcon('funds_balance_percentage')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('risk_level')}
              >
                <div className="flex items-center justify-center gap-1">
                  Risk Level {getSortIcon('risk_level')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProjects.map((project) => (
              <tr key={project.project_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {project.project_code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {project.project_title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {project.pi_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className={`text-sm font-medium ${
                    project.funds_balance < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {formatCurrency(project.funds_balance)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Budget: {formatCurrency(project.budget_balance)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingDown className={`w-4 h-4 ${
                      project.funds_balance_percentage < 10 ? 'text-red-500' :
                      project.funds_balance_percentage < 20 ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      project.funds_balance_percentage < 10 ? 'text-red-600' :
                      project.funds_balance_percentage < 20 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {formatPercentage(project.funds_balance_percentage)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getRiskBadge(project.risk_level)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => {
                      // Navigate to project details
                      window.location.href = `/projects/${project.project_id}`;
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Total projects at risk: <span className="font-semibold text-gray-900">{projects.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">
                High: {projects.filter(p => p.risk_level === 'high').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600">
                Medium: {projects.filter(p => p.risk_level === 'medium').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">
                Low: {projects.filter(p => p.risk_level === 'low').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsAtRiskTable;