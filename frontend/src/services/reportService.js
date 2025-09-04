import api from './api.js';

const reportService = {
  // Get dashboard statistics
  getDashboardStats: (period = 'week') => {
    return api.get('/reports/dashboard', { params: { period } });
  },

  // Get revenue reports
  getRevenueReport: (params = {}) => {
    return api.get('/reports/revenue', { params });
  },

  // Get attendance analytics
  getAttendanceAnalytics: (params = {}) => {
    return api.get('/reports/attendance', { params });
  },

  // Get user activity reports
  getUserActivityReport: (params = {}) => {
    return api.get('/reports/user-activity', { params });
  },

  // Get subscription reports
  getSubscriptionReport: (params = {}) => {
    return api.get('/reports/subscriptions', { params });
  },

  // Get meal consumption reports
  getMealConsumptionReport: (params = {}) => {
    return api.get('/reports/meal-consumption', { params });
  },

  // Get financial summary
  getFinancialSummary: (params = {}) => {
    return api.get('/reports/financial-summary', { params });
  },

  // Get waste analysis
  getWasteAnalysis: (params = {}) => {
    return api.get('/reports/waste-analysis', { params });
  },

  // Export report to CSV
  exportToCSV: (reportType, filters = {}) => {
    return api.get(`/reports/${reportType}/export/csv`, {
      params: filters,
      responseType: 'blob'
    });
  },

  // Export report to PDF
  exportToPDF: (reportType, filters = {}) => {
    return api.get(`/reports/${reportType}/export/pdf`, {
      params: filters,
      responseType: 'blob'
    });
  },

  // Get comparative analysis
  getComparativeAnalysis: (params = {}) => {
    return api.get('/reports/comparative', { params });
  },

  // Get trends analysis
  getTrendsAnalysis: (metric, period = 'month') => {
    return api.get('/reports/trends', { 
      params: { metric, period } 
    });
  },

  // Get custom report
  getCustomReport: (config) => {
    return api.post('/reports/custom', config);
  },

  // Save custom report template
  saveCustomReportTemplate: (data) => {
    return api.post('/reports/templates', data);
  },

  // Get saved report templates
  getReportTemplates: () => {
    return api.get('/reports/templates');
  },

  // Generate scheduled report
  generateScheduledReport: (templateId) => {
    return api.post(`/reports/templates/${templateId}/generate`);
  },

  // Get report history
  getReportHistory: (params = {}) => {
    return api.get('/reports/history', { params });
  }
};

export default reportService;