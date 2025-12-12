/**
 * Analytics Page - Complete Dashboard
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
      console.log('Cash Flow Data:', cashFlowData);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-sm">
        <div className="px-6 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Comprehensive financial analytics and insights for research projects
              </p>
            </div>
            <ExportButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-t border-slate-200/50 dark:border-slate-700/50">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }
                `}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-normal">{tab.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div>
        {/* OVERVIEW TAB (Phase 1) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="text-slate-600 dark:text-slate-400">Loading analytics data...</div>
              </div>
            ) : (
              <>
                {/* Portfolio Health Cards */}
                {portfolioHealth && (
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Portfolio Health</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Total Projects</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                          {portfolioHealth.total_projects}
                        </p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Total Budget</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                          {formatCurrency(portfolioHealth.total_budget_value)}
                        </p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Funds Received</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                          {formatCurrency(portfolioHealth.total_funds_received)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {portfolioHealth.funds_vs_budget_percentage.toFixed(1)}% of budget
                        </p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Total Expenditure</p>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                          {formatCurrency(portfolioHealth.total_expenditure)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm rounded-xl border border-blue-200/50 dark:border-blue-900/50 p-6">
                        <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Funds Balance</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-200 mt-2">
                          {formatCurrency(portfolioHealth.current_funds_balance)}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Available cash position</p>
                      </div>
                      
                      <div className="bg-green-50/80 dark:bg-green-950/30 backdrop-blur-sm rounded-xl border border-green-200/50 dark:border-green-900/50 p-6">
                        <p className="text-green-700 dark:text-green-300 text-sm font-medium">Budget Balance</p>
                        <p className="text-3xl font-bold text-green-900 dark:text-green-200 mt-2">
                          {formatCurrency(portfolioHealth.current_budget_balance)}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">Remaining authorization</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {kpis && (
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Key Performance Indicators</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Budget Compliance</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                          {kpis.budget_compliance_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Projects within budget</p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Funds Utilization</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                          {kpis.funds_utilization_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Of received funds spent</p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Avg. Time to Funds</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                          {kpis.avg_time_to_first_funds ? `${kpis.avg_time_to_first_funds.toFixed(0)}` : 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Days from project start</p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Active Projects</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                          {kpis.active_projects_count}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Cash Flow Trends
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={cashFlow.data_points}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            stroke="currentColor"
                            className="text-slate-600 dark:text-slate-400"
                          />
                          <YAxis 
                            tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                            stroke="currentColor"
                            className="text-slate-600 dark:text-slate-400"
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: 'rgb(var(--tooltip-bg, 255 255 255))',
                              border: '1px solid rgb(var(--tooltip-border, 226 232 240))',
                              borderRadius: '0.5rem'
                            }}
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
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
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
                  <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Projects at Risk
                        <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                          ({projectsAtRisk.length} projects with low funds balance)
                        </span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
                        <thead className="bg-slate-50/80 dark:bg-slate-900/30">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Project
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              PI
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Funds Balance
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              % of Budget
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/60 dark:bg-slate-800/30 divide-y divide-slate-200/50 dark:divide-slate-700/50">
                          {projectsAtRisk.slice(0, 10).map((project) => (
                            <tr key={project.project_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`
                                  px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                  ${project.risk_level === 'high' ? 'bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/50' : 
                                    project.risk_level === 'medium' ? 'bg-yellow-100/80 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-900/50' : 
                                    'bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50'}
                                `}>
                                  {project.risk_level}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                  {project.project_code}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                  {project.project_title}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                {project.pi_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
                                {formatCurrency(project.funds_balance)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <span className={`font-medium ${
                                  project.funds_balance_percentage < 10 ? 'text-red-600 dark:text-red-400' :
                                  project.funds_balance_percentage < 20 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-slate-900 dark:text-white'
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
                  <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Spending by Category
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
                        <thead className="bg-slate-50/80 dark:bg-slate-900/30">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Total Budget
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Total Spent
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              Utilization
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                              % of Total Budget
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/60 dark:bg-slate-800/30 divide-y divide-slate-200/50 dark:divide-slate-700/50">
                          {categoryDistribution.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                {cat.category}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
                                {formatCurrency(cat.total_budget)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
                                {formatCurrency(cat.total_spent)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <span className={`font-medium ${
                                  cat.utilization_percentage > 90 ? 'text-orange-600 dark:text-orange-400' :
                                  cat.utilization_percentage > 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-green-600 dark:text-green-400'
                                }`}>
                                  {cat.utilization_percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right">
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