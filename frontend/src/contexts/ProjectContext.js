// contexts/ProjectContext.js
/**
 * FIXED: Correctly handles paginated API responses
 * Backend returns: { total, skip, limit, data: [...] }
 * We extract the 'data' array
 */
import React, { createContext, useState, useContext, useCallback } from 'react';
import projectService from '../services/projectService';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [fundingAgencies, setFundingAgencies] = useState([]);
  const [technicalGroups, setTechnicalGroups] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalAllocation: 0,
    totalFunds: 0,
    totalExpenditure: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all initial data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsData, agenciesData, groupsData, statsData] = await Promise.all([
        projectService.getAllProjects(),
        projectService.getAllFundingAgencies(),
        projectService.getAllTechnicalGroups(),
        projectService.getDashboardStats(),
      ]);

      // FIXED: Extract 'data' array from paginated response
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData?.data || []);
      setFundingAgencies(Array.isArray(agenciesData) ? agenciesData : agenciesData?.data || []);
      setTechnicalGroups(Array.isArray(groupsData) ? groupsData : groupsData?.data || []);
      
      // Handle dashboard stats
      if (statsData) {
        setDashboardStats({
          totalProjects: statsData.total_projects || 0,
          activeProjects: statsData.active_projects || 0,
          totalAllocation: statsData.total_allocation || 0,
          totalFunds: statsData.total_funds || 0,
          totalExpenditure: statsData.total_expenditure || 0,
          balance: statsData.balance || 0,
        });
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh projects and stats
  const refreshProjects = useCallback(async () => {
    try {
      const [projectsData, statsData] = await Promise.all([
        projectService.getAllProjects(),
        projectService.getDashboardStats(),
      ]);
      
      // FIXED: Extract 'data' array from paginated response
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData?.data || []);
      
      if (statsData) {
        setDashboardStats({
          totalProjects: statsData.total_projects || 0,
          activeProjects: statsData.active_projects || 0,
          totalAllocation: statsData.total_allocation || 0,
          totalFunds: statsData.total_funds || 0,
          totalExpenditure: statsData.total_expenditure || 0,
          balance: statsData.balance || 0,
        });
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Refresh funding agencies
  const refreshFundingAgencies = useCallback(async () => {
    try {
      const agenciesData = await projectService.getAllFundingAgencies();
      // FIXED: Handle possible paginated response
      setFundingAgencies(Array.isArray(agenciesData) ? agenciesData : agenciesData?.data || []);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Refresh technical groups
  const refreshTechnicalGroups = useCallback(async () => {
    try {
      const groupsData = await projectService.getAllTechnicalGroups();
      // FIXED: Handle possible paginated response
      setTechnicalGroups(Array.isArray(groupsData) ? groupsData : groupsData?.data || []);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = {
    projects,
    fundingAgencies,
    technicalGroups,
    dashboardStats,
    loading,
    error,
    loadInitialData,
    refreshProjects,
    refreshFundingAgencies,
    refreshTechnicalGroups,
    setError,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;