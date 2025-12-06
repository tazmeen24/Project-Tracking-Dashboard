// frontend/src/pages/ProjectFinancialsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BudgetHeadSection from "../components/finances/BudgetHeadSection";
import FinancialSummaryCards from "../components/finances/financialSummaryCards";
import LoadingSkeleton from "../components/finances/LoadingSkeleton";

// Import services
import financeService from "../services/financeService";
import authService from "../services/authService";
import projectService from "../services/projectService";

const BUDGET_HEADS = [
  { key: "manpower", label: "Manpower", icon: "👥" },
  { key: "equipment", label: "Equipment", icon: "🔧" },
  { key: "consumables", label: "Consumables", icon: "🧪" },
  { key: "contingency", label: "Contingency", icon: "💼" },
  { key: "travel & training", label: "Travel & Training", icon: "✈️" },
  { key: "overhead", label: "Overhead", icon: "🏢" },
];

const ProjectFinancialsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);

  // Summary data (always loaded)
  const [summaries, setSummaries] = useState({});

  // Detailed data (lazy loaded per head)
  const [expandedHeads, setExpandedHeads] = useState({});
  const [detailsCache, setDetailsCache] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // Breakdown cache (for inline expansion)
  const [breakdownCache, setBreakdownCache] = useState({});

  // User info for permissions
  const [user, setUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

  // Fetch project info and user info
  useEffect(() => {
    const fetchProjectAndUser = async () => {
      try {
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          navigate("/login");
          return;
        }

        const [projectData, userData] = await Promise.all([
          projectService.getProject(projectId),
          authService.getCurrentUserProfile(),
        ]);

        setProject(projectData);
        setUser(userData.data);

        // Check permissions using service helper
        const hasEditPermission = financeService.canEditFinances(
          userData.data,
          projectData
        );
        setCanEdit(hasEditPermission);
      } catch (err) {
        console.error("Error fetching project/user:", err);
        setError("Failed to load project information");
      }
    };

    if (projectId) {
      fetchProjectAndUser();
    }
  }, [projectId, navigate]);

  // Fetch all summaries on page load
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!projectId) return;

      try {
        setLoading(true);

        // Use the organized summary method from financeService
        const organized = await financeService.getOrganizedSummary(projectId);

        setSummaries(organized);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching summaries:", err);
        setError("Failed to load financial summaries");
        setLoading(false);
      }
    };

    if (projectId) {
      fetchSummaries();
    }
  }, [projectId]);

  // Handle expanding a budget head (lazy load details)
  const handleExpand = async (head) => {
    // If already expanded, just collapse
    if (expandedHeads[head]) {
      setExpandedHeads({ ...expandedHeads, [head]: false });
      return;
    }

    // If already cached, just expand
    if (detailsCache[head]) {
      setExpandedHeads({ ...expandedHeads, [head]: true });
      return;
    }

    // Otherwise, fetch details using service
    setLoadingDetails({ ...loadingDetails, [head]: true });

    try {
      const details = await financeService.getFinancialDetailsByHead(
        projectId,
        head
      );

      // Cache the data
      setDetailsCache({
        ...detailsCache,
        [head]: details,
      });

      // Expand the section
      setExpandedHeads({ ...expandedHeads, [head]: true });
    } catch (err) {
      console.error(`Error fetching details for ${head}:`, err);
      setError(`Failed to load ${head} details`);
    } finally {
      setLoadingDetails({ ...loadingDetails, [head]: false });
    }
  };

  // Handle fetching breakdown for a fund
  const handleBreakdownExpand = async (fundId, head) => {
    if (breakdownCache[fundId]) {
      // Already cached, toggle visibility is handled by child component
      return;
    }

    try {
      const fundData = await financeService.getFundWithBreakdown(fundId);

      if (fundData.breakdown && fundData.breakdown.length > 0) {
        setBreakdownCache({
          ...breakdownCache,
          [fundId]: fundData.breakdown,
        });
      }
    } catch (err) {
      console.error("Error fetching breakdown:", err);
    }
  };

  // Handle refresh after edit/delete
  const handleRefresh = () => {
    // Clear cache for the affected head and re-fetch summaries
    setDetailsCache({});
    setExpandedHeads({});
    setBreakdownCache({});

    // Re-fetch summaries
    window.location.reload(); // Simple approach, or implement selective refresh
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall totals
  const totalFunds = Object.values(summaries).reduce(
    (sum, s) => sum + s.fundsReceived,
    0
  );
  const totalSpent = Object.values(summaries).reduce(
    (sum, s) => sum + s.expendituresTotal,
    0
  );
  const totalBalance = totalFunds - totalSpent;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          ← Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Financial Management
        </h1>
        {project && (
          <p className="text-gray-600 mt-1">
            {project.title} (Project ID: {projectId})
          </p>
        )}
      </div>

      {/* Overall Summary Cards */}
      <FinancialSummaryCards
        totalFunds={totalFunds}
        totalSpent={totalSpent}
        totalBalance={totalBalance}
      />

      {/* Budget Head Sections */}
      <div className="space-y-4 mt-6">
        {BUDGET_HEADS.map(({ key, label, icon }) => (
          <BudgetHeadSection
            key={key}
            head={key}
            label={label}
            icon={icon}
            summary={summaries[key] || {}}
            expanded={expandedHeads[key] || false}
            loading={loadingDetails[key] || false}
            details={detailsCache[key]}
            breakdownCache={breakdownCache}
            canEdit={canEdit}
            projectId={projectId}
            onExpand={() => handleExpand(key)}
            onBreakdownExpand={(fundId) => handleBreakdownExpand(fundId, key)}
            onRefresh={handleRefresh}
          />
        ))}
      </div>

      {/* Action Buttons (if admin/PI) */}
      {canEdit && (
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/finances/add-fund`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Fund Received
          </button>
          <button
            onClick={() =>
              navigate(`/projects/${projectId}/finances/add-expenditure`)
            }
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add Expenditure
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectFinancialsPage;
