// frontend/src/services/reportService.js
import api from './api';
import authService from './authService';

const reportService = {
  generateReport: async (projectId, options = {}) => {
    const {
      reportType = 'comprehensive',
      format = 'pdf',
      includeSections = {
        financial_summary: true,
        budget_allocation: true,
        funds_expenditure: true,
        category_breakdown: true,
        detailed_transactions: false,
        charts: false
      }
    } = options;

    try {
      const token = authService.getToken();
      
      const response = await fetch(
        `${api.baseURL}/api/projects/${projectId}/reports/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType: reportType,
            format: format,
            includeSections: includeSections
          })
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.detail || 'Failed to generate report');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Project_${projectId}_Report.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      return {
        blob: blob,
        filename: filename
      };
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  },

  downloadReport: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  getReportHistory: async (projectId, limit = 10) => {
    try {
      const token = authService.getToken();
      
      const response = await fetch(
        `${api.baseURL}/api/projects/${projectId}/reports/history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch report history');
      }

      const data = await response.json();
      return data.reports;
    } catch (error) {
      console.error('Error fetching report history:', error);
      throw error;
    }
  }
};

export default reportService;