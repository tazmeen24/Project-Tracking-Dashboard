// frontend/src/services/fundsService.js

import api from './api';

/**
 * Funds Service
 * Handles all funds-related API calls
 */

const fundsService = {
  // ==================== FUNDS RECEIVED ====================

  /**
   * Get funds summary for a project (aggregated data)
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Summary data by head
   */
  getFundsSummary: async (projectId) => {
    return api.get(`/funds/received/project/${projectId}/summary`);
  },

  /**
   * Get all funds received for a project
   * @param {number} projectId - Project ID
   * @param {string} head - Optional: Filter by budget head
   * @returns {Promise<Array>} List of funds
   */
  getFundsByProject: async (projectId, head = null) => {
    const endpoint = head 
      ? `/funds/received/project/${projectId}?head=${head}`
      : `/funds/received/project/${projectId}`;
    return api.get(endpoint);
  },

  /**
   * Get specific fund by ID (includes breakdown if exists)
   * @param {number} fundId - Fund ID
   * @returns {Promise<Object>} Fund details with breakdown
   */
  getFundById: async (fundId) => {
    return api.get(`/funds/received/${fundId}`);
  },

  /**
   * Create new fund received record
   * @param {Object} fundData - Fund data
   * @returns {Promise<Object>} Created fund
   */
  createFund: async (fundData) => {
    return api.post('/funds/received', fundData);
  },

  /**
   * Update fund received record
   * @param {number} fundId - Fund ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated fund
   */
  updateFund: async (fundId, updateData) => {
    return api.put(`/funds/received/${fundId}`, updateData);
  },

  /**
   * Delete fund received record
   * @param {number} fundId - Fund ID
   * @returns {Promise<void>}
   */
  deleteFund: async (fundId) => {
    return api.delete(`/funds/received/${fundId}`);
  },

  // ==================== MANPOWER FUNDS BREAKDOWN ====================

  /**
   * Get manpower funds breakdown for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Breakdown items
   */
  getManpowerFundsBreakdown: async (projectId) => {
    return api.get(`/funds/breakdown/manpower/project/${projectId}`);
  },

  /**
   * Create manpower funds breakdown
   * @param {Object} breakdownData - Breakdown data
   * @returns {Promise<Object>} Created breakdown
   */
  createManpowerFundsBreakdown: async (breakdownData) => {
    return api.post('/funds/breakdown/manpower', breakdownData);
  },

  /**
   * Delete manpower funds breakdown
   * @param {number} breakdownId - Breakdown ID
   * @returns {Promise<void>}
   */
  deleteManpowerFundsBreakdown: async (breakdownId) => {
    return api.delete(`/funds/breakdown/manpower/${breakdownId}`);
  },

  // ==================== EQUIPMENT FUNDS BREAKDOWN ====================

  /**
   * Get equipment funds breakdown for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Breakdown items
   */
  getEquipmentFundsBreakdown: async (projectId) => {
    return api.get(`/funds/breakdown/equipment/project/${projectId}`);
  },

  /**
   * Create equipment funds breakdown
   * @param {Object} breakdownData - Breakdown data
   * @returns {Promise<Object>} Created breakdown
   */
  createEquipmentFundsBreakdown: async (breakdownData) => {
    return api.post('/funds/breakdown/equipment', breakdownData);
  },

  /**
   * Delete equipment funds breakdown
   * @param {number} breakdownId - Breakdown ID
   * @returns {Promise<void>}
   */
  deleteEquipmentFundsBreakdown: async (breakdownId) => {
    return api.delete(`/funds/breakdown/equipment/${breakdownId}`);
  },

  // ==================== SUMMARY ENDPOINTS ====================

  /**
   * Get funds breakdown summary (using database view)
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Breakdown summary
   */
  getFundsBreakdownSummary: async (projectId) => {
    return api.get(`/funds/breakdown/summary/project/${projectId}`);
  }
};

export default fundsService;