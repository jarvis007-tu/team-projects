import api from './api.js';

// Mock notifications data
const mockNotifications = [
  {
    notification_id: '1',
    title: 'Menu Updated',
    message: 'This week\'s menu has been updated with new special dishes.',
    type: 'info',
    category: 'Menu',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    action_url: '/user/menu',
    action_text: 'View Menu'
  },
  {
    notification_id: '2',
    title: 'Subscription Expiring Soon',
    message: 'Your meal subscription will expire in 7 days. Please renew to continue enjoying our services.',
    type: 'warning',
    category: 'Subscription',
    is_read: false,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    action_url: '/user/subscription',
    action_text: 'Renew Now'
  },
  {
    notification_id: '3',
    title: 'Meal Reminder',
    message: 'Don\'t forget to mark your attendance for today\'s dinner.',
    type: 'info',
    category: 'Attendance',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    notification_id: '4',
    title: 'Special Announcement',
    message: 'Tomorrow we will be serving a special feast for the festival. Don\'t miss it!',
    type: 'announcement',
    category: 'Announcement',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    notification_id: '5',
    title: 'Payment Successful',
    message: 'Your payment for the monthly subscription has been received successfully.',
    type: 'success',
    category: 'Payment',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

// Track notifications in memory
let notifications = [...mockNotifications];

const notificationService = {
  // User notification methods with mock data
  getMyNotifications: async (params = {}) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...notifications];
        
        // Apply filters
        if (params.filter === 'unread') {
          filtered = filtered.filter(n => !n.is_read);
        } else if (params.filter && params.filter !== 'all') {
          filtered = filtered.filter(n => n.type === params.filter);
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        resolve({
          data: {
            notifications: filtered,
            unread_count: notifications.filter(n => !n.is_read).length,
            total_count: filtered.length
          }
        });
      }, 300);
    });
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = notifications.findIndex(n => n.notification_id === notificationId);
        if (index !== -1) {
          notifications[index].is_read = true;
        }
        resolve({ success: true });
      }, 200);
    });
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        notifications = notifications.map(n => ({ ...n, is_read: true }));
        resolve({ success: true });
      }, 200);
    });
  },

  // Delete notification (user)
  deleteNotification: async (notificationId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        notifications = notifications.filter(n => n.notification_id !== notificationId);
        resolve({ success: true });
      }, 200);
    });
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