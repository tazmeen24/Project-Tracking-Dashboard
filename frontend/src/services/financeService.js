// frontend/src/services/financeService.js

import api from './api';
import fundsService from './fundsService';
import expenditureService from './expenditureService';

/**
 * Finance Service
 * Unified service for all finance operations
 * Combines funds and expenditure services with convenience methods
 */

const financeService = {
  // Re-export individual services for direct access
  funds: fundsService,
  expenditure: expenditureService,

  // ==================== COMBINED OPERATIONS ====================

  /**
   * Get complete financial summary for a project
   * Fetches all 4 summary endpoints in parallel
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
        fundsService.getFundsSummary(projectId),
        expenditureService.getExpenditureSummary(projectId),
        expenditureService.getEquipmentSummary(projectId),
        expenditureService.getManpowerSummary(projectId)
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
   * Get financial details for a specific budget head
   * Fetches both funds and expenditures for the head
   * @param {number} projectId - Project ID
   * @param {string} head - Budget head name
   * @returns {Promise<Object>} Funds and expenditures for the head
   */
  getFinancialDetailsByHead: async (projectId, head) => {
    try {
      let funds, expenditures;

      if (head === 'manpower') {
        [funds, expenditures] = await Promise.all([
          fundsService.getFundsByProject(projectId, 'manpower'),
          expenditureService.getManpowerByProject(projectId)
        ]);
      } else if (head === 'equipment') {
        [funds, expenditures] = await Promise.all([
          fundsService.getFundsByProject(projectId, 'equipment'),
          expenditureService.getEquipmentByProject(projectId)
        ]);
      } else {
        // consumables, contingency, travel & training, overhead
        [funds, expenditures] = await Promise.all([
          fundsService.getFundsByProject(projectId, head),
          expenditureService.getExpendituresByProject(projectId, head)
        ]);
      }

      return { funds, expenditures };
    } catch (error) {
      console.error(`Error fetching financial details for ${head}:`, error);
      throw error;
    }
  },

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
   * Get fund with breakdown
   * Fetches fund details including breakdown items
   * @param {number} fundId - Fund ID
   * @returns {Promise<Object>} Fund with breakdown
   */
  getFundWithBreakdown: async (fundId) => {
    return fundsService.getFundById(fundId);
  },

  // ==================== HELPER METHODS ====================

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

  // Add to financeService object:

/**
 * Update fund
 */
  updateFund: async (fundId, data) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:8000/funds/received/${fundId}`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update fund');
  return response.json();
},

/**
 * Delete fund breakdown by fund_id (deletes ALL breakdown items for a fund)
 */
deleteFundBreakdown: async (fundId) => {
  const token = localStorage.getItem('token');
  
  // We need to fetch the fund first to get breakdown IDs
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

};

export default financeService;