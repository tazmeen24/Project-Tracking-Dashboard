// frontend/src/pages/ProjectUCsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Plus
} from 'lucide-react';
import ucService from '../services/ucService';
import projectService from '../services/projectService';

const ProjectUCsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [ucs, setUcs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch project details
      const projectData = await projectService.getProject(projectId);
      setProject(projectData);

      // Fetch UCs for this project
      const ucsData = await ucService.getProjectUCs(projectId);
      setUcs(ucsData.ucs || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadUC = async (uc, format) => {
    try {
      const blob = await ucService.generateUC(projectId, uc.financial_year, format);
      ucService.downloadUC(blob, projectId, uc.financial_year, format);
    } catch (err) {
      console.error('Error downloading UC:', err);
      alert('Failed to download UC');
    }
  };

  const handleDeleteUC = async (ucId) => {
    if (!window.confirm(
  'Are you sure you want to delete this UC? Only draft UCs can be deleted.'
)) {
  return;
}

    try {
      await ucService.deleteUC(ucId);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Error deleting UC:', err);
      alert('Failed to delete UC. Only draft UCs can be deleted.');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: {
        bg: 'bg-yellow-100/80 dark:bg-yellow-950/40',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200/50 dark:border-yellow-900/50',
        icon: Clock
      },
      submitted: {
        bg: 'bg-blue-100/80 dark:bg-blue-950/40',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200/50 dark:border-blue-900/50',
        icon: FileText
      },
      approved: {
        bg: 'bg-green-100/80 dark:bg-green-950/40',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200/50 dark:border-green-900/50',
        icon: CheckCircle
      }
    };

    const statusConfig = config[status] || config.draft;
    const Icon = statusConfig.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
        <Icon size={12} className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/uc-management')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Utilization Certificates
          </h1>
          {project && (
            <p className="text-slate-600 dark:text-slate-300">
              {project.title} • {project.project_no}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/uc/new', { state: { project } })}
          className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Create New UC
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start">
          <AlertCircle className="text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* UCs List */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Generated UCs
          </h2>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-400 mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading UCs...</p>
            </div>
          ) : ucs.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No utilization certificates generated yet
              </p>
              <button
                onClick={() => navigate('/uc/new', { state: { project } })}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                Create First UC
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {ucs.map((uc) => (
                <div
                  key={uc.uc_id}
                  className="bg-white/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-5 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          FY {uc.financial_year}
                        </h3>
                        {getStatusBadge(uc.status)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        UC No: {uc.uc_number}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Generated: {new Date(uc.generated_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Grants Received
                      </p>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(uc.total_grants_received)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Expenditure
                      </p>
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(uc.total_expenditure)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Opening Balance
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(uc.opening_balance)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Closing Balance
                      </p>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(uc.closing_balance)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownloadUC(uc, 'docx')}
                      className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Download size={16} className="mr-1" />
                      Word
                    </button>
                    <button
                      onClick={() => handleDownloadUC(uc, 'pdf')}
                      className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Download size={16} className="mr-1" />
                      PDF
                    </button>
                    {uc.status === 'draft' && (
                      <button
                        onClick={() => handleDeleteUC(uc.uc_id)}
                        className="flex items-center px-3 py-2 bg-slate-100 hover:bg-red-100 dark:bg-slate-700 dark:hover:bg-red-900/30 text-slate-700 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 text-sm font-medium rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectUCsPage;