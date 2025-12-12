// frontend/src/services/financeService.js

import api from './api';

/**
 * Finance Service - Standalone
 * Handles all finance-related API calls with proper URL encoding
 * FIXED: Added encodeURIComponent() for head parameter to handle "travel & training"
 */

const financeService = {
  // ==================== SUMMARY & ORGANIZED DATA ====================

  /**
   * Get complete financial summary for a project
   * Fetches all summary endpoints in parallel
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Complete financial summary
   */
  getCompleteFinancialSummary: async (projectId) => {
    try {
      const [
        fundsSummary,
        expenditureSummary,
        equipmentSummary,
        manpowerSummary
      ] = await Promise.all([
        api.get(`/funds/received/project/${projectId}/summary`),
        api.get(`/expenditure/project/${projectId}/summary`),
        api.get(`/equipment/project/${projectId}/summary`),
        api.get(`/manpower/project/${projectId}/summary`)
      ]);

      return {
        funds: fundsSummary,
        expenditure: expenditureSummary,
        equipment: equipmentSummary,
        manpower: manpowerSummary
      };
    } catch (error) {
      console.error('Error fetching complete financial summary:', error);
      throw error;
    }
  },

  /**
   * Get organized summary by budget head
   * Transforms API summaries into organized structure
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Organized summaries by head
   */
  getOrganizedSummary: async (projectId) => {
    try {
      const summaries = await financeService.getCompleteFinancialSummary(projectId);
      
      const BUDGET_HEADS = [
        'manpower', 'equipment', 'consumables', 
        'contingency', 'travel & training', 'overhead'
      ];

      const organized = {};

      BUDGET_HEADS.forEach((head) => {
        const fundData = summaries.funds.find(f => f.head === head) || {};
        
        let expTotal = 0;
        let expCount = 0;

        if (head === 'manpower') {
          expTotal = summaries.manpower.reduce(
            (sum, item) => sum + parseFloat(item.total_cost || 0), 0
          );
          expCount = summaries.manpower.length;
        } else if (head === 'equipment') {
          expTotal = summaries.equipment.reduce(
            (sum, item) => sum + parseFloat(item.total_cost || 0), 0
          );
          expCount = summaries.equipment.length;
        } else {
          const expData = summaries.expenditure.find(e => e.head === head) || {};
          expTotal = parseFloat(expData.total_amount || 0);
          expCount = parseInt(expData.transaction_count || 0);
        }

        organized[head] = {
          fundsReceived: parseFloat(fundData.total_amount || 0),
          fundsCount: parseInt(fundData.transaction_count || 0),
          expendituresTotal: expTotal,
          expendituresCount: expCount,
          balance: parseFloat(fundData.total_amount || 0) - expTotal
        };
      });

      return organized;
    } catch (error) {
      console.error('Error getting organized summary:', error);
      throw error;
    }
  },

  /**
   * Get financial details for a specific budget head
   * Fetches both funds and expenditures for the head
   * CRITICAL FIX: Uses encodeURIComponent for head parameter
   * @param {number} projectId - Project ID
   * @param {string} head - Budget head name (e.g., "travel & training")
   * @returns {Promise<Object>} Funds and expenditures for the head
   */
  getFinancialDetailsByHead: async (projectId, head) => {
    try {
      let funds, expenditures;

      // CRITICAL: URL-encode the head parameter to handle "travel & training"
      const encodedHead = encodeURIComponent(head);

      if (head === 'manpower') {
        [funds, expenditures] = await Promise.all([
          api.get(`/funds/received/project/${projectId}?head=${encodedHead}`),
          api.get(`/manpower/project/${projectId}`)
        ]);
      } else if (head === 'equipment') {
        [funds, expenditures] = await Promise.all([
          api.get(`/funds/received/project/${projectId}?head=${encodedHead}`),
          api.get(`/equipment/project/${projectId}`)
        ]);
      } else {
        // consumables, contingency, travel & training, overhead
        [funds, expenditures] = await Promise.all([
          api.get(`/funds/received/project/${projectId}?head=${encodedHead}`),
          api.get(`/expenditure/project/${projectId}?head=${encodedHead}`)
        ]);
      }

      return { funds, expenditures };
    } catch (error) {
      console.error(`Error fetching financial details for "${head}":`, error);
      throw error;
    }
  },

  // ==================== FUNDS OPERATIONS ====================

  /**
   * Get fund with breakdown
   * Fetches fund details including breakdown items
   * @param {number} fundId - Fund ID
   * @returns {Promise<Object>} Fund with breakdown
   */
  getFundWithBreakdown: async (fundId) => {
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
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:8000/funds/received/${fundId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Failed to update fund');
    return response.json();
  },

  /**
   * Delete fund received record
   * @param {number} fundId - Fund ID
   * @returns {Promise<void>}
   */
  deleteFund: async (fundId) => {
    return api.delete(`/funds/received/${fundId}`);
  },

  /**
   * Delete fund breakdown by fund_id (deletes ALL breakdown items for a fund)
   */
  deleteFundBreakdown: async (fundId) => {
    const token = localStorage.getItem('token');
    
    // Fetch the fund first to get breakdown IDs
    const fund = await financeService.getFundWithBreakdown(fundId);
    
    if (fund.breakdown && fund.breakdown.length > 0) {
      // Delete each breakdown item
      for (const item of fund.breakdown) {
        const endpoint = fund.head === 'manpower' 
          ? `/funds/breakdown/manpower/${item.breakdown_id}`
          : `/funds/breakdown/equipment/${item.breakdown_id}`;
        
        await fetch(`http://localhost:8000${endpoint}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    }
  },

  // ==================== EXPENDITURE OPERATIONS ====================

  /**
   * Create new expenditure (manpower, equipment, or other)
   * @param {Object} expenditureData - Expenditure data
   * @param {string} type - 'manpower', 'equipment', or 'other'
   * @returns {Promise<Object>} Created expenditure
   */
  createExpenditure: async (expenditureData, type = 'other') => {
    const endpoint = type === 'manpower' 
      ? '/manpower' 
      : type === 'equipment' 
        ? '/equipment' 
        : '/expenditure';
    return api.post(endpoint, expenditureData);
  },

  /**
   * Update expenditure
   * @param {number} expenditureId - Expenditure ID
   * @param {Object} updateData - Fields to update
   * @param {string} type - 'manpower', 'equipment', or 'other'
   * @returns {Promise<Object>} Updated expenditure
   */
  updateExpenditure: async (expenditureId, updateData, type = 'other') => {
    const endpoint = type === 'manpower' 
      ? `/manpower/${expenditureId}` 
      : type === 'equipment' 
        ? `/equipment/${expenditureId}` 
        : `/expenditure/${expenditureId}`;
    return api.put(endpoint, updateData);
  },

  /**
   * Delete expenditure
   * @param {number} expenditureId - Expenditure ID
   * @param {string} type - 'manpower', 'equipment', or 'other'
   * @returns {Promise<void>}
   */
  deleteExpenditure: async (expenditureId, type = 'other') => {
    const endpoint = type === 'manpower' 
      ? `/manpower/${expenditureId}` 
      : type === 'equipment' 
        ? `/equipment/${expenditureId}` 
        : `/expenditure/${expenditureId}`;
    return api.delete(endpoint);
  },

  // ==================== HELPER METHODS ====================

  /**
   * Calculate balance for a budget head
   * @param {Array} funds - Funds array
   * @param {Array} expenditures - Expenditures array
   * @returns {number} Balance (funds - expenditures)
   */
  calculateBalance: (funds, expenditures) => {
    const totalFunds = funds.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
    const totalExp = expenditures.reduce((sum, e) => 
      sum + parseFloat(e.total_cost || e.amount || 0), 0
    );
    return totalFunds - totalExp;
  },

  /**
   * Validate if user can edit finances
   * @param {Object} user - Current user
   * @param {Object} project - Project details
   * @returns {boolean} True if user can edit
   */
  canEditFinances: (user, project) => {
    if (!user || !project) return false;
    return user.role === 'admin' || user.user_id === project.pi_id;
  },

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  /**
   * Get balance status (healthy, warning, overspent)
   * @param {number} balance - Current balance
   * @param {number} totalFunds - Total funds received
   * @returns {string} Status: 'healthy' | 'warning' | 'overspent'
   */
  getBalanceStatus: (balance, totalFunds) => {
    if (balance < 0) return 'overspent';
    if (balance < totalFunds * 0.1) return 'warning';
    return 'healthy';
  },
};

export default financeService;