import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

const CashFlowChart = ({ data }) => {
  // Format currency for tooltips
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip - DARK MODE COMPATIBLE
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">{entry.name}:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare chart data
  const chartData = data.data_points.map((point) => ({
    name: `${point.month} ${point.year}`,
    'Funds Received': point.funds_received,
    'Expenditure': point.expenditure,
    'Net Cash Flow': point.net_cash_flow,
  }));

  // Calculate summary statistics
  const totalFundsReceived = data.data_points.reduce((sum, point) => sum + point.funds_received, 0);
  const totalExpenditure = data.data_points.reduce((sum, point) => sum + point.expenditure, 0);
  const netCashFlow = totalFundsReceived - totalExpenditure;

  return (
    <div>
      {/* Summary Cards - DARK MODE COMPATIBLE */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50/80 dark:bg-green-950/30 backdrop-blur-sm rounded-lg p-3 border border-green-200/50 dark:border-green-900/50">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Received</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-400">
            {formatCurrency(totalFundsReceived)}
          </div>
        </div>
        <div className="bg-red-50/80 dark:bg-red-950/30 backdrop-blur-sm rounded-lg p-3 border border-red-200/50 dark:border-red-900/50">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Spent</div>
          <div className="text-lg font-bold text-red-700 dark:text-red-400">
            {formatCurrency(totalExpenditure)}
          </div>
        </div>
        <div className={`${netCashFlow >= 0 ? 'bg-blue-50/80 dark:bg-blue-950/30' : 'bg-orange-50/80 dark:bg-orange-950/30'} backdrop-blur-sm rounded-lg p-3 border ${netCashFlow >= 0 ? 'border-blue-200/50 dark:border-blue-900/50' : 'border-orange-200/50 dark:border-orange-900/50'}`}>
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Net Flow</div>
          <div className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {formatCurrency(netCashFlow)}
          </div>
        </div>
      </div>

      {/* Chart - DARK MODE COMPATIBLE */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="currentColor" 
              className="text-slate-200 dark:text-slate-700" 
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              angle={-45}
              textAnchor="end"
              height={80}
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
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            
            {/* Area for Net Cash Flow */}
            <Area
              type="monotone"
              dataKey="Net Cash Flow"
              fill="#3b82f6"
              fillOpacity={0.1}
              stroke="none"
            />
            
            {/* Lines for Funds and Expenditure */}
            <Line
              type="monotone"
              dataKey="Funds Received"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Expenditure"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Net Cash Flow"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Description - DARK MODE COMPATIBLE */}
      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p>• <span className="text-green-600 dark:text-green-400 font-semibold">Funds Received</span>: Total funds received from funding agencies</p>
        <p>• <span className="text-red-600 dark:text-red-400 font-semibold">Expenditure</span>: Total expenditure across all budget heads</p>
        <p>• <span className="text-blue-600 dark:text-blue-400 font-semibold">Net Cash Flow</span>: Difference between funds received and expenditure</p>
      </div>
    </div>
  );
};

export default CashFlowChart;