/**
 * Financial Year Comparison Component
 * Compare metrics across multiple financial years
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import analyticsService from '../../services/analyticsService';

const FYComparison = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [years, setYears] = useState(3);
  const [selectedMetric, setSelectedMetric] = useState('budget');

  useEffect(() => {
    fetchData(years);
  }, [years]);

  const fetchData = async (numYears) => {
    try {
      setLoading(true);
      const result = await analyticsService.getFYComparison(numYears);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load FY comparison');
      console.error(err);
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

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return '↑';
    if (growth < 0) return '↓';
    return '→';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading FY comparison...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => fetchData(years)}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.financial_years.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No financial year data available</p>
      </div>
    );
  }

  const currentFY = data.summary.current_fy;
  const previousFY = data.summary.previous_fy;

  // Prepare chart data based on selected metric
  const getChartData = () => {
    return data.financial_years.map(fy => ({
      fy: fy.financial_year,
      value: fy[`total_${selectedMetric}`] || 0
    })).reverse(); // Reverse to show oldest first
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'budget': return 'Budget';
      case 'funds_received': return 'Funds Received';
      case 'expenditure': return 'Expenditure';
      default: return 'Value';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Year Comparison</h2>
        <p className="text-gray-600 mt-1">
          Track year-over-year trends and growth across financial years
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Years to Compare:</label>
          <select
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="2">2 Years</option>
            <option value="3">3 Years</option>
            <option value="4">4 Years</option>
            <option value="5">5 Years</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="budget">Budget</option>
            <option value="funds_received">Funds Received</option>
            <option value="expenditure">Expenditure</option>
          </select>
        </div>
      </div>

      {/* Current vs Previous FY */}
      {currentFY && previousFY && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current FY */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">{currentFY.financial_year} (Current)</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-700">Total Projects</p>
                <p className="text-2xl font-bold text-blue-900">{currentFY.total_projects}</p>
                <p className="text-xs text-blue-600">
                  {currentFY.new_projects} new, {currentFY.completed_projects} completed
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Budget</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(currentFY.total_budget)}</p>
                {currentFY.yoy_budget_growth !== null && currentFY.yoy_budget_growth !== undefined && (
                  <p className={`text-sm font-medium ${getGrowthColor(currentFY.yoy_budget_growth)}`}>
                    {getGrowthIcon(currentFY.yoy_budget_growth)} {currentFY.yoy_budget_growth.toFixed(1)}% YoY
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-blue-700">Funds Received</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(currentFY.total_funds_received)}</p>
                {currentFY.yoy_funds_growth !== null && currentFY.yoy_funds_growth !== undefined && (
                  <p className={`text-sm font-medium ${getGrowthColor(currentFY.yoy_funds_growth)}`}>
                    {getGrowthIcon(currentFY.yoy_funds_growth)} {currentFY.yoy_funds_growth.toFixed(1)}% YoY
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-blue-700">Expenditure</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(currentFY.total_expenditure)}</p>
                {currentFY.yoy_expenditure_growth !== null && currentFY.yoy_expenditure_growth !== undefined && (
                  <p className={`text-sm font-medium ${getGrowthColor(currentFY.yoy_expenditure_growth)}`}>
                    {getGrowthIcon(currentFY.yoy_expenditure_growth)} {currentFY.yoy_expenditure_growth.toFixed(1)}% YoY
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Previous FY */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{previousFY.financial_year} (Previous)</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-700">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{previousFY.total_projects}</p>
                <p className="text-xs text-gray-600">
                  {previousFY.new_projects} new, {previousFY.completed_projects} completed
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-700">Budget</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(previousFY.total_budget)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-700">Funds Received</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(previousFY.total_funds_received)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-700">Expenditure</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(previousFY.total_expenditure)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {getMetricLabel()} Trend
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={getChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fy" />
            <YAxis 
              tickFormatter={(value) => `₹${(value / 1000000).toFixed(0)}M`}
            />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `FY: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              strokeWidth={3}
              name={getMetricLabel()}
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Year
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Funds Received
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenditure
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.financial_years.map((fy, idx) => (
                <tr key={fy.fy_year} className={idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{fy.financial_year}</div>
                    {idx === 0 && <span className="text-xs text-blue-600 font-semibold">Current</span>}
                    <div className="text-xs text-gray-500">
                      {fy.new_projects} new • {fy.completed_projects} completed
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-gray-900">{fy.total_projects}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(fy.total_budget)}</div>
                    {fy.yoy_budget_growth !== null && fy.yoy_budget_growth !== undefined && (
                      <div className={`text-xs font-medium ${getGrowthColor(fy.yoy_budget_growth)}`}>
                        {getGrowthIcon(fy.yoy_budget_growth)} {fy.yoy_budget_growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(fy.total_funds_received)}</div>
                    {fy.yoy_funds_growth !== null && fy.yoy_funds_growth !== undefined && (
                      <div className={`text-xs font-medium ${getGrowthColor(fy.yoy_funds_growth)}`}>
                        {getGrowthIcon(fy.yoy_funds_growth)} {fy.yoy_funds_growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(fy.total_expenditure)}</div>
                    {fy.yoy_expenditure_growth !== null && fy.yoy_expenditure_growth !== undefined && (
                      <div className={`text-xs font-medium ${getGrowthColor(fy.yoy_expenditure_growth)}`}>
                        {getGrowthIcon(fy.yoy_expenditure_growth)} {fy.yoy_expenditure_growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {fy.funds_utilization ? fy.funds_utilization.toFixed(1) : '0.0'}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📘 Understanding FY Comparison</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Financial Year:</strong> April 1 to March 31 (Indian FY)</li>
          <li>• <strong>YoY Growth:</strong> Year-over-year percentage change from previous FY</li>
          <li>• <strong>Utilization:</strong> Percentage of received funds that have been spent</li>
          <li>• <strong>Green arrows (↑):</strong> Growth/increase from previous year</li>
          <li>• <strong>Red arrows (↓):</strong> Decline/decrease from previous year</li>
        </ul>
      </div>
    </div>
  );
};

export default FYComparison;