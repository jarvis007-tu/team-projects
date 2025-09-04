import api from './api.js';

const mealConfirmationService = {
  // Get all meal confirmations
  getAllConfirmations: (params = {}) => {
    return api.get('/meal-confirmations', { params });
  },

  // Get meal confirmation by ID
  getConfirmationById: (id) => {
    return api.get(`/meal-confirmations/${id}`);
  },

  // Create meal confirmation
  createConfirmation: (data) => {
    return api.post('/meal-confirmations', data);
  },

  // Update meal confirmation
  updateConfirmation: (id, data) => {
    return api.put(`/meal-confirmations/${id}`, data);
  },

  // Cancel meal confirmation
  cancelConfirmation: (id) => {
    return api.delete(`/meal-confirmations/${id}`);
  },

  // Get user's meal confirmations
  getUserConfirmations: (userId, params = {}) => {
    return api.get(`/meal-confirmations/user/${userId}`, { params });
  },

  // Get today's meal confirmations
  getTodayConfirmations: () => {
    return api.get('/meal-confirmations/today');
  },

  // Get meal confirmation statistics
  getConfirmationStats: (params = {}) => {
    return api.get('/meal-confirmations/stats', { params });
  },

  // Bulk create meal confirmations
  bulkCreateConfirmations: (data) => {
    return api.post('/meal-confirmations/bulk', data);
  },

  // Export meal confirmations
  exportConfirmations: (params = {}) => {
    return api.get('/meal-confirmations/export', {
      params,
      responseType: 'blob'
    });
  },

  // Get meal confirmation by date range
  getConfirmationsByDateRange: (startDate, endDate) => {
    return api.get('/meal-confirmations/range', {
      params: { startDate, endDate }
    });
  },

  // Check if user has confirmed meal for specific date and type
  checkUserConfirmation: (userId, date, mealType) => {
    return api.get('/meal-confirmations/check', {
      params: { userId, date, mealType }
    });
  },

  // Get confirmation analytics
  getConfirmationAnalytics: (params = {}) => {
    return api.get('/meal-confirmations/analytics', { params });
  },

  // Update bulk confirmations
  updateBulkConfirmations: (data) => {
    return api.put('/meal-confirmations/bulk-update', data);
  }
};

export default mealConfirmationService;