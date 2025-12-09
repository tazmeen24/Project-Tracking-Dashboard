/**
 * Analytics Page - Complete Dashboard
 * Integrates Phase 1 (Overview) + Phase 2 (Burn Rate, Variance, FY Comparison)
 * with tabbed navigation
 */

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import analyticsService from '../services/analyticsService';
import BurnRateAnalysis from '../components/analytics/BurnRateAnalysis';
import VarianceAnalysis from '../components/analytics/VarianceAnalysis';
import FYComparison from '../components/analytics/FYComparison';
import ExportButton from '../components/analytics/ExportButton';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Phase 1 State
  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [kpis, setKPIs] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [projectsAtRisk, setProjectsAtRisk] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    }
  }, [activeTab]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [health, kpiData, cashFlowData, atRisk, categories] = await Promise.all([
        analyticsService.getPortfolioHealth(),
        analyticsService.getKPIs(),
        analyticsService.getCashFlow(12),
        analyticsService.getProjectsAtRisk(20),
        analyticsService.getCategoryDistribution()
      ]);

      setPortfolioHealth(health);
      setKPIs(kpiData);
      setCashFlow(cashFlowData);
      console.log('Cash Flow Data:', cashFlowData); // Debug log
      setProjectsAtRisk(atRisk);
      setCategoryDistribution(categories);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', description: 'Portfolio health & KPIs' },
    { id: 'burnrate', label: 'Burn Rate', icon: '🔥', description: 'Spending velocity & runway' },
    { id: 'variance', label: 'Variance', icon: '📈', description: 'Budget vs actual analysis' },
    { id: 'fycomparison', label: 'FY Comparison', icon: '📅', description: 'Year-over-year trends' }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive financial analytics and insights for research projects
              </p>
            </div>
            <ExportButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB (Phase 1) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading analytics data...</div>
              </div>
            ) : (
              <>
                {/* Portfolio Health Cards */}
                {portfolioHealth && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Health</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Total Projects</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {portfolioHealth.total_projects}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Total Budget</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {formatCurrency(portfolioHealth.total_budget_value)}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Funds Received</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {formatCurrency(portfolioHealth.total_funds_received)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {portfolioHealth.funds_vs_budget_percentage.toFixed(1)}% of budget
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Total Expenditure</p>
                        <p className="text-3xl font-bold text-orange-600 mt-2">
                          {formatCurrency(portfolioHealth.total_expenditure)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                        <p className="text-blue-700 text-sm font-medium">Funds Balance</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">
                          {formatCurrency(portfolioHealth.current_funds_balance)}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">Available cash position</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                        <p className="text-green-700 text-sm font-medium">Budget Balance</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">
                          {formatCurrency(portfolioHealth.current_budget_balance)}
                        </p>
                        <p className="text-sm text-green-600 mt-1">Remaining authorization</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {kpis && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Budget Compliance</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {kpis.budget_compliance_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Projects within budget</p>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Funds Utilization</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {kpis.funds_utilization_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Of received funds spent</p>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Avg. Time to Funds</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {kpis.avg_time_to_first_funds ? `${kpis.avg_time_to_first_funds.toFixed(0)}` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Days from project start</p>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-gray-600 text-sm">Active Projects</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {kpis.active_projects_count}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {kpis.completed_projects_count} completed
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cash Flow Chart */}
                  {cashFlow && cashFlow.data_points && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Cash Flow Trends
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={cashFlow.data_points}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="funds_received" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            name="Funds Received"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="expenditure" 
                            stroke="#EF4444" 
                            strokeWidth={2}
                            name="Expenditure"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Category Distribution Chart */}
                  {categoryDistribution && categoryDistribution.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Budget by Category
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryDistribution}
                            dataKey="total_budget"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.category}: ${entry.percentage_of_total.toFixed(0)}%`}
                          >
                            {categoryDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Projects at Risk Table */}
                {projectsAtRisk && projectsAtRisk.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Projects at Risk
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({projectsAtRisk.length} projects with low funds balance)
                        </span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Project
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              PI
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Funds Balance
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              % of Budget
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {projectsAtRisk.slice(0, 10).map((project) => (
                            <tr key={project.project_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`
                                  px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                  ${project.risk_level === 'high' ? 'bg-red-100 text-red-800' : 
                                    project.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-blue-100 text-blue-800'}
                                `}>
                                  {project.risk_level}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {project.project_code}
                                </div>
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {project.project_title}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {project.pi_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {formatCurrency(project.funds_balance)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <span className={`font-medium ${
                                  project.funds_balance_percentage < 10 ? 'text-red-600' :
                                  project.funds_balance_percentage < 20 ? 'text-yellow-600' :
                                  'text-gray-900'
                                }`}>
                                  {project.funds_balance_percentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Category Distribution Table */}
                {categoryDistribution && categoryDistribution.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Spending by Category
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Total Budget
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Total Spent
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Utilization
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              % of Total Budget
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {categoryDistribution.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cat.category}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {formatCurrency(cat.total_budget)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {formatCurrency(cat.total_spent)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <span className={`font-medium ${
                                  cat.utilization_percentage > 90 ? 'text-orange-600' :
                                  cat.utilization_percentage > 70 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {cat.utilization_percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {cat.percentage_of_total.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* BURN RATE TAB (Phase 2) */}
        {activeTab === 'burnrate' && <BurnRateAnalysis />}

        {/* VARIANCE TAB (Phase 2) */}
        {activeTab === 'variance' && <VarianceAnalysis />}

        {/* FY COMPARISON TAB (Phase 2) */}
        {activeTab === 'fycomparison' && <FYComparison />}
      </div>
    </div>
  );
};

export default AnalyticsPage;