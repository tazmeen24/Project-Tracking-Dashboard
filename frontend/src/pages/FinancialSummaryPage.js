/**
 * Financial Summary Page
 */

import React, { useState, useEffect } from 'react';
import { FileDown, DollarSign, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import financialSummaryService from '../services/financialSummaryService';
import ByProjectTable from '../components/FinancialSummary/ByProjectTable';
import { ByBudgetHeadTable, ByTechnicalGroupTable, ByFundingAgencyTable } from '../components/FinancialSummary/OtherTables';
import projectService from '../services/projectService';

const FinancialSummaryPage = () => {
  // State management
  const [viewMode, setViewMode] = useState('by_project');
  const [dateFilterMode, setDateFilterMode] = useState('current');
  const [asOfDate, setAsOfDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [financialYear, setFinancialYear] = useState('2024');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [quarter, setQuarter] = useState('1');
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedBudgetHeads, setExpandedBudgetHeads] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  // Fetch all projects when component mounts or when switching to detail view
  useEffect(() => {
    if (viewMode === 'project_budget_head_detail') {
      fetchProjects();
    }
  }, [viewMode]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const response = await projectService.getAllProjects({});
      let projectsData = response.data || response.items || response;
      
      if (response.data && Array.isArray(response.data)) {
        projectsData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        projectsData = response.data.data;
      }
      
      if (Array.isArray(projectsData) && projectsData.length > 0) {
        setProjects(projectsData);
      } else if (Array.isArray(projectsData)) {
        console.warn('Projects array is empty');
        setProjects([]);
      } else {
        console.error('Unexpected response format:', response);
        setProjects([]);
        setError('No projects found or unexpected response format');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'project_budget_head_detail' && !projectFilter) {
      setFinancialData(null);
      setError(null);
      return;
    }

    if (dateFilterMode === 'as_of_date' && !asOfDate) return;
    if (dateFilterMode === 'date_range' && (!startDate || !endDate)) return;

    fetchFinancialSummary();
  }, [
    viewMode,
    dateFilterMode,
    asOfDate,
    startDate,
    endDate,
    financialYear,
    year,
    month,
    quarter,
    projectFilter,
    currentPage
  ]);

  const fetchFinancialSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        viewMode,
        dateFilterMode,
        page: currentPage,
        perPage
      };

      if (dateFilterMode === 'as_of_date' && asOfDate) params.asOfDate = asOfDate;
      if (dateFilterMode === 'date_range') {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (dateFilterMode === 'financial_year') params.financialYear = parseInt(financialYear);
      if (dateFilterMode === 'monthly') {
        params.year = parseInt(year);
        params.month = parseInt(month);
      }
      if (dateFilterMode === 'quarterly') {
        params.year = parseInt(year);
        params.quarter = parseInt(quarter);
      }
      if (projectFilter && viewMode === 'project_budget_head_detail') {
        params.projectId = parseInt(projectFilter);
      }
      const data = await financialSummaryService.getFinancialSummary(params);
      setFinancialData(data);
    } catch (err) {
      console.error('Financial Summary Error:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to fetch financial summary');
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getUtilizationColor = (percentage) => {
    if (percentage < 80) return 'bg-green-100/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-900/50';
    if (percentage < 100) return 'bg-yellow-100/80 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-900/50';
    return 'bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/50';
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400';
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  const toggleRowExpansion = (projectId) => {
    const newSet = new Set(expandedRows);
    newSet.has(projectId) ? newSet.delete(projectId) : newSet.add(projectId);
    setExpandedRows(newSet);
  };

  const toggleBudgetHeadExpansion = (id) => {
    const newSet = new Set(expandedBudgetHeads);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpandedBudgetHeads(newSet);
  };

  const handleExport = async () => {
    if (viewMode === 'project_budget_head_detail' && !projectFilter) {
      alert('Please select a project before exporting.');
      return;
    }

    try {
      const params = { viewMode, dateFilterMode };
      if (dateFilterMode === 'as_of_date' && asOfDate) params.asOfDate = asOfDate;
      if (dateFilterMode === 'date_range') {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (dateFilterMode === 'financial_year') params.financialYear = parseInt(financialYear);
      if (dateFilterMode === 'monthly') {
        params.year = parseInt(year);
        params.month = parseInt(month);
      }
      if (dateFilterMode === 'quarterly') {
        params.year = parseInt(year);
        params.quarter = parseInt(quarter);
      }
      if (projectFilter && viewMode === 'project_budget_head_detail') {
        params.projectId = parseInt(projectFilter);
      }

      await financialSummaryService.exportToExcel(params);
    } catch (err) {
      alert('Export failed. Please try again.');
    }
  };

  // Project Budget Head Detail Table Component
  const ProjectBudgetHeadDetailTable = ({ data, formatCurrency, getBalanceColor }) => {
    const budgetHeadOrder = [
      'manpower',
      'equipment',
      'travel & training',
      'consumables',
      'contingency',
      'overhead'
    ];

    const sortedData = [...data].sort((a, b) => {
      const ia = budgetHeadOrder.indexOf(a.budget_head);
      const ib = budgetHeadOrder.indexOf(b.budget_head);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const renderBreakdown = (breakdown) => {
      if (!breakdown?.length) return null;
      return (
        <tr>
          <td colSpan="8" className="bg-slate-50/80 dark:bg-slate-900/30 px-6 py-4">
            <div className="ml-10">
              <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Item-wise Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-200/50 dark:border-slate-700/50 rounded">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300">Item</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300">Approved Budget</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300">Funds Received</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300">Expenditure</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300">Budget Balance</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300">Funds Balance</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300">Util %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200">{item.item_name}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.approved_budget)}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.funds_received)}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.expenditure)}</td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${getBalanceColor(item.budget_balance)}`}>
                          {formatCurrency(item.budget_balance)}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${getBalanceColor(item.funds_balance)}`}>
                          {formatCurrency(item.funds_balance)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-800 dark:text-slate-200">{item.utilization_percentage?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      );
    };

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">Budget Head</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Approved Budget</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Funds Received</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Expenditure</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Budget Balance</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Funds Balance</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Utilization %</th>
              <th className="px-6 py-4 text-center text-sm font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white/60 dark:bg-slate-800/30 divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {sortedData.map((item, idx) => {
              const id = `bh-${idx}`;
              const isExpanded = expandedBudgetHeads.has(id);
              const hasBreakdown = item.breakdown?.length > 0;

              return (
                <React.Fragment key={id}>
                  <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{item.budget_head}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.approved_budget)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.funds_received)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.expenditure)}</td>
                    <td className={`px-6 py-4 text-sm text-right font-medium ${getBalanceColor(item.budget_balance)}`}>
                      {formatCurrency(item.budget_balance)}
                    </td>
                    <td className={`px-6 py-4 text-sm text-right font-medium ${getBalanceColor(item.funds_balance)}`}>
                      {formatCurrency(item.funds_balance)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.utilization_percentage < 80 ? 'bg-green-100/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-900/50' :
                        item.utilization_percentage < 100 ? 'bg-yellow-100/80 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-900/50' :
                        'bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/50'
                      }`}>
                        {item.utilization_percentage?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasBreakdown && (
                        <button
                          onClick={() => toggleBudgetHeadExpansion(id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && renderBreakdown(item.breakdown)}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100/80 dark:bg-slate-800/50 font-bold">
            <tr>
              <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">Total</td>
              {['approved_budget', 'funds_received', 'expenditure', 'budget_balance', 'funds_balance'].map(field => (
                <td key={field} className="px-6 py-4 text-sm text-right text-slate-900 dark:text-white">
                  {formatCurrency(sortedData.reduce((s, i) => s + (i[field] || 0), 0))}
                </td>
              ))}
              <td className="px-6 py-4 text-sm text-right text-slate-900 dark:text-white">
                {(() => {
                  const totalBudget = sortedData.reduce((s, i) => s + (i.approved_budget || 0), 0);
                  const totalExp = sortedData.reduce((s, i) => s + (i.expenditure || 0), 0);
                  return totalBudget > 0 ? ((totalExp / totalBudget) * 100).toFixed(1) + '%' : '0.0%';
                })()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderTable = () => {
    if (!financialData?.data) return null;

    const props = {
      data: financialData.data,
      formatCurrency,
      getBalanceColor,
      getUtilizationColor
    };

    switch (viewMode) {
      case 'by_project':
        return <ByProjectTable {...props} expandedRows={expandedRows} toggleRowExpansion={toggleRowExpansion} />;
      case 'by_budget_head':
        return <ByBudgetHeadTable {...props} />;
      case 'by_technical_group':
        return <ByTechnicalGroupTable {...props} />;
      case 'by_funding_agency':
        return <ByFundingAgencyTable {...props} />;
      case 'project_budget_head_detail':
        return <ProjectBudgetHeadDetailTable {...props} />;
      default:
        return null;
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Financial Summary</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2">Comprehensive financial overview with budget & fund tracking</p>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value);
                setCurrentPage(1);
                if (e.target.value !== 'project_budget_head_detail') {
                  setProjectFilter('');
                }
              }}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="by_project">By Project</option>
              <option value="by_budget_head">By Budget Head</option>
              <option value="by_technical_group">By Technical Group</option>
              <option value="by_funding_agency">By Funding Agency</option>
              <option value="project_budget_head_detail">Project Budget Head Detail</option>
            </select>
          </div>

          {/* Date Filter Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Filter</label>
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="current">Current (All Time)</option>
              <option value="as_of_date">As of Date</option>
              <option value="date_range">Date Range</option>
              <option value="financial_year">Financial Year</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {/* Conditional Date Fields */}
          {dateFilterMode === 'as_of_date' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">As of Date</label>
              <input 
                type="date" 
                value={asOfDate} 
                onChange={(e) => setAsOfDate(e.target.value)} 
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
              />
            </div>
          )}

          {dateFilterMode === 'date_range' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                />
              </div>
            </>
          )}

          {dateFilterMode === 'financial_year' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Financial Year</label>
              <select 
                value={financialYear} 
                onChange={e => setFinancialYear(e.target.value)} 
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="2023">2023-24</option>
                <option value="2024">2024-25</option>
                <option value="2025">2025-26</option>
              </select>
            </div>
          )}

          {dateFilterMode === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Year</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option>2023</option><option>2024</option><option>2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Month</label>
                <select 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={String(i+1).padStart(2,'0')}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {dateFilterMode === 'quarterly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Year</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option>2023</option><option>2024</option><option>2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quarter</label>
                <select 
                  value={quarter} 
                  onChange={(e) => setQuarter(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="1">Q1 (Jan-Mar)</option>
                  <option value="2">Q2 (Apr-Jun)</option>
                  <option value="3">Q3 (Jul-Sep)</option>
                  <option value="4">Q4 (Oct-Dec)</option>
                </select>
              </div>
            </>
          )}

          {/* Project Selection */}
          {viewMode === 'project_budget_head_detail' && (
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Project <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                disabled={projectsLoading}
                className="w-full px-5 py-3 text-lg border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">
                  {projectsLoading ? 'Loading projects...' : 'Select a project'}
                </option>
                {projects.map((project) => {
                  const projectName = project.title || project.name || project.project_name || project.project_title || `Project ${project.id}`;
                  const projectId = project.id || project.project_id || project.projectId;
                  
                  return (
                    <option key={projectId} value={projectId}>
                      {projectName} (ID: {projectId})
                    </option>
                  );
                })}
              </select>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select a project to see detailed breakdown by budget head
              </p>
            </div>
          )}
        </div>

        {/* Friendly prompt when no project selected */}
        {viewMode === 'project_budget_head_detail' && !projectFilter && !loading && (
          <div className="mt-10 bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border-2 border-blue-200/50 dark:border-blue-900/50 rounded-2xl p-10 text-center">
            <div className="max-w-lg mx-auto">
              <div className="bg-blue-100/80 dark:bg-blue-900/40 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="text-blue-600 dark:text-blue-400" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-3">
                Project Budget Head Details
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-lg">
                Please select a <strong>project</strong> from the dropdown above to view detailed financial information broken down by Manpower, Equipment, Travel, etc.
              </p>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleExport}
            disabled={viewMode === 'project_budget_head_detail' && !projectFilter}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={viewMode === 'project_budget_head_detail' && !projectFilter ? 'Please select a project first' : ''}
          >
            <FileDown size={22} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-300 dark:border-red-900/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {financialData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Projects", value: financialData.summary.total_projects, color: "blue" },
            { label: "Approved Budget", value: formatCurrency(financialData.summary.total_approved_budget), color: "purple" },
            { label: "Funds Received", value: formatCurrency(financialData.summary.total_funds_received), color: "green" },
            { label: "Expenditure", value: formatCurrency(financialData.summary.total_expenditure), color: "orange" },
            { label: "Budget Balance", value: formatCurrency(financialData.summary.budget_balance), color: "blue", balance: true },
            { label: "Funds Balance", value: formatCurrency(financialData.summary.funds_balance), color: "teal", balance: true },
          ].map((card, i) => (
            <div key={i} className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{card.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${card.balance ? getBalanceColor(card.value.replace(/[^0-9.-]+/g,"")) : 'text-slate-900 dark:text-white'}`}>
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading financial data...</p>
          </div>
        ) : (
          <>
            {renderTable()}

            {/* Pagination */}
            {financialData?.pagination && financialData.data?.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, financialData.pagination.total_items)} of {financialData.pagination.total_items} entries
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 transition"
                  >Previous</button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(financialData.pagination.total_pages, p + 1))}
                    disabled={currentPage === financialData.pagination.total_pages}
                    className="px-5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 transition"
                  >Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialSummaryPage;