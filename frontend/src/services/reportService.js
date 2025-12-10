// frontend/src/services/reportService.js
import api from './api';

const reportService = {
  /**
   * Generate a project report
   * @param {number} projectId - Project ID
   * @param {object} options - Report generation options
   * @returns {Promise<Blob>} - PDF or Excel file blob
   */
  generateReport: async (projectId, options = {}) => {
    const {
      reportType = 'comprehensive', // 'comprehensive' or 'summary'
      format = 'pdf', // 'pdf' or 'excel'
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
    console.log('Include Sections:', includeSections);

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

      const response = await api.post(
        `/projects/${projectId}/reports/generate?${queryParams.toString()}`,
        {},
        {
          responseType: 'blob',
          timeout: 60000 // 60 seconds timeout for large reports
        }
      );

      console.log('Response received:', response);
      console.log('Response headers:', response.headers);

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Project_${projectId}_Report.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      console.log('Filename:', filename);
      console.log('Blob size:', response.data.size);

      return {
        blob: response.data,
        filename: filename
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  /**
   * Download the generated report
   * @param {Blob} blob - File blob
   * @param {string} filename - Filename
   */
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

  /**
   * Get report generation history for a project
   * @param {number} projectId - Project ID
   * @param {number} limit - Number of reports to fetch
   * @returns {Promise<Array>} - List of generated reports
   */
  getReportHistory: async (projectId, limit = 10) => {
    try {
      const response = await api.get(`/projects/${projectId}/reports/history`, {
        params: { limit }
      });
      return response.data.reports;
    } catch (error) {
      console.error('Error fetching report history:', error);
      throw error;
    }
  }
};

export default reportService;