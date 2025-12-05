/**
 * Financial Summary Page
 * Main page component with filters, summary cards, and dynamic tables
 * Place in: frontend/src/pages/FinancialSummaryPage.js
 */

import React, { useState, useEffect } from 'react';
import { FileDown, TrendingUp, DollarSign, PiggyBank, AlertCircle } from 'lucide-react';
import financialSummaryService from '../services/financialSummaryService';
import ByProjectTable from '../components/FinancialSummary/ByProjectTable';
import { ByBudgetHeadTable, ByTechnicalGroupTable, ByFundingAgencyTable } from '../components/FinancialSummary/OtherTables';

const FinancialSummaryPage = () => {
  // State management
  const [viewMode, setViewMode] = useState('by_project');
  const [dateFilterMode, setDateFilterMode] = useState('current');
  const [asOfDate, setAsOfDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [financialYear, setFinancialYear] = useState('2024');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [quarter, setQuarter] = useState('1');
  const [projectFilter, setProjectFilter] = useState('');
  
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchFinancialSummary();
  }, [viewMode, dateFilterMode, asOfDate, startDate, endDate, financialYear, year, month, quarter, projectFilter, currentPage]);

  const fetchFinancialSummary = async () => {
     // Prevent premature API calls
    if (dateFilterMode === 'as_of_date' && !asOfDate) return;
    if (dateFilterMode === 'date_range' && (!startDate || !endDate)) return;

    setLoading(true);
    setError(null);
    
    try {
      const params = {
        viewMode,
        dateFilterMode,
        page: currentPage,
        perPage
      };

      // Add date parameters based on filter mode
      if (dateFilterMode === 'as_of_date' && asOfDate) {
        params.asOfDate = asOfDate;
      } else if (dateFilterMode === 'date_range' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (dateFilterMode === 'financial_year' && financialYear) {
        params.financialYear = parseInt(financialYear);
      } else if (dateFilterMode === 'monthly' && year && month) {
        params.year = parseInt(year);
        params.month = parseInt(month);
      } else if (dateFilterMode === 'quarterly' && year && quarter) {
        params.year = parseInt(year);
        params.quarter = parseInt(quarter);
      }

      if (projectFilter) {
        params.projectId = parseInt(projectFilter);
      }

      const data = await financialSummaryService.getFinancialSummary(params);
      setFinancialData(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch financial summary');
      console.error('Error fetching financial summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getUtilizationColor = (percentage) => {
    if (percentage < 80) return 'bg-green-100 text-green-800';
    if (percentage < 100) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const toggleRowExpansion = (projectId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedRows(newExpanded);
  };

  const handleExport = async () => {
    try {
      const params = {
        viewMode,
        dateFilterMode
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
      if (projectFilter) params.projectId = parseInt(projectFilter);

      await financialSummaryService.exportToExcel(params);
    } catch (err) {
      alert('Export feature not yet implemented');
    }
  };

  // Render table based on view mode
  const renderTable = () => {
    if (!financialData || !financialData.data) return null;

    const tableProps = {
      data: financialData.data,
      formatCurrency,
      getBalanceColor,
      getUtilizationColor
    };

    switch (viewMode) {
      case 'by_project':
        return (
          <ByProjectTable
            {...tableProps}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
          />
        );
      case 'by_budget_head':
        return <ByBudgetHeadTable {...tableProps} />;
      case 'by_technical_group':
        return <ByTechnicalGroupTable {...tableProps} />;
      case 'by_funding_agency':
        return <ByFundingAgencyTable {...tableProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Financial Summary</h1>
        <p className="text-gray-600 mt-1">Comprehensive financial overview with dual balance tracking</p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="by_project">By Project</option>
              <option value="by_budget_head">By Budget Head</option>
              <option value="by_technical_group">By Technical Group</option>
              <option value="by_funding_agency">By Funding Agency</option>
            </select>
          </div>

          {/* Date Filter Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Filter</label>
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">Current (All Time)</option>
              <option value="as_of_date">As of Date</option>
              <option value="date_range">Date Range</option>
              <option value="financial_year">Financial Year</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {/* Conditional Date Inputs */}
          {dateFilterMode === 'as_of_date' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {dateFilterMode === 'date_range' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {dateFilterMode === 'financial_year' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="2023">FY 2023-24</option>
                <option value="2024">FY 2024-25</option>
                <option value="2025">FY 2025-26</option>
              </select>
            </div>
          )}

          {dateFilterMode === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Q1 (Jan-Mar)</option>
                  <option value="2">Q2 (Apr-Jun)</option>
                  <option value="3">Q3 (Jul-Sep)</option>
                  <option value="4">Q4 (Oct-Dec)</option>
                </select>
              </div>
            </>
          )}

          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project ID (Optional)</label>
            <input
              type="number"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              placeholder="Filter by project"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FileDown size={20} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {financialData && financialData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-800">{financialData.summary.total_projects}</p>
              </div>
              <TrendingUp className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved Budget</p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(financialData.summary.total_approved_budget)}
                </p>
              </div>
              <DollarSign className="text-purple-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Funds Received</p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(financialData.summary.total_funds_received)}
                </p>
              </div>
              <PiggyBank className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expenditure</p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(financialData.summary.total_expenditure)}
                </p>
              </div>
              <DollarSign className="text-orange-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Budget Balance</p>
                <p className={`text-xl font-bold ${getBalanceColor(financialData.summary.budget_balance)}`}>
                  {formatCurrency(financialData.summary.budget_balance)}
                </p>
              </div>
              <DollarSign className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Funds Balance</p>
                <p className={`text-xl font-bold ${getBalanceColor(financialData.summary.funds_balance)}`}>
                  {formatCurrency(financialData.summary.funds_balance)}
                </p>
              </div>
              <PiggyBank className="text-teal-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading financial data...</p>
          </div>
        ) : (
          <>
            {renderTable()}

            {/* Pagination */}
            {financialData && financialData.pagination && (
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, financialData.pagination.total_items)} of {financialData.pagination.total_items} results
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(financialData.pagination.total_pages, p + 1))}
                    disabled={currentPage === financialData.pagination.total_pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
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