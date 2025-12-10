// frontend/src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  ChevronLeft, 
  Calendar,
  FileSpreadsheet,
  Loader2,
  AlertCircle
} from 'lucide-react';
import reportService from '../services/reportService';
import projectService from '../services/projectService';
import ReportGenerationModal from '../components/reports/ReportGenerationModal';

const Reports = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    fetchProjectAndHistory();
  }, [projectId]);

  const fetchProjectAndHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch project details
      const projectData = await projectService.getProject(projectId);
      setProject(projectData);

      // Fetch report history
      const history = await reportService.getReportHistory(projectId);
      setReportHistory(history);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportGenerated = () => {
    // Refresh report history after generating new report
    fetchProjectAndHistory();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormatIcon = (format) => {
    return format === 'pdf' ? <FileText size={20} /> : <FileSpreadsheet size={20} />;
  };

  const getReportTypeLabel = (type) => {
    return type === 'comprehensive' ? 'Comprehensive' : 'Summary';
  };

  const getReportTypeBadgeColor = (type) => {
    return type === 'comprehensive' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getFormatBadgeColor = (format) => {
    return format === 'pdf' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-emerald-100 text-emerald-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Back to Project Details</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Reports</h1>
              <p className="text-gray-600 mt-1">
                {project?.title} ({project?.project_id})
              </p>
            </div>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <FileText size={20} />
              <span>Generate New Report</span>
            </button>
          </div>
        </div>

        {/* Quick Actions / Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{reportHistory.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Generated</p>
                <p className="text-lg font-semibold text-gray-900">
                  {reportHistory.length > 0 
                    ? new Date(reportHistory[0].generated_at).toLocaleDateString('en-IN')
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Download className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Formats</p>
                <p className="text-lg font-semibold text-gray-900">PDF & Excel</p>
              </div>
            </div>
          </div>
        </div>

        {/* Report History */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Report History</h2>
            <p className="text-sm text-gray-600 mt-1">
              Previously generated reports for this project
            </p>
          </div>

          {reportHistory.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
              <p className="text-gray-600 mb-6">
                Generate your first report to see it here
              </p>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText size={20} />
                <span>Generate Report</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generated At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generated By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportHistory.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReportTypeBadgeColor(report.report_type)}`}>
                          {getReportTypeLabel(report.report_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getFormatBadgeColor(report.format)}`}>
                            {getFormatIcon(report.format)}
                            <span className="uppercase ml-1">{report.format}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {report.filename}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatFileSize(report.file_size)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(report.generated_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {report.generated_by || 'System'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Report Information</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Comprehensive Reports:</strong> Include all project details with customizable sections</p>
            <p>• <strong>Summary Reports:</strong> Quick overview with key financial numbers only</p>
            <p>• <strong>PDF Format:</strong> Best for printing and formal documentation</p>
            <p>• <strong>Excel Format:</strong> Editable format for further analysis and modifications</p>
            <p>• <strong>Reports are generated on-demand</strong> and reflect the current state of project data</p>
          </div>
        </div>
      </div>

      {/* Report Generation Modal */}
      <ReportGenerationModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          handleReportGenerated();
        }}
        projectId={projectId}
        projectTitle={project?.title || 'Project Report'}
      />
    </div>
  );
};

export default Reports;