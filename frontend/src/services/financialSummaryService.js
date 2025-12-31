/**
 * Financial Summary Service
 * API calls for financial summary data
 */

import api from './api';

class FinancialSummaryService {
  /**
   * Get financial summary with filters
   */
  async getFinancialSummary(params) {
    try {
      const queryParams = new URLSearchParams({
        view_mode: params.viewMode || 'by_project',
        date_filter_mode: params.dateFilterMode || 'current',
        page: params.page || 1,
        per_page: params.perPage || 20
      });

      // Add optional params only if they exist
      if (params.asOfDate) queryParams.append('as_of_date', params.asOfDate);
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);
      if (params.financialYear) queryParams.append('financial_year', params.financialYear);
      if (params.year) queryParams.append('year', params.year);
      if (params.month) queryParams.append('month', params.month);
      if (params.quarter) queryParams.append('quarter', params.quarter);
      if (params.projectId) queryParams.append('project_id', params.projectId);

      return await api.get(`/api/financial-summary?${queryParams.toString()}`);
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw error;
    }
  }

  /**
   * Export financial summary to Excel
   */
  async exportToExcel(params) {
    try {
      const queryParams = new URLSearchParams({
        view_mode: params.viewMode || 'by_project',
        date_filter_mode: params.dateFilterMode || 'current'
      });

      // Add optional params
      if (params.asOfDate) queryParams.append('as_of_date', params.asOfDate);
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);
      if (params.financialYear) queryParams.append('financial_year', params.financialYear);
      if (params.year) queryParams.append('year', params.year);
      if (params.month) queryParams.append('month', params.month);
      if (params.quarter) queryParams.append('quarter', params.quarter);
      if (params.projectId) queryParams.append('project_id', params.projectId);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${api.baseURL}/api/financial-summary/export?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting:', error);
      throw error;
    }
  }

  /**
   * Get projects for filter dropdown
   */
  async getProjects() {
    try {
      return await api.get('/api/projects');
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }
}

export default new FinancialSummaryService();