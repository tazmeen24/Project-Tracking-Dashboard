// pages/Dashboard.js - IMPROVED DARK MODE
/**
 *  :
 * - Enhanced dark mode compatibility
 * - Consistent color scheme across light and dark modes
 * - Improved text visibility in both modes
 */
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts/ProjectContext";
import {
  TrendingUp,
  FolderOpen,
  CheckCircle2,
  Calendar,
  DollarSign,
} from "lucide-react";
import Card from "../components/common/Card";
import { formatCurrency, getProjectStatus } from "../utils/helpers";

const Dashboard = () => {
  const navigate = useNavigate();
  const { dashboardStats, projects, loadInitialData, loading } = useProject();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const projectList = Array.isArray(projects) ? projects : [];
  const recentProjects = projectList.slice(0, 5);

  const stats = [
    {
      label: "Total Budget",
      value: formatCurrency(dashboardStats?.totalAllocation ?? 0),
      change: "Approved budget",
      icon: DollarSign,
      trend: "neutral",
      color: "blue",
    },
    {
      label: "Funds Received",
      value: formatCurrency(dashboardStats?.totalFunds ?? 0),
      change: "Total received",
      icon: CheckCircle2,
      trend: "up",
      color: "emerald",
    },
    {
      label: "Total Expenditure",
      value: formatCurrency(dashboardStats?.totalExpenditure ?? 0),
      change: "Total spent",
      icon: TrendingUp,
      trend: "neutral",
      color: "indigo",
    },
    {
      label: "Funds Balance",
      value: formatCurrency(
        (dashboardStats?.totalFunds ?? 0) -
          (dashboardStats?.totalExpenditure ?? 0)
      ),
      change: "Available funds",
      icon: FolderOpen,
      trend: "neutral",
      color: "purple",
    },
    {
      label: "Budget Balance",
      value: formatCurrency(dashboardStats?.balance ?? 0),
      change: "Remaining budget",
      icon: Calendar,
      trend: "neutral",
      color: "amber",
    },
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
    emerald:
      "from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700",
    indigo:
      "from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700",
    purple:
      "from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700",
    amber: "from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
          <span className="text-slate-700 dark:text-slate-300 font-medium text-lg">
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Welcome back! Here's an overview of your projects and finances.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            hover
            className="relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            style={{
              animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
            }}
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${
                colorClasses[stat.color]
              } rounded-full -mr-16 -mt-16 opacity-10 dark:opacity-20`}
            ></div>

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${
                    colorClasses[stat.color]
                  } rounded-xl flex items-center justify-center shadow-lg`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm flex items-center gap-1 text-slate-600 dark:text-slate-400">
                {stat.trend === "up" && (
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                {stat.change}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Recent Projects
          </h2>
          <button
            onClick={() => navigate("/projects")}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
          >
            View all →
          </button>
        </div>

        <div className="grid gap-4">
          {recentProjects.length > 0 ? (
            recentProjects.map((project, index) => (
              <Card
                key={project.project_id}
                hover
                onClick={() => navigate(`/projects/${project.project_id}`)}
                className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                style={{
                  animation: `slideInRight 0.6s ease-out ${index * 0.1}s both`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {project.title || "Untitled Project"}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getProjectStatus(project) === "Active"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {getProjectStatus(project)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {project.start_date
                          ? new Date(project.start_date).toLocaleDateString()
                          : "No date"}
                      </span>
                      <span>{project.project_no || "—"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Total Allocation
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(project.total_allocation || 0)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No projects yet. Create your first project!
              </p>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
