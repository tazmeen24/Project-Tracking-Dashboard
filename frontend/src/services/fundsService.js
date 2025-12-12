// frontend/src/services/fundsService.js

import api from './api';

/**
 * Funds Service
 * Handles all funds-related API calls including validation endpoints
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
  },

  // ==================== VALIDATION ENDPOINTS (NEW) ====================

  /**
   * Get budget head status for validation
   * Returns allocated budget, funds received, and available amounts
   * @param {number} projectId - Project ID
   * @param {string} head - Budget head name
   * @returns {Promise<Object>} Budget status
   * @example
   * {
   *   head: "manpower",
   *   allocated_budget: 1000000,
   *   total_funds_received: 800000,
   *   total_expenditure: 500000,
   *   available_to_fund: 200000,
   *   available_to_spend: 300000
   * }
   */
  getBudgetHeadStatus: async (projectId, head) => {
    try {
      const response = await api.get(
        `/funds/validation/budget-status/${projectId}/${encodeURIComponent(head)}`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch budget head status:', error);
      throw error;
    }
  },

  /**
   * Get manpower usage for validation
   * Returns approved, funded, and available personnel counts
   * @param {number} projectId - Project ID
   * @param {string} role - Role name
   * @returns {Promise<Object>} Manpower usage data
   * @example
   * {
   *   role: "Research Assistant",
   *   approved_count: 5,
   *   approved_salary: 50000,
   *   approved_months: 12,
   *   funded_count: 3,
   *   total_funded_amount: 1800000,
   *   available_count: 2,
   *   paid_count: 2,
   *   total_expenditure: 1200000
   * }
   */
  getManpowerUsage: async (projectId, role) => {
    try {
      const response = await api.get(
        `/funds/validation/manpower-usage/${projectId}/${encodeURIComponent(role)}`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch manpower usage:', error);
      throw error;
    }
  },

  /**
   * Get equipment usage for validation
   * Returns approved, funded, and available quantities
   * @param {number} projectId - Project ID
   * @param {string} itemName - Equipment item name
   * @returns {Promise<Object>} Equipment usage data
   * @example
   * {
   *   item_name: "Laptop",
   *   approved_quantity: 10,
   *   approved_unit_cost: 50000,
   *   funded_quantity: 7,
   *   total_funded_amount: 350000,
   *   available_quantity: 3,
   *   purchased_quantity: 5,
   *   total_expenditure: 250000
   * }
   */
  getEquipmentUsage: async (projectId, itemName) => {
    try {
      const response = await api.get(
        `/funds/validation/equipment-usage/${projectId}/${encodeURIComponent(itemName)}`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch equipment usage:', error);
      throw error;
    }
  },

  /**
   * Get complete project financial summary for validation
   * Returns overall budget, funds, and expenditure totals
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Project financial summary
   * @example
   * {
   *   project_id: 123,
   *   total_budget: 5000000,
   *   total_funds_received: 4000000,
   *   total_expenditure: 3000000,
   *   budget_utilization_percent: 80.0,
   *   fund_utilization_percent: 75.0,
   *   available_to_fund: 1000000,
   *   available_to_spend: 1000000,
   *   by_head: [
   *     {
   *       head: "manpower",
   *       allocated: 3000000,
   *       funded: 2500000,
   *       spent: 2000000,
   *       available_to_fund: 500000,
   *       available_to_spend: 500000
   *     },
   *     ...
   *   ]
   * }
   */
  getProjectFinancialSummary: async (projectId) => {
    try {
      const response = await api.get(
        `/funds/validation/project-summary/${projectId}`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch project financial summary:', error);
      throw error;
    }
  },

  /**
   * Validate fund creation before submission
   * Checks all validation rules and returns errors/warnings
   * @param {number} projectId - Project ID
   * @param {Object} fundData - Fund data to validate
   * @returns {Promise<Object>} Validation result
   * @example
   * {
   *   valid: false,
   *   errors: ["Amount exceeds available budget"],
   *   warnings: ["Using 95% of remaining budget"],
   *   details: { ... }
   * }
   */
  validateFund: async (projectId, fundData) => {
    try {
      const response = await api.post(
        `/funds/validation/validate-fund/${projectId}`,
        fundData
      );
      return response;
    } catch (error) {
      console.error('Fund validation failed:', error);
      throw error;
    }
  },

  /**
   * Validate expenditure creation before submission
   * Checks if sufficient funds are available
   * @param {number} projectId - Project ID
   * @param {Object} expenditureData - Expenditure data to validate
   * @returns {Promise<Object>} Validation result
   * @example
   * {
   *   valid: false,
   *   errors: ["Insufficient funds available"],
   *   warnings: [],
   *   details: {
   *     funds_available: 500000,
   *     amount_requested: 700000
   *   }
   * }
   */
  validateExpenditure: async (projectId, expenditureData) => {
    try {
      const response = await api.post(
        `/funds/validation/validate-expenditure/${projectId}`,
        expenditureData
      );
      return response;
    } catch (error) {
      console.error('Expenditure validation failed:', error);
      throw error;
    }
  }
};

export default fundsService;