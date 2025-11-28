// utils/helpers.js

/**
 * Format currency in Indian Rupees
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * Format currency for PDF exports
 */
export const formatCurrencyForPDF = (amount) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `Rs. ${formatted}`;
};

/**
 * Format currency in short form (K, L, Cr)
 */
export const formatCurrencyShort = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

/**
 * Format date to Indian locale
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN');
};

/**
 * Format date to YYYY-MM-DD for input fields
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

/**
 * Get project status based on end date
 */
export const getProjectStatus = (project) => {
  if (!project.end_date) return 'Active';
  const endDate = new Date(project.end_date);
  return endDate >= new Date() ? 'Active' : 'Completed';
};

/**
 * Get status color class
 */
export const getStatusColor = (status) => {
  return status === 'Active'
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800';
};

/**
 * Calculate budget utilization percentage
 */
export const calculateUtilization = (expenditure, total) => {
  if (!total || total === 0) return 0;
  return ((expenditure / total) * 100).toFixed(1);
};

/**
 * Get utilization color based on percentage
 */
export const getUtilizationColor = (percentage) => {
  if (percentage >= 90) return 'text-red-600';
  if (percentage >= 75) return 'text-yellow-600';
  return 'text-green-600';
};

/**
 * Get project category label
 */
export const getProjectCategoryLabel = (category) => {
  const labels = {
    sponsored: 'Sponsored',
    'non-sponsored': 'Non-Sponsored',
  };
  return labels[category] || category;
};

/**
 * Get project type label
 */
export const getProjectTypeLabel = (type) => {
  const labels = {
    PFMS: 'PFMS',
    'NON-PFMS': 'Non-PFMS',
    'contract-research': 'Contract Research',
  };
  return labels[type] || type;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate mobile number (Indian format)
 */
export const isValidMobile = (mobile) => {
  const cleaned = mobile.replace(/\D/g, '');
  return cleaned.length >= 10;
};

/**
 * Calculate total from budget allocations
 */
export const calculateTotalAllocation = (allocations) => {
  return Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
};

/**
 * Group items by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
};

/**
 * Sort array by key
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    }
    return a[key] < b[key] ? 1 : -1;
  });
};

/**
 * Debounce function for search/filter inputs
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Download file from blob
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Constants
 */
export const BUDGET_HEADS = [
  'manpower',
  'equipment',
  'consumables',
  'contingency',
  'travel & training',
  'overhead',
];

export const EXPENDITURE_HEADS = [
  'consumables',
  'contingency',
  'travel & training',
  'overhead',
];

export const PROJECT_CATEGORIES = [
  { value: 'sponsored', label: 'Sponsored' },
  { value: 'non-sponsored', label: 'Non-Sponsored' },
];

export const PROJECT_TYPES = {
  sponsored: [
    { value: 'PFMS', label: 'PFMS' },
    { value: 'NON-PFMS', label: 'Non-PFMS' },
  ],
  'non-sponsored': [
    { value: 'contract-research', label: 'Contract Research' },
  ],
};