// frontend/src/pages/UCCreatePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  Eye,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import ucService from '../services/ucService';

const UCCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project;

  const [financialYear, setFinancialYear] = useState(ucService.getCurrentFinancialYear());
  const [format, setFormat] = useState('docx');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const fyOptions = ucService.getFinancialYearOptions();

  useEffect(() => {
    if (!project) {
      navigate('/uc-management');
    }
  }, [project, navigate]);

  const handlePreview = async () => {
    try {
      setIsPreviewLoading(true);
      setError(null);
      
      const data = await ucService.getUCData(
        project.project_id || project.id,
        financialYear
      );
      
      setPreviewData(data);
      setShowPreview(true);
    } catch (err) {
      console.error('Error loading preview:', err);
      setError('Failed to load UC preview. Please try again.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);

      const projectId = project.project_id || project.id;
      console.log('📥 Generating UC...', { projectId, financialYear, format });
      
      const blob = await ucService.generateUC(projectId, financialYear, format);
      console.log('📥 Received blob:', blob instanceof Blob, blob);
      
      if (!(blob instanceof Blob)) {
        throw new Error('Invalid response format - expected file data');
      }
      
      ucService.downloadUC(blob, projectId, financialYear, format);
      
      setSuccess(`UC generated successfully for FY ${financialYear}`);
    } catch (err) {
      console.error('Error generating UC:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate UC. Please ensure the project has data for the selected financial year.';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/uc-management')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Generate Utilization Certificate
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {project.title}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start">
          <AlertCircle className="text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50/90 dark:bg-green-950/30 backdrop-blur-sm border border-green-200 dark:border-green-900/50 rounded-xl p-4 flex items-start">
          <CheckCircle className="text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Configuration Card */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          UC Configuration
        </h2>

        <div className="space-y-6">
          {/* Project Info */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Project
            </label>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
              <p className="font-medium text-slate-900 dark:text-white">
                {project.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {project.project_no || 'N/A'}
              </p>
            </div>
          </div>

          {/* Financial Year Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent transition-all"
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy} (April {fy.split('-')[0]} - March 20{fy.split('-')[1]})
                </option>
              ))}
            </select>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <FileText size={16} className="inline mr-1" />
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('docx')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'docx'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <FileText className={`mx-auto mb-2 ${format === 'docx' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} size={24} />
                <p className={`text-sm font-medium ${format === 'docx' ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  Word Document
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">.docx</p>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <FileText className={`mx-auto mb-2 ${format === 'pdf' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} size={24} />
                <p className={`text-sm font-medium ${format === 'pdf' ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  PDF Document
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">.pdf</p>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handlePreview}
              disabled={isPreviewLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPreviewLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-700 dark:border-slate-300 mr-2"></div>
                  Loading Preview...
                </>
              ) : (
                <>
                  <Eye size={20} className="mr-2" />
                  Preview Data
                </>
              )}
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download size={20} className="mr-2" />
                  Generate UC
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      {showPreview && previewData && (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
            UC Preview - FY {financialYear}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Financial Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Opening Balance</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(previewData.opening_balance)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Grants Received</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(previewData.grants_received.total)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Expenditure</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(previewData.expenditure.total)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Closing Balance</span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatCurrency(previewData.closing_balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Component Breakdown */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Component Breakdown
              </h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">General</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(previewData.grants_received.general)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Consumables, Travel, Contingency, Overhead
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Salary (Recurring)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(previewData.grants_received.salary)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Manpower expenses</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Capital Assets (Non-Recurring)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(previewData.grants_received.capital_assets)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Equipment purchases</p>
                </div>
              </div>
            </div>
          </div>

          {/* Installments */}
          {previewData.installments && previewData.installments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                Installments Received
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Sanction No.
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {previewData.installments.map((inst, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                          {inst.installment_number}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                          {inst.sanction_number}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                          {new Date(inst.date_received).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(inst.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UCCreatePage;