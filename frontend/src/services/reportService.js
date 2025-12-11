// frontend/src/services/reportService.js
import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

    console.log('=== Report Generation Request ===');
    console.log('Project ID:', projectId);
    console.log('Report Type:', reportType);
    console.log('Format:', format);

    try {
      const queryParams = new URLSearchParams({
        report_type: reportType,
        format: format,
        include_financial_summary: includeSections.financial_summary,
        include_budget_allocation: includeSections.budget_allocation,
        include_funds_expenditure: includeSections.funds_expenditure,
        include_category_breakdown: includeSections.category_breakdown,
        include_detailed_transactions: includeSections.detailed_transactions,
        include_charts: includeSections.charts
      });

      const token = authService.getToken();
      
      // Use fetch directly for blob response
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/reports/generate?${queryParams.toString()}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.detail || 'Failed to generate report');
      }

      // Get blob from response
      const blob = await response.blob();

      // Extract filename from headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Project_${projectId}_Report.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      console.log('Report generated successfully:', filename);
      console.log('Blob size:', blob.size);

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
    console.log('Downloading report:', filename);
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
        `${API_BASE_URL}/api/projects/${projectId}/reports/history?limit=${limit}`,
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