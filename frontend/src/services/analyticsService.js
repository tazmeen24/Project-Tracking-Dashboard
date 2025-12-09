/**
 * Analytics Service
 * Complete API client for all analytics endpoints (Phase 1 + Phase 2)
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class AnalyticsService {
  // =========================================================================
  // PHASE 1 - CORE ANALYTICS
  // =========================================================================

  async getPortfolioHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/portfolio-health`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching portfolio health:', error);
      throw error;
    }
  }

  async getKPIs() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/kpis`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      throw error;
    }
  }

  async getCashFlow(months = 12) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/cash-flow?months=${months}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      throw error;
    }
  }

  async getProjectsAtRisk(threshold = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/projects-at-risk?threshold=${threshold}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching projects at risk:', error);
      throw error;
    }
  }

  async getCategoryDistribution() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/category-distribution`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching category distribution:', error);
      throw error;
    }
  }

  // =========================================================================
  // PHASE 2 - ADVANCED ANALYTICS
  // =========================================================================

  async getBurnRateAnalysis() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/burn-rate`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching burn rate analysis:', error);
      throw error;
    }
  }

  async getVarianceAnalysis(projectId = null) {
    try {
      const url = projectId 
        ? `${API_BASE_URL}/api/analytics/variance-analysis?project_id=${projectId}`
        : `${API_BASE_URL}/api/analytics/variance-analysis`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching variance analysis:', error);
      throw error;
    }
  }

  async getFYComparison(years = 3) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/fy-comparison?years=${years}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching FY comparison:', error);
      throw error;
    }
  }

  async getSpendingTrends(months = 12) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/trends?months=${months}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching spending trends:', error);
      throw error;
    }
  }

  async exportToExcel(exportType = 'summary') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/export/excel?export_type=${exportType}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${exportType}_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/health`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error in health check:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();