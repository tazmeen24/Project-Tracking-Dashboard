/**
 * Financial Summary Service
 * API calls for financial summary data
 * Place in: frontend/src/services/financialSummaryService.js
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class FinancialSummaryService {
  /**
   * Get financial summary with filters
   */
  async getFinancialSummary(params) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/financial-summary`, {
        params: {
          view_mode: params.viewMode || 'by_project',
          date_filter_mode: params.dateFilterMode || 'current',
          as_of_date: params.asOfDate || null,
          start_date: params.startDate || null,
          end_date: params.endDate || null,
          financial_year: params.financialYear || null,
          year: params.year || null,
          month: params.month || null,
          quarter: params.quarter || null,
          project_id: params.projectId || null,
          page: params.page || 1,
          per_page: params.perPage || 20
        }
      });
      return response.data;
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
      const response = await axios.get(`${API_BASE_URL}/api/financial-summary/export`, {
        params: {
          view_mode: params.viewMode || 'by_project',
          date_filter_mode: params.dateFilterMode || 'current',
          as_of_date: params.asOfDate || null,
          start_date: params.startDate || null,
          end_date: params.endDate || null,
          financial_year: params.financialYear || null,
          year: params.year || null,
          month: params.month || null,
          quarter: params.quarter || null,
          project_id: params.projectId || null
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
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
      const response = await axios.get(`${API_BASE_URL}/api/projects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }
}

export default new FinancialSummaryService();