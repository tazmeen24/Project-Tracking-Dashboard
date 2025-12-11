// frontend/src/components/ReportGenerationModal.jsx
import React, { useState } from 'react';
import { X, FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import reportService from '../../services/reportService';

const ReportGenerationModal = ({ isOpen, onClose, projectId, projectTitle }) => {
  const [reportType, setReportType] = useState('comprehensive');
  const [format, setFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [includeSections, setIncludeSections] = useState({
    financial_summary: true,
    budget_allocation: true,
    funds_expenditure: true,
    category_breakdown: true,
    detailed_transactions: false,
    charts: false
  });

  const handleSectionToggle = (section) => {
    setIncludeSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleGenerateReport = async () => {
  setIsGenerating(true);
  setError(null);

  try {
    // Remove the dynamic import, just use the service directly
    const { blob, filename } = await reportService.generateReport(projectId, {
      reportType,
      format,
      includeSections
    });

    reportService.downloadReport(blob, filename);

    setTimeout(() => {
      onClose();
      setIsGenerating(false);
    }, 500);

  } catch (err) {
    console.error('Report generation error:', err);
    setError(err.response?.data?.detail || 'Failed to generate report. Please try again.');
    setIsGenerating(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Generate Report</h2>
            <p className="text-sm text-gray-600 mt-1">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="reportType"
                  value="comprehensive"
                  checked={reportType === 'comprehensive'}
                  onChange={(e) => setReportType(e.target.value)}
                  disabled={isGenerating}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Comprehensive Report</div>
                  <div className="text-sm text-gray-600">All details including selected sections</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="reportType"
                  value="summary"
                  checked={reportType === 'summary'}
                  onChange={(e) => setReportType(e.target.value)}
                  disabled={isGenerating}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Summary Report</div>
                  <div className="text-sm text-gray-600">Key numbers and highlights only</div>
                </div>
              </label>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                format === 'pdf' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value)}
                  disabled={isGenerating}
                  className="w-4 h-4 text-blue-600"
                />
                <FileText size={24} className={format === 'pdf' ? 'text-blue-600' : 'text-gray-600'} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">PDF</div>
                  <div className="text-xs text-gray-600">Print-ready format</div>
                </div>
              </label>
              
              <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                format === 'excel' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={(e) => setFormat(e.target.value)}
                  disabled={isGenerating}
                  className="w-4 h-4 text-blue-600"
                />
                <FileSpreadsheet size={24} className={format === 'excel' ? 'text-blue-600' : 'text-gray-600'} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Excel</div>
                  <div className="text-xs text-gray-600">Editable format</div>
                </div>
              </label>
            </div>
          </div>

          {/* Include Sections */}
          {reportType === 'comprehensive' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Include Sections
              </label>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSections.financial_summary}
                    onChange={() => handleSectionToggle('financial_summary')}
                    disabled={isGenerating}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Financial Summary</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSections.budget_allocation}
                    onChange={() => handleSectionToggle('budget_allocation')}
                    disabled={isGenerating}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Budget Allocation</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSections.funds_expenditure}
                    onChange={() => handleSectionToggle('funds_expenditure')}
                    disabled={isGenerating}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Funds & Expenditure</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSections.category_breakdown}
                    onChange={() => handleSectionToggle('category_breakdown')}
                    disabled={isGenerating}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Category Breakdown</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSections.detailed_transactions}
                    onChange={() => handleSectionToggle('detailed_transactions')}
                    disabled={isGenerating}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Detailed Transactions</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer opacity-50">
                  <input
                    type="checkbox"
                    checked={includeSections.charts}
                    onChange={() => handleSectionToggle('charts')}
                    disabled={true}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Charts & Visualizations (Coming Soon)</span>
                </label>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationModal;