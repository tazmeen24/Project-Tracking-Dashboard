// frontend/src/pages/ProjectReportPage.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  ChevronLeft,
  Calendar,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from "lucide-react";
import reportService from "../services/reportService";
import projectService from "../services/projectService";
import ReportGenerationModal from "../components/reports/ReportGenerationModal";

const ProjectReportPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const location = useLocation();
  const cameFromReportsTab = location.state?.fromReportsTab;

  useEffect(() => {
    fetchProjectAndHistory();
  }, [projectId]);

  const fetchProjectAndHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectData = await projectService.getProject(projectId);
      setProject(projectData);

      const history = await reportService.getReportHistory(projectId);
      setReportHistory(history);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportGenerated = () => {
    fetchProjectAndHistory();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFormatIcon = (format) => {
    return format === "pdf" ? (
      <FileText size={20} />
    ) : (
      <FileSpreadsheet size={20} />
    );
  };

  const getReportTypeLabel = (type) => {
    return type === "comprehensive" ? "Comprehensive" : "Summary";
  };

  const getReportTypeBadgeColor = (type) => {
    return type === "comprehensive"
      ? "bg-blue-100/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50"
      : "bg-green-100/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-900/50";
  };

  const getFormatBadgeColor = (format) => {
    return format === "pdf"
      ? "bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/50"
      : "bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => {
            if (cameFromReportsTab) {
              navigate("/reports");
            } else {
              navigate(`/projects/${projectId}`);
            }
          }}
          className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back to Project Details</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Project Reports
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              {project?.title} ({project?.project_id})
            </p>
          </div>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm"
          >
            <FileText size={20} />
            <span>Generate New Report</span>
          </button>
        </div>
      </div>

      {/* Quick Actions / Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100/80 dark:bg-blue-950/40 p-3 rounded-xl">
              <FileText className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Reports</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {reportHistory.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100/80 dark:bg-green-950/40 p-3 rounded-xl">
              <Calendar className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Last Generated</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {reportHistory.length > 0
                  ? new Date(
                      reportHistory[0].generated_at
                    ).toLocaleDateString("en-IN")
                  : "Never"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100/80 dark:bg-purple-950/40 p-3 rounded-xl">
              <Download className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Available Formats</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                PDF & Excel
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report History */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Report History
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Previously generated reports for this project
          </p>
        </div>

        {reportHistory.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No Reports Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Generate your first report to see it here
            </p>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <FileText size={20} />
              <span>Generate Report</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Report Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Generated At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Generated By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/60 dark:bg-slate-800/30 divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {reportHistory.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReportTypeBadgeColor(
                          report.report_type
                        )}`}
                      >
                        {getReportTypeLabel(report.report_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getFormatBadgeColor(
                            report.format
                          )}`}
                        >
                          {getFormatIcon(report.format)}
                          <span className="uppercase ml-1">
                            {report.format}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white font-medium">
                        {report.filename}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {formatFileSize(report.file_size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(report.generated_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {report.generated_by || "System"}
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
      <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-900/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
          Report Information
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300/90">
          <p>
            • <strong className="font-semibold">Comprehensive Reports:</strong> Include all project
            details with customizable sections
          </p>
          <p>
            • <strong className="font-semibold">Summary Reports:</strong> Quick overview with key
            financial numbers only
          </p>
          <p>
            • <strong className="font-semibold">PDF Format:</strong> Best for printing and formal
            documentation
          </p>
          <p>
            • <strong className="font-semibold">Excel Format:</strong> Editable format for further
            analysis and modifications
          </p>
          <p>
            • <strong className="font-semibold">Reports are generated on-demand</strong> and reflect the
            current state of project data
          </p>
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
        projectTitle={project?.title || "Project Report"}
      />
    </div>
  );
};

export default ProjectReportPage;