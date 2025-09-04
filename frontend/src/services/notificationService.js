import api from './api.js';

const notificationService = {
  // User notification methods
  getMyNotifications: async (params = {}) => {
    return api.get('/notifications/my-notifications', { params });
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    return api.put('/notifications/mark-all-read');
  },

  // Get all notifications
  getAllNotifications: (params = {}) => {
    return api.get('/notifications', { params });
  },

  // Send bulk notification
  sendBulkNotification: (data) => {
    return api.post('/notifications/bulk', data);
  },

  // Send targeted notification
  sendTargetedNotification: (data) => {
    return api.post('/notifications/targeted', data);
  },

  // Schedule notification
  scheduleNotification: (data) => {
    return api.post('/notifications/schedule', data);
  },

  // Get notification templates
  getNotificationTemplates: () => {
    return api.get('/notifications/templates');
  },

  // Create notification template
  createNotificationTemplate: (data) => {
    return api.post('/notifications/templates', data);
  },

  // Update notification template
  updateNotificationTemplate: (id, data) => {
    return api.put(`/notifications/templates/${id}`, data);
  },

  // Delete notification template
  deleteNotificationTemplate: (id) => {
    return api.delete(`/notifications/templates/${id}`);
  },

  // Get notification history
  getNotificationHistory: (params = {}) => {
    return api.get('/notifications/history', { params });
  },

  // Get notification analytics
  getNotificationAnalytics: (params = {}) => {
    return api.get('/notifications/analytics', { params });
  },

  // Update notification status
  updateNotificationStatus: (id, status) => {
    return api.patch(`/notifications/${id}/status`, { status });
  },

  // Delete notification
  deleteNotification: (id) => {
    return api.delete(`/notifications/${id}`);
  },

  // Get scheduled notifications
  getScheduledNotifications: () => {
    return api.get('/notifications/scheduled');
  },

  // Cancel scheduled notification
  cancelScheduledNotification: (id) => {
    return api.delete(`/notifications/scheduled/${id}`);
  },

  // Get notification preferences
  getNotificationPreferences: (userId) => {
    return api.get(`/users/${userId}/notification-preferences`);
  },

  // Update notification preferences
  updateNotificationPreferences: (userId, preferences) => {
    return api.put(`/users/${userId}/notification-preferences`, preferences);
  },

  // Send test notification
  sendTestNotification: (data) => {
    return api.post('/notifications/test', data);
  },

  // Get notification statistics
  getNotificationStats: (period = 'week') => {
    return api.get('/notifications/stats', { params: { period } });
  },

  // Export notification history
  exportNotificationHistory: (filters = {}) => {
    return api.get('/notifications/export', {
      params: filters,
      responseType: 'blob'
    });
  }
};

export default notificationService;