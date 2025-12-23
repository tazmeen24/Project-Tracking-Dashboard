// frontend/src/services/installmentService.js

import api from './api';

/**
 * Installments Service
 * Handles all installment-related API calls
 */

const installmentService = {
  // ==================== INSTALLMENTS ====================

  /**
   * Get all installments for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} List of installments with fund allocations
   */
  getInstallments: async (projectId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/installments`);
      return response;
    } catch (error) {
      console.error('Error fetching installments:', error);
      throw error;
    }
  },

  /**
   * Get single installment by ID with fund allocations and breakdowns
   */
  getInstallmentById: async (installmentId) => {
    try {
      const response = await api.get(`/api/installments/${installmentId}`);
      return response;
    } catch (error) {
      console.error('Error fetching installment:', error);
      throw error;
    }
  },

  /**
   * Create new installment
   */
  createInstallment: async (installmentData) => {
    try {
      const response = await api.post('/api/installments', installmentData);
      return response;
    } catch (error) {
      console.error('Error creating installment:', error);
      throw error;
    }
  },

  /**
   * Update installment
   */
  updateInstallment: async (installmentId, installmentData) => {
    try {
      const response = await api.put(`/api/installments/${installmentId}`, installmentData);
      return response;
    } catch (error) {
      console.error('Error updating installment:', error);
      throw error;
    }
  },

  /**
   * Delete installment (cascades to all associated funds and breakdowns)
   */
  deleteInstallment: async (installmentId) => {
    try {
      const response = await api.delete(`/api/installments/${installmentId}`);
      return response;
    } catch (error) {
      console.error('Error deleting installment:', error);
      throw error;
    }
  },

  // ==================== INSTALLMENT STATISTICS ====================

  /**
   * Get installment summary statistics for a project
   */
  getInstallmentStats: async (projectId) => {
    try {
      const response = await api.get(`/api/installments/project/${projectId}/stats`);
      return response;
    } catch (error) {
      console.error('Error fetching installment stats:', error);
      throw error;
    }
  },

  /**
   * Get funds allocated under a specific installment
   */
  getFundsByInstallment: async (installmentId) => {
    try {
      const response = await api.get(`/api/installments/${installmentId}/funds`);
      return response;
    } catch (error) {
      console.error('Error fetching funds:', error);
      throw error;
    }
  },

  // ==================== VALIDATION ====================

  /**
   * Validate installment before creation
   */
  validateInstallment: async (projectId, installmentData) => {
    try {
      const response = await api.post(
        `/api/installments/validate/${projectId}`,
        installmentData
      );
      return response;
    } catch (error) {
      console.error('Installment validation failed:', error);
      throw error;
    }
  },

  /**
   * Check if installment can be deleted
   */
  checkInstallmentDeletion: async (installmentId) => {
    try {
      const response = await api.get(`/api/installments/${installmentId}/check-delete`);
      return response;
    } catch (error) {
      console.error('Error checking installment deletion:', error);
      throw error;
    }
  },

  // ==================== BULK OPERATIONS ====================

  /**
   * Create installment with all fund allocations in one transaction
   */
  createInstallmentWithFunds: async (projectId, data) => {
    try {
      const response = await api.post(
        `/api/installments/project/${projectId}/bulk`,
        data
      );
      return response;
    } catch (error) {
      console.error('Error creating installment with funds:', error);
      throw error;
    }
  },

  /**
   * Update installment and all fund allocations in one transaction
   */
  updateInstallmentWithFunds: async (installmentId, data) => {
    try {
      const response = await api.put(
        `/api/installments/${installmentId}/bulk`,
        data
      );
      return response;
    } catch (error) {
      console.error('Error updating installment with funds:', error);
      throw error;
    }
  },

  // ==================== REPORTING ====================

  /**
   * Get installment timeline for a project
   */
  getInstallmentTimeline: async (projectId) => {
    try {
      const response = await api.get(`/api/installments/project/${projectId}/timeline`);
      return response;
    } catch (error) {
      console.error('Error fetching installment timeline:', error);
      throw error;
    }
  },

  /**
   * Get installment utilization report
   */
  getInstallmentUtilization: async (installmentId) => {
    try {
      const response = await api.get(`/api/installments/${installmentId}/utilization`);
      return response;
    } catch (error) {
      console.error('Error fetching installment utilization:', error);
      throw error;
    }
  },
};

export default installmentService;