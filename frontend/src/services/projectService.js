// services/projectService.js
/**
 * Project Service - API client for project management
 * 
 * FIXED: All endpoints now match the corrected backend routes
 * - Updated all resource paths to match backend structure
 * - Added missing CRUD methods
 * - Fixed path patterns (/{resource}/project/{id} instead of /projects/{id}/{resource})
 */

import api from './api';

const projectService = {
  // ==================== PROJECTS ====================
  
  /**
   * Get all projects with optional filters
   * @param {Object} params - Query parameters (skip, limit, status, etc.)
   */
  async getAllProjects(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/projects${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single project by ID
   * @param {number} projectId - Project ID
   */
  async getProject(projectId) {
    return api.get(`/projects/${projectId}`);
  },

  /**
   * Get project summary (budget, funds, expenditure)
   * @param {number} projectId - Project ID
   */
  async getProjectSummary(projectId) {
    return api.get(`/projects/${projectId}/summary`);
  },

  /**
   * Create new project
   * @param {Object} projectData - Project data
   */
  async createProject(projectData) {
    return api.post('/projects', projectData);
  },

  /**
   * Update existing project
   * @param {number} projectId - Project ID
   * @param {Object} projectData - Updated project data
   */
  async updateProject(projectId, projectData) {
    return api.put(`/projects/${projectId}`, projectData);
  },

  /**
   * Partially update project
   * @param {number} projectId - Project ID
   * @param {Object} projectData - Partial project data
   */
  async patchProject(projectId, projectData) {
    return api.patch(`/projects/${projectId}`, projectData);
  },

  /**
   * Delete project
   * @param {number} projectId - Project ID
   */
  async deleteProject(projectId) {
    return api.delete(`/projects/${projectId}`);
  },

  /**
   * Check if project exists
   * @param {number} projectId - Project ID
   */
  async projectExists(projectId) {
    return api.get(`/projects/${projectId}/exists`);
  },

  // ==================== INVESTIGATORS ====================
  
  /**
   * Get investigators for a project
   * FIXED: Changed from /projects/{id}/investigators to /investigators/project/{id}
   * @param {number} projectId - Project ID
   */
  async getInvestigators(projectId) {
    return api.get(`/investigators/project/${projectId}`);
  },

  /**
   * Get single investigator by ID
   * @param {number} investigatorId - Investigator ID
   */
  async getInvestigator(investigatorId) {
    return api.get(`/investigators/${investigatorId}`);
  },

  /**
   * Create new investigator
   * @param {Object} investigatorData - Investigator data (must include project_id)
   */
  async createInvestigator(investigatorData) {
    return api.post('/investigators', investigatorData);
  },

  /**
   * Update investigator
   * @param {number} investigatorId - Investigator ID
   * @param {Object} investigatorData - Updated investigator data
   */
  async updateInvestigator(investigatorId, investigatorData) {
    return api.put(`/investigators/${investigatorId}`, investigatorData);
  },

  /**
   * Delete investigator
   * @param {number} investigatorId - Investigator ID
   */
  async deleteInvestigator(investigatorId) {
    return api.delete(`/investigators/${investigatorId}`);
  },

  // ==================== FUNDING AGENCIES ====================
  
  /**
   * Get all funding agencies
   */
  async getAllFundingAgencies() {
  try {
    const result = await api.get('/funding-agencies');
    return result.data || result; 
  } catch (error) {
    throw error;
  }
},

  /**
   * Get single funding agency
   * @param {number} agencyId - Agency ID
   */
  async getFundingAgency(agencyId) {
    return api.get(`/funding-agencies/${agencyId}`);
  },

  /**
   * Create new funding agency
   * @param {Object} agencyData - Agency data (name, address)
   */
  async createFundingAgency(agencyData) {
    return api.post('/funding-agencies', agencyData);
  },

  /**
   * Update funding agency
   * @param {number} agencyId - Agency ID
   * @param {Object} agencyData - Updated agency data
   */
  async updateFundingAgency(agencyId, agencyData) {
    return api.put(`/funding-agencies/${agencyId}`, agencyData);
  },

  /**
   * Delete funding agency
   * @param {number} agencyId - Agency ID
   */
  async deleteFundingAgency(agencyId) {
    return api.delete(`/funding-agencies/${agencyId}`);
  },

  // Funding Agency Details
  
  /**
   * Get funding agency details
   * @param {number} agencyId - Agency ID
   */
  async getFundingAgencyDetails(agencyId) {
    return api.get(`/funding-agencies/${agencyId}/details`);
  },

  /**
   * Create funding agency details
   * @param {Object} detailsData - Details data (must include agency_id)
   */
  async createFundingAgencyDetails(detailsData) {
    const agencyId = detailsData.agency_id;
    return api.post(`/funding-agencies/${agencyId}/details`, detailsData);
  },

  /**
   * Update funding agency details
   * @param {number} agencyId - Agency ID
   * @param {Object} detailsData - Updated details data
   */
  async updateFundingAgencyDetails(agencyId, detailsData) {
    return api.put(`/funding-agencies/${agencyId}/details`, detailsData);
  },

  /**
   * Delete funding agency details
   * @param {number} agencyId - Agency ID
   */
  async deleteFundingAgencyDetails(agencyId) {
    return api.delete(`/funding-agencies/${agencyId}/details`);
  },

  // ==================== TECHNICAL GROUPS ====================
  
  /**
   * Get all technical groups
   * NOTE: Backend only provides GET all endpoint, no CRUD operations
   */
  async getAllTechnicalGroups() {
    return api.get('/projects/technical-groups');
  },

  // NOTE: The following methods are kept for backward compatibility,
  // but will fail if backend doesn't implement these endpoints
  // Consider removing if not needed or adding backend endpoints
  
  /**
   * Get single technical group
   * WARNING: This endpoint may not exist in backend
   * @param {number} groupId - Group ID
   */
  async getTechnicalGroup(groupId) {
    return api.get(`/technical-groups/${groupId}`);
  },

  /**
   * Create technical group
   * WARNING: This endpoint may not exist in backend
   * @param {Object} groupData - Group data
   */
  async createTechnicalGroup(groupData) {
    return api.post('/technical-groups', groupData);
  },

  /**
   * Update technical group
   * WARNING: This endpoint may not exist in backend
   * @param {number} groupId - Group ID
   * @param {Object} groupData - Updated group data
   */
  async updateTechnicalGroup(groupId, groupData) {
    return api.put(`/technical-groups/${groupId}`, groupData);
  },

  /**
   * Delete technical group
   * WARNING: This endpoint may not exist in backend
   * @param {number} groupId - Group ID
   */
  async deleteTechnicalGroup(groupId) {
    return api.delete(`/technical-groups/${groupId}`);
  },

  // ==================== BUDGET ALLOCATIONS ====================
  
  /**
   * Get all budget allocations for a project
   * FIXED: Changed from /projects/{id}/budget-allocations to /budget/allocation/project/{id}
   * @param {number} projectId - Project ID
   */
  async getBudgetAllocations(projectId) {
    return api.get(`/budget/allocation/project/${projectId}`);
  },

  /**
   * Get single budget allocation
   * @param {number} allocationId - Allocation ID
   */
  async getBudgetAllocation(allocationId) {
    return api.get(`/budget/allocation/${allocationId}`);
  },

  /**
   * Create budget allocation with optional breakdowns
   * @param {Object} allocationData - Allocation data
   */
  async createBudgetAllocation(allocationData) {
    return api.post('/budget/allocation', allocationData);
  },

  /**
   * Update budget allocation
   * FIXED: Now requires allocation_id, not project_id
   * @param {number} allocationId - Allocation ID
   * @param {Object} allocationData - Updated allocation data
   */
  async updateBudgetAllocation(allocationId, allocationData) {
    return api.put(`/budget/allocation/${allocationId}`, allocationData);
  },

  /**
   * Delete budget allocation
   * @param {number} allocationId - Allocation ID
   */
  async deleteBudgetAllocation(allocationId) {
    return api.delete(`/budget/allocation/${allocationId}`);
  },

  // Budget Allocation Breakdowns

  /**
   * Get manpower breakdown for allocation
   * @param {number} allocationId - Allocation ID
   */
  async getManpowerBreakdownByAllocation(allocationId) {
    return api.get(`/budget/allocation/${allocationId}/manpower-breakdown`);
  },

  /**
   * Get manpower breakdown for project
   * @param {number} projectId - Project ID
   */
  async getManpowerBreakdown(projectId) {
    return api.get(`/budget/allocation/project/${projectId}/manpower-breakdown`);
  },

  /**
   * Delete manpower breakdown item
   * @param {number} breakdownId - Breakdown ID
   */
  async deleteManpowerBreakdown(breakdownId) {
    return api.delete(`/budget/manpower-breakdown/${breakdownId}`);
  },

  /**
   * Get equipment breakdown for allocation
   * @param {number} allocationId - Allocation ID
   */
  async getEquipmentBreakdownByAllocation(allocationId) {
    return api.get(`/budget/allocation/${allocationId}/equipment-breakdown`);
  },

  /**
   * Get equipment breakdown for project
   * @param {number} projectId - Project ID
   */
  async getEquipmentBreakdown(projectId) {
    return api.get(`/budget/allocation/project/${projectId}/equipment-breakdown`);
  },

  /**
   * Delete equipment breakdown item
   * @param {number} breakdownId - Breakdown ID
   */
  async deleteEquipmentBreakdown(breakdownId) {
    return api.delete(`/budget/equipment-breakdown/${breakdownId}`);
  },

  // ==================== MANPOWER ====================
  
  /**
   * Get all manpower records for a project
   * FIXED: Changed from /projects/{id}/manpower to /manpower/project/{id}
   * @param {number} projectId - Project ID
   * @param {Object} params - Query parameters (role filter, pagination)
   */
  async getManpower(projectId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/manpower/project/${projectId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single manpower record
   * @param {number} manpowerId - Manpower ID
   */
  async getManpowerById(manpowerId) {
    return api.get(`/manpower/${manpowerId}`);
  },

  /**
   * Add manpower record
   * @param {Object} manpowerData - Manpower data (project_id, role, salary_per_month, months, num_personnel, date_incurred)
   */
  async addManpower(manpowerData) {
  const params = new URLSearchParams();
  params.append('project_id', manpowerData.project_id);
  params.append('role', manpowerData.role);
  params.append('salary_per_month', manpowerData.salary_per_month);
  params.append('months', manpowerData.months);
  params.append('num_personnel', manpowerData.num_personnel);
  if (manpowerData.date_incurred) params.append('date_incurred', manpowerData.date_incurred);
  return api.post(`/manpower?${params.toString()}`);
},

  /**
   * Update manpower record
   * @param {number} manpowerId - Manpower ID
   * @param {Object} manpowerData - Updated manpower data
   */
  async updateManpower(manpowerId, manpowerData) {
    return api.put(`/manpower/${manpowerId}`, manpowerData);
  },

  /**
   * Delete manpower record
   * @param {number} manpowerId - Manpower ID
   */
  async deleteManpower(manpowerId) {
    return api.delete(`/manpower/${manpowerId}`);
  },

  /**
   * Get manpower summary for project
   * @param {number} projectId - Project ID
   */
  async getManpowerSummary(projectId) {
    return api.get(`/manpower/project/${projectId}/summary`);
  },

  /**
   * Get total manpower expenditure for project
   * @param {number} projectId - Project ID
   */
  async getManpowerTotal(projectId) {
    return api.get(`/manpower/project/${projectId}/total`);
  },

  // ==================== EQUIPMENT ====================
  
  /**
   * Get all equipment records for a project
   * FIXED: Changed from /projects/{id}/equipment to /equipment/project/{id}
   * @param {number} projectId - Project ID
   * @param {Object} params - Query parameters (name filter, pagination)
   */
  async getEquipment(projectId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/equipment/project/${projectId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single equipment record
   * @param {number} equipmentId - Equipment ID
   */
  async getEquipmentById(equipmentId) {
    return api.get(`/equipment/${equipmentId}`);
  },

  /**
   * Add equipment record
   * @param {Object} equipmentData - Equipment data (project_id, name, purchase_date, quantity, unit_cost)
   */
  async addEquipment(equipmentData) {
  const params = new URLSearchParams();
  params.append('project_id', equipmentData.project_id);
  params.append('name', equipmentData.name);
  params.append('quantity', equipmentData.quantity);
  params.append('unit_cost', equipmentData.unit_cost);
  if (equipmentData.purchase_date) params.append('purchase_date', equipmentData.purchase_date);
  return api.post(`/equipment?${params.toString()}`);
},

  /**
   * Update equipment record
   * @param {number} equipmentId - Equipment ID
   * @param {Object} equipmentData - Updated equipment data
   */
  async updateEquipment(equipmentId, equipmentData) {
    return api.put(`/equipment/${equipmentId}`, equipmentData);
  },

  /**
   * Delete equipment record
   * @param {number} equipmentId - Equipment ID
   */
  async deleteEquipment(equipmentId) {
    return api.delete(`/equipment/${equipmentId}`);
  },

  /**
   * Get equipment summary for project
   * @param {number} projectId - Project ID
   */
  async getEquipmentSummary(projectId) {
    return api.get(`/equipment/project/${projectId}/summary`);
  },

  /**
   * Get total equipment expenditure for project
   * @param {number} projectId - Project ID
   */
  async getEquipmentTotal(projectId) {
    return api.get(`/equipment/project/${projectId}/total`);
  },

  // ==================== FUNDS RECEIVED ====================
  
  /**
   * Get all funds received for a project
   * FIXED: Changed from /projects/{id}/funds-received to /funds/received/project/{id}
   * @param {number} projectId - Project ID
   * @param {Object} params - Query parameters (head filter, pagination)
   */
  async getFundsReceived(projectId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/funds/received/project/${projectId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single funds received record
   * @param {number} fundId - Fund ID
   */
  async getFundsReceivedById(fundId) {
    return api.get(`/funds/received/${fundId}`);
  },

  /**
   * Add funds received record
   * FIXED: Changed from /funds-received to /funds/received
   * @param {Object} fundsData - Funds data (project_id, head, amount, date_received, remarks)
   */
  async addFundsReceived(fundsData) {
  const params = new URLSearchParams();
  params.append('project_id', fundsData.project_id);
  params.append('head', fundsData.head);
  params.append('amount', fundsData.amount);
  params.append('date_received', fundsData.date_received);
  if (fundsData.remarks) params.append('remarks', fundsData.remarks);
  return api.post(`/funds/received?${params.toString()}`);
},

  /**
   * Update funds received record
   * FIXED: Changed from /funds-received to /funds/received
   * @param {number} fundId - Fund ID
   * @param {Object} fundsData - Updated funds data
   */
  async updateFundsReceived(fundId, fundsData) {
    return api.put(`/funds/received/${fundId}`, fundsData);
  },

  /**
   * Delete funds received record
   * FIXED: Changed from /funds-received to /funds/received
   * @param {number} fundId - Fund ID
   */
  async deleteFundsReceived(fundId) {
    return api.delete(`/funds/received/${fundId}`);
  },

  /**
   * Get funds received summary for project
   * @param {number} projectId - Project ID
   */
  async getFundsReceivedSummary(projectId) {
    return api.get(`/funds/received/project/${projectId}/summary`);
  },

  // Funds Breakdown

  /**
   * Get funds breakdown summary for project (uses database view)
   * @param {number} projectId - Project ID
   */
  async getFundsBreakdownSummary(projectId) {
    return api.get(`/funds/breakdown/summary/project/${projectId}`);
  },

  /**
   * Get manpower funds breakdown for project
   * @param {number} projectId - Project ID
   */
  async getManpowerFundsBreakdown(projectId) {
    return api.get(`/funds/breakdown/manpower/project/${projectId}`);
  },

  /**
   * Create manpower funds breakdown
   * @param {Object} breakdownData - Breakdown data
   */
  async createManpowerFundsBreakdown(breakdownData) {
  const params = new URLSearchParams();
  params.append('fund_id', breakdownData.fund_id);
  params.append('project_id', breakdownData.project_id);
  params.append('role', breakdownData.role);
  params.append('salary_per_month', breakdownData.salary_per_month);
  params.append('months', breakdownData.months);
  params.append('num_personnel', breakdownData.num_personnel);
  return api.post(`/funds/breakdown/manpower?${params.toString()}`);
},

  /**
   * Delete manpower funds breakdown
   * @param {number} breakdownId - Breakdown ID
   */
  async deleteManpowerFundsBreakdown(breakdownId) {
    return api.delete(`/funds/breakdown/manpower/${breakdownId}`);
  },

  /**
   * Get equipment funds breakdown for project
   * @param {number} projectId - Project ID
   */
  async getEquipmentFundsBreakdown(projectId) {
    return api.get(`/funds/breakdown/equipment/project/${projectId}`);
  },

  /**
   * Create equipment funds breakdown
   * @param {Object} breakdownData - Breakdown data
   */
  async createEquipmentFundsBreakdown(breakdownData) {
  const params = new URLSearchParams();
  params.append('fund_id', breakdownData.fund_id);
  params.append('project_id', breakdownData.project_id);
  params.append('item_name', breakdownData.item_name);
  params.append('quantity', breakdownData.quantity);
  params.append('unit_cost', breakdownData.unit_cost);
  return api.post(`/funds/breakdown/equipment?${params.toString()}`);
},

  /**
   * Delete equipment funds breakdown
   * @param {number} breakdownId - Breakdown ID
   */
  async deleteEquipmentFundsBreakdown(breakdownId) {
    return api.delete(`/funds/breakdown/equipment/${breakdownId}`);
  },

  // ==================== EXPENDITURE ====================
  // NOTE: This handles ONLY consumables, contingency, travel & training, overhead
  // Manpower and equipment expenditures use their own endpoints above
  
  /**
   * Get all expenditure records for a project
   * FIXED: Changed from /projects/{id}/expenditure to /expenditure/project/{id}
   * @param {number} projectId - Project ID
   * @param {Object} params - Query parameters (head filter, pagination)
   */
  async getExpenditure(projectId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/expenditure/project/${projectId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single expenditure record
   * @param {number} expenditureId - Expenditure ID
   */
  async getExpenditureById(expenditureId) {
    return api.get(`/expenditure/${expenditureId}`);
  },

  /**
   * Add expenditure record
   * @param {Object} expenditureData - Expenditure data (project_id, head, amount, date_incurred, description)
   * NOTE: head must be one of: consumables, contingency, travel & training, overhead
   */
  async addExpenditure(expenditureData) {
  const params = new URLSearchParams();
  params.append('project_id', expenditureData.project_id);
  params.append('head', expenditureData.head);
  params.append('amount', expenditureData.amount);
  if (expenditureData.date_incurred) params.append('date_incurred', expenditureData.date_incurred);
  if (expenditureData.description) params.append('description', expenditureData.description);
  return api.post(`/expenditure?${params.toString()}`);
},

  /**
   * Update expenditure record
   * @param {number} expenditureId - Expenditure ID
   * @param {Object} expenditureData - Updated expenditure data
   */
  async updateExpenditure(expenditureId, expenditureData) {
    return api.put(`/expenditure/${expenditureId}`, expenditureData);
  },

  /**
   * Delete expenditure record
   * @param {number} expenditureId - Expenditure ID
   */
  async deleteExpenditure(expenditureId) {
    return api.delete(`/expenditure/${expenditureId}`);
  },

  /**
   * Get expenditure summary for project (by head)
   * @param {number} projectId - Project ID
   */
  async getExpenditureSummary(projectId) {
    return api.get(`/expenditure/project/${projectId}/summary`);
  },

  /**
 * Get comprehensive expenditure data for project
 */
async getProjectExpenditures(projectId) {
  const [manpower, equipment, budget] = await Promise.all([
    this.getManpower(projectId),           // Already exists
    this.getEquipment(projectId),          // Already exists  
    this.getExpenditure(projectId)         // Already exists
  ]);
  
  return {
    manpower_expenditures: manpower,
    equipment_expenditures: equipment,
    budget_expenditures: budget  // consumables, contingency, etc.
  };
},

  // ==================== DASHBOARD & REPORTS ====================
  // NOTE: These endpoints were not in the provided backend files
  // They will return 404 if not implemented
  
  /**
   * Get dashboard statistics
   * WARNING: Verify this endpoint exists in backend
   */
  async getDashboardStats() {
    return api.get('/dashboard/stats');
  },

  /**
   * Generate report
   * WARNING: Verify this endpoint exists in backend
   * @param {string} reportType - Type of report
   * @param {Object} params - Report parameters
   */
  async generateReport(reportType, params) {
    return api.post(`/reports/${reportType}`, params);
  },
};

export default projectService;