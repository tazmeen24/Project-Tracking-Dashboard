// frontend/src/services/ucService.js
import api from './api';
import authService from './authService';

const ucService = {
  /**
   * Generate UC document
   */
  generateUC: async (projectId, financialYear, format = 'docx') => {
    try {
      const token = authService.getToken();
      
      const response = await fetch(`${api.baseURL}/api/uc/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          project_id: projectId,
          financial_year: financialYear,
          format: format
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.detail || 'Failed to generate UC');
      }

      // Get blob from response
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error generating UC:', error);
      throw error;
    }
  },
  /**
   * Create UC record in database
   */
  createUC: async (projectId, financialYear, interestEarned = 0) => {
    try {
      const response = await api.post('/api/uc/create', {
        project_id: projectId,
        financial_year: financialYear,
        interest_earned: interestEarned
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating UC:', error);
      throw error;
    }
  },

  /**
   * Get UC data (preview without generating document)
   */
  getUCData: async (projectId, financialYear) => {
    try {
      const response = await api.get(`/api/uc/data/${projectId}/${financialYear}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching UC data:', error);
      throw error;
    }
  },

  /**
   * Get all UCs for a project
   */
  getProjectUCs: async (projectId) => {
    try {
      const response = await api.get(`/api/uc/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project UCs:', error);
      throw error;
    }
  },

  /**
   * Get UC by ID
   */
  getUCById: async (ucId) => {
    try {
      const response = await api.get(`/api/uc/${ucId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching UC:', error);
      throw error;
    }
  },

  /**
   * Update UC status
   */
  updateUCStatus: async (ucId, status, signatureData = {}) => {
    try {
      const response = await api.put(`/api/uc/${ucId}/status`, {
        status,
        ...signatureData
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating UC status:', error);
      throw error;
    }
  },

  /**
   * Delete UC (only drafts)
   */
  deleteUC: async (ucId) => {
    try {
      const response = await api.delete(`/api/uc/${ucId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting UC:', error);
      throw error;
    }
  },

  /**
   * Download UC document
   */
  downloadUC: (blob, projectId, financialYear, format) => {
    // Ensure it's actually a Blob
    if (!(blob instanceof Blob)) {
      console.error('downloadUC received non-Blob data:', blob);
      throw new Error('Invalid file data received');
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UC_${projectId}_${financialYear}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get current financial year
   */
  getCurrentFinancialYear: () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    
    if (month >= 4) {
      // April onwards -> current FY
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      // Jan-March -> previous FY
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  },

  /**
   * Parse financial year string
   */
  parseFinancialYear: (fyString) => {
    const [startYear, endYearShort] = fyString.split('-');
    const endYear = '20' + endYearShort;
    
    return {
      startYear: parseInt(startYear),
      endYear: parseInt(endYear),
      periodFrom: `${startYear}-04-01`,
      periodTo: `${endYear}-03-31`
    };
  },

  /**
   * Get financial year options (last 5 years)
   */
  getFinancialYearOptions: () => {
    const currentFY = ucService.getCurrentFinancialYear();
    const [currentStartYear] = currentFY.split('-').map(Number);
    
    const options = [];
    for (let i = 0; i < 5; i++) {
      const year = currentStartYear - i;
      options.push(`${year}-${(year + 1).toString().slice(-2)}`);
    }
    
    return options;
  }
};

export default ucService;