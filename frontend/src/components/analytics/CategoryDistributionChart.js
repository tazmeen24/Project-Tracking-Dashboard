import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const CategoryDistributionChart = ({ data }) => {
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip - DARK MODE COMPATIBLE
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const utilizationRate = data.total_budget > 0 
        ? (data.total_spent / data.total_budget * 100).toFixed(2)
        : 0;
      
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">{data.category}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">Budget:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCurrency(data.total_budget)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">Spent:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCurrency(data.total_spent)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">Remaining:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCurrency(data.total_budget - data.total_spent)}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">Utilization:</span>
                <span className={`text-sm font-semibold ${
                  utilizationRate > 100 ? 'text-red-600 dark:text-red-400' : 
                  utilizationRate > 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {utilizationRate}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">% of Total:</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {data.percentage_of_total.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Color palette for categories
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ef4444', // red
    '#06b6d4', // cyan
  ];

  // Prepare chart data
  const chartData = data.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    utilization: item.total_budget > 0 
      ? ((item.total_spent / item.total_budget) * 100).toFixed(2)
      : 0
  }));

  // Calculate totals
  const totalBudget = data.reduce((sum, item) => sum + item.total_budget, 0);
  const totalSpent = data.reduce((sum, item) => sum + item.total_spent, 0);
  const overallUtilization = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(2) : 0;

  return (
    <div>
      {/* Summary - DARK MODE COMPATIBLE */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50 dark:border-blue-900/50">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Budget</div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
            {formatCurrency(totalBudget)}
          </div>
        </div>
        <div className="bg-green-50/80 dark:bg-green-950/30 backdrop-blur-sm rounded-lg p-3 border border-green-200/50 dark:border-green-900/50">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Overall Utilization</div>
          <div className={`text-lg font-bold ${
            overallUtilization > 100 ? 'text-red-700 dark:text-red-400' :
            overallUtilization > 80 ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'
          }`}>
            {overallUtilization}%
          </div>
        </div>
      </div>

      {/* Chart - DARK MODE COMPATIBLE */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 20, bottom: 70 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="currentColor" 
              className="text-slate-200 dark:text-slate-700" 
            />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="currentColor"
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              stroke="currentColor"
              tickFormatter={(value) => {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
                return `₹${value}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="rect"
            />
            <Bar 
              dataKey="total_budget" 
              name="Budget" 
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="total_spent" 
              name="Spent"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => {
                const utilization = parseFloat(entry.utilization);
                const color = utilization > 100 ? '#ef4444' : 
                             utilization > 80 ? '#f59e0b' : '#10b981';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown - DARK MODE COMPATIBLE */}
      <div className="mt-4 space-y-2">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span>{formatCurrency(item.total_spent)} / {formatCurrency(item.total_budget)}</span>
              <span className={`font-semibold ${
                parseFloat(item.utilization) > 100 ? 'text-red-600 dark:text-red-400' :
                parseFloat(item.utilization) > 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {item.utilization}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryDistributionChart;