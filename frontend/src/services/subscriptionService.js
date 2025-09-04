import api from './api.js';

const subscriptionService = {
  // Get all subscriptions with filters
  getAllSubscriptions: (params = {}) => {
    return api.get('/subscriptions', { params });
  },

  // Get subscription by ID
  getSubscriptionById: (id) => {
    return api.get(`/subscriptions/${id}`);
  },

  // Create new subscription
  createSubscription: (data) => {
    return api.post('/subscriptions', data);
  },

  // Update subscription
  updateSubscription: (id, data) => {
    return api.put(`/subscriptions/${id}`, data);
  },

  // Delete subscription
  deleteSubscription: (id) => {
    return api.delete(`/subscriptions/${id}`);
  },

  // Renew subscription
  renewSubscription: (id, data) => {
    return api.post(`/subscriptions/${id}/renew`, data);
  },

  // Cancel subscription
  cancelSubscription: (id, reason) => {
    return api.post(`/subscriptions/${id}/cancel`, { reason });
  },

  // Bulk operations
  bulkUpdateSubscriptions: (ids, data) => {
    return api.patch('/subscriptions/bulk', { ids, ...data });
  },

  // Get subscription plans
  getSubscriptionPlans: () => {
    return api.get('/subscriptions/plans');
  },

  // Get subscription analytics
  getSubscriptionAnalytics: (period = 'month') => {
    return api.get('/subscriptions/analytics', { params: { period } });
  },

  // Export subscriptions
  exportSubscriptions: (filters = {}) => {
    return api.get('/subscriptions/export', { 
      params: filters,
      responseType: 'blob'
    });
  }
};

export default subscriptionService;