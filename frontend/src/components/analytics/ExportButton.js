/**
 * Export Button Component
 * Reusable button with dropdown for Excel export
 */

import React, { useState } from 'react';
import analyticsService from '../../services/analyticsService';

const ExportButton = ({ exportType = 'summary', className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (type) => {
    try {
      setLoading(true);
      await analyticsService.exportToExcel(type);
      setShowMenu(false);
      // Show success notification (you can integrate with your notification system)
      alert('Export successful! File downloaded.');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <span>📥</span>
        {loading ? 'Exporting...' : 'Export'}
        <span className="text-xs">▼</span>
      </button>

      {showMenu && !loading && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => handleExport('summary')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              📊 Summary Report
            </button>
            <button
              onClick={() => handleExport('variance')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              📈 Variance Analysis
            </button>
            <button
              onClick={() => handleExport('burn_rate')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              🔥 Burn Rate Analysis
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default ExportButton;