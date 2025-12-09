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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}:</span>
              <span className="text-sm font-semibold">
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
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Total Received</div>
          <div className="text-lg font-bold text-green-700">
            {formatCurrency(totalFundsReceived)}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Total Spent</div>
          <div className="text-lg font-bold text-red-700">
            {formatCurrency(totalExpenditure)}
          </div>
        </div>
        <div className={`${netCashFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'} rounded-lg p-3`}>
          <div className="text-xs text-gray-600 mb-1">Net Flow</div>
          <div className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {formatCurrency(netCashFlow)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
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

      {/* Legend Description */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>• <span className="text-green-600 font-semibold">Funds Received</span>: Total funds received from funding agencies</p>
        <p>• <span className="text-red-600 font-semibold">Expenditure</span>: Total expenditure across all budget heads</p>
        <p>• <span className="text-blue-600 font-semibold">Net Cash Flow</span>: Difference between funds received and expenditure</p>
      </div>
    </div>
  );
};

export default CashFlowChart;