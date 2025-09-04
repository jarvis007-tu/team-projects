import api from './api';

const dashboardService = {
  // Statistics
  getStats: () => api.get('/dashboard/stats'),
  
  // Activity
  getRecentActivity: (limit = 10) => 
    api.get(`/dashboard/recent-activity?limit=${limit}`),
  
  // Attendance Analytics
  getAttendanceStats: (period = 'week') => 
    api.get(`/dashboard/attendance-stats?period=${period}`),
  
  getTodayAttendance: () => 
    api.get('/dashboard/today-attendance'),
  
  getMealwiseAttendance: (date) => 
    api.get(`/dashboard/mealwise-attendance?date=${date}`),
  
  // Subscription Analytics
  getSubscriptionStats: () => 
    api.get('/dashboard/subscription-stats'),
  
  getExpiringSubscriptions: (days = 7) => 
    api.get(`/dashboard/expiring-subscriptions?days=${days}`),
  
  // Revenue Analytics
  getRevenueStats: (period = 'month') => 
    api.get(`/dashboard/revenue-stats?period=${period}`),
  
  // Alerts
  getSystemAlerts: () => 
    api.get('/dashboard/alerts'),
  
  // Quick Stats
  getQuickStats: () => 
    api.get('/dashboard/quick-stats'),
};

export default dashboardService;