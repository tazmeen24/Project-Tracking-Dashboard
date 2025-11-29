// services/projectService.js
import api from './api';

const projectService = {
  // Projects
  async getAllProjects() {
    return api.get('/projects');
  },

  async getProject(projectId) {
    return api.get(`/projects/${projectId}`);
  },

  async createProject(projectData) {
    return api.post('/projects', projectData);
  },

  async updateProject(projectId, projectData) {
    return api.put(`/projects/${projectId}`, projectData);
  },

  async deleteProject(projectId) {
    return api.delete(`/projects/${projectId}`);
  },

  // Investigators
  async getInvestigators(projectId) {
    return api.get(`/projects/${projectId}/investigators`);
  },

  async createInvestigator(investigatorData) {
    return api.post('/investigators', investigatorData);
  },

  async updateInvestigator(investigatorId, investigatorData) {
    return api.put(`/investigators/${investigatorId}`, investigatorData);
  },

  async deleteInvestigator(investigatorId) {
    return api.delete(`/investigators/${investigatorId}`);
  },

  // Funding Agencies
  async getAllFundingAgencies() {
    return api.get('/funding-agencies');
  },

  async getFundingAgency(agencyId) {
    return api.get(`/funding-agencies/${agencyId}`);
  },

  async createFundingAgency(agencyData) {
    return api.post('/funding-agencies', agencyData);
  },

  async updateFundingAgency(agencyId, agencyData) {
    return api.put(`/funding-agencies/${agencyId}`, agencyData);
  },

  async deleteFundingAgency(agencyId) {
    return api.delete(`/funding-agencies/${agencyId}`);
  },

  // Funding Agency Details
  async getFundingAgencyDetails(agencyId) {
    return api.get(`/funding-agencies/${agencyId}/details`);
  },

  async createFundingAgencyDetails(detailsData) {
    // Extract agency_id from the data
    const agencyId = detailsData.agency_id;
    return api.post(`/funding-agencies/${agencyId}/details`, detailsData);
  },

  async updateFundingAgencyDetails(agencyId, detailsData) {
    return api.put(`/funding-agencies/${agencyId}/details`, detailsData);
  },

  // Technical Groups
  async getAllTechnicalGroups() {
    return api.get('/technical-groups');
  },

  async getTechnicalGroup(groupId) {
    return api.get(`/technical-groups/${groupId}`);
  },

  async createTechnicalGroup(groupData) {
    return api.post('/technical-groups', groupData);
  },

  async updateTechnicalGroup(groupId, groupData) {
    return api.put(`/technical-groups/${groupId}`, groupData);
  },

  async deleteTechnicalGroup(groupId) {
    return api.delete(`/technical-groups/${groupId}`);
  },

  // Budget Allocations
  async getBudgetAllocations(projectId) {
    return api.get(`/projects/${projectId}/budget-allocations`);
  },

  async updateBudgetAllocation(projectId, allocationData) {
    return api.put(`/projects/${projectId}/budget-allocations`, allocationData);
  },

  // Manpower
  async getManpower(projectId) {
    return api.get(`/projects/${projectId}/manpower`);
  },

  async addManpower(manpowerData) {
    return api.post('/manpower', manpowerData);
  },

  async updateManpower(manpowerId, manpowerData) {
    return api.put(`/manpower/${manpowerId}`, manpowerData);
  },

  async deleteManpower(manpowerId) {
    return api.delete(`/manpower/${manpowerId}`);
  },

  // Equipment
  async getEquipment(projectId) {
    return api.get(`/projects/${projectId}/equipment`);
  },

  async addEquipment(equipmentData) {
    return api.post('/equipment', equipmentData);
  },

  async updateEquipment(equipmentId, equipmentData) {
    return api.put(`/equipment/${equipmentId}`, equipmentData);
  },

  async deleteEquipment(equipmentId) {
    return api.delete(`/equipment/${equipmentId}`);
  },

  // Funds Received
  async getFundsReceived(projectId) {
    return api.get(`/projects/${projectId}/funds-received`);
  },

  async addFundsReceived(fundsData) {
    return api.post('/funds-received', fundsData);
  },

  async updateFundsReceived(fundsId, fundsData) {
    return api.put(`/funds-received/${fundsId}`, fundsData);
  },

  async deleteFundsReceived(fundsId) {
    return api.delete(`/funds-received/${fundsId}`);
  },

  // Expenditure
  async getExpenditure(projectId) {
    return api.get(`/projects/${projectId}/expenditure`);
  },

  async addExpenditure(expenditureData) {
    return api.post('/expenditure', expenditureData);
  },

  async updateExpenditure(expenditureId, expenditureData) {
    return api.put(`/expenditure/${expenditureId}`, expenditureData);
  },

  async deleteExpenditure(expenditureId) {
    return api.delete(`/expenditure/${expenditureId}`);
  },

  // Dashboard Stats
  async getDashboardStats() {
    return api.get('/dashboard/stats');
  },

  // Reports
  async generateReport(reportType, params) {
    return api.post(`/reports/${reportType}`, params);
  },
};

export default projectService;