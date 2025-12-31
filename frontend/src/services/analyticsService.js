/**
 * Analytics Service
 * Complete API client for all analytics endpoints (Phase 1 + Phase 2)
 */

import api from './api';

class AnalyticsService {
  // =========================================================================
  // PHASE 1 - CORE ANALYTICS
  // =========================================================================

  async getPortfolioHealth() {
    return api.get('/api/analytics/portfolio-health');
  }

  async getKPIs() {
    return api.get('/api/analytics/kpis');
  }

  async getCashFlow(months = 12) {
    return api.get(`/api/analytics/cash-flow?months=${months}`);
  }

  async getProjectsAtRisk(threshold = 20) {
    return api.get(`/api/analytics/projects-at-risk?threshold=${threshold}`);
  }

  async getCategoryDistribution() {
    return api.get('/api/analytics/category-distribution');
  }

  // =========================================================================
  // PHASE 2 - ADVANCED ANALYTICS
  // =========================================================================

  async getBurnRateAnalysis() {
    return api.get('/api/analytics/burn-rate');
  }

  async getVarianceAnalysis(projectId = null) {
    const url = projectId 
      ? `/api/analytics/variance-analysis?project_id=${projectId}`
      : '/api/analytics/variance-analysis';
    return api.get(url);
  }

  async getFYComparison(years = 3) {
    return api.get(`/api/analytics/fy-comparison?years=${years}`);
  }

  async getSpendingTrends(months = 12) {
    return api.get(`/api/analytics/trends?months=${months}`);
  }

  async exportToExcel(exportType = 'summary') {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${api.baseURL}/api/analytics/export/excel?export_type=${exportType}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );
      
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
    return api.get('/api/analytics/health');
  }
}

export default new AnalyticsService();