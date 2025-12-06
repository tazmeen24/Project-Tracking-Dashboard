// frontend/src/services/expenditureService.js

import api from './api';

/**
 * Expenditure Service
 * Handles all expenditure-related API calls (budget expenditure, manpower, equipment)
 */

const expenditureService = {
  // ==================== BUDGET EXPENDITURE ====================
  // (consumables, contingency, travel & training, overhead)

  /**
   * Get expenditure summary for a project (aggregated data)
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Summary data by head
   */
  getExpenditureSummary: async (projectId) => {
    return api.get(`/expenditure/project/${projectId}/summary`);
  },

  /**
   * Get all budget expenditures for a project
   * @param {number} projectId - Project ID
   * @param {string} head - Optional: Filter by budget head
   * @returns {Promise<Array>} List of expenditures
   */
  getExpendituresByProject: async (projectId, head = null) => {
    const endpoint = head 
      ? `/expenditure/project/${projectId}?head=${head}`
      : `/expenditure/project/${projectId}`;
    return api.get(endpoint);
  },

  /**
   * Get specific expenditure by ID
   * @param {number} expenditureId - Expenditure ID
   * @returns {Promise<Object>} Expenditure details
   */
  getExpenditureById: async (expenditureId) => {
    return api.get(`/expenditure/${expenditureId}`);
  },

  /**
   * Create new budget expenditure record
   * @param {Object} expenditureData - Expenditure data
   * @returns {Promise<Object>} Created expenditure
   */
  createExpenditure: async (expenditureData) => {
    return api.post('/expenditure', expenditureData);
  },

  /**
   * Update budget expenditure record
   * @param {number} expenditureId - Expenditure ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated expenditure
   */
  updateExpenditure: async (expenditureId, updateData) => {
    return api.put(`/expenditure/${expenditureId}`, updateData);
  },

  /**
   * Delete budget expenditure record
   * @param {number} expenditureId - Expenditure ID
   * @returns {Promise<void>}
   */
  deleteExpenditure: async (expenditureId) => {
    return api.delete(`/expenditure/${expenditureId}`);
  },

  // ==================== MANPOWER EXPENDITURE ====================

  /**
   * Get manpower expenditure summary for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Summary data by role
   */
  getManpowerSummary: async (projectId) => {
    return api.get(`/manpower/project/${projectId}/summary`);
  },

  /**
   * Get total manpower expenditure for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Total expenditure stats
   */
  getManpowerTotal: async (projectId) => {
    return api.get(`/manpower/project/${projectId}/total`);
  },

  /**
   * Get all manpower expenditures for a project
   * @param {number} projectId - Project ID
   * @param {string} role - Optional: Filter by role
   * @returns {Promise<Array>} List of manpower expenditures
   */
  getManpowerByProject: async (projectId, role = null) => {
    const endpoint = role 
      ? `/manpower/project/${projectId}?role=${role}`
      : `/manpower/project/${projectId}`;
    return api.get(endpoint);
  },

  /**
   * Get specific manpower expenditure by ID
   * @param {number} manpowerId - Manpower ID
   * @returns {Promise<Object>} Manpower details
   */
  getManpowerById: async (manpowerId) => {
    return api.get(`/manpower/${manpowerId}`);
  },

  /**
   * Create new manpower expenditure record
   * @param {Object} manpowerData - Manpower data
   * @returns {Promise<Object>} Created manpower record
   */
  createManpower: async (manpowerData) => {
    return api.post('/manpower', manpowerData);
  },

  /**
   * Update manpower expenditure record
   * @param {number} manpowerId - Manpower ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated manpower record
   */
  updateManpower: async (manpowerId, updateData) => {
    return api.put(`/manpower/${manpowerId}`, updateData);
  },

  /**
   * Delete manpower expenditure record
   * @param {number} manpowerId - Manpower ID
   * @returns {Promise<void>}
   */
  deleteManpower: async (manpowerId) => {
    return api.delete(`/manpower/${manpowerId}`);
  },

  // ==================== EQUIPMENT EXPENDITURE ====================

  /**
   * Get equipment expenditure summary for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Summary data by equipment name
   */
  getEquipmentSummary: async (projectId) => {
    return api.get(`/equipment/project/${projectId}/summary`);
  },

  /**
   * Get total equipment expenditure for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Total expenditure stats
   */
  getEquipmentTotal: async (projectId) => {
    return api.get(`/equipment/project/${projectId}/total`);
  },

  /**
   * Get all equipment expenditures for a project
   * @param {number} projectId - Project ID
   * @param {string} name - Optional: Filter by equipment name
   * @returns {Promise<Array>} List of equipment expenditures
   */
  getEquipmentByProject: async (projectId, name = null) => {
    const endpoint = name 
      ? `/equipment/project/${projectId}?name=${name}`
      : `/equipment/project/${projectId}`;
    return api.get(endpoint);
  },

  /**
   * Get specific equipment expenditure by ID
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object>} Equipment details
   */
  getEquipmentById: async (equipmentId) => {
    return api.get(`/equipment/${equipmentId}`);
  },

  /**
   * Create new equipment expenditure record
   * @param {Object} equipmentData - Equipment data
   * @returns {Promise<Object>} Created equipment record
   */
  createEquipment: async (equipmentData) => {
    return api.post('/equipment', equipmentData);
  },

  /**
   * Update equipment expenditure record
   * @param {number} equipmentId - Equipment ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated equipment record
   */
  updateEquipment: async (equipmentId, updateData) => {
    return api.put(`/equipment/${equipmentId}`, updateData);
  },

  /**
   * Delete equipment expenditure record
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<void>}
   */
  deleteEquipment: async (equipmentId) => {
    return api.delete(`/equipment/${equipmentId}`);
  }
};

export default expenditureService;