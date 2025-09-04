import api from './api.js';

const attendanceService = {
  // Get attendance records with filters
  getAttendanceRecords: (params = {}) => {
    return api.get('/attendance', { params });
  },

  // Get daily attendance summary
  getDailyAttendance: (date) => {
    return api.get(`/attendance/daily/${date}`);
  },

  // Mark attendance manually
  markAttendance: (data) => {
    return api.post('/attendance/mark', data);
  },

  // Update attendance record
  updateAttendance: (id, data) => {
    return api.put(`/attendance/${id}`, data);
  },

  // Delete attendance record
  deleteAttendance: (id) => {
    return api.delete(`/attendance/${id}`);
  },

  // Bulk mark attendance
  bulkMarkAttendance: (attendanceList) => {
    return api.post('/attendance/bulk-mark', { attendanceList });
  },

  // Get attendance analytics
  getAttendanceAnalytics: (params = {}) => {
    return api.get('/attendance/analytics', { params });
  },

  // Export attendance report
  exportAttendanceReport: (filters = {}) => {
    return api.get('/attendance/export', {
      params: filters,
      responseType: 'blob'
    });
  },

  // Get attendance summary by user
  getUserAttendanceSummary: (userId, params = {}) => {
    return api.get(`/attendance/user/${userId}/summary`, { params });
  },

  // Get meal-wise attendance
  getMealWiseAttendance: (params = {}) => {
    return api.get('/attendance/meal-wise', { params });
  },

  // Get attendance trends
  getAttendanceTrends: (period = 'week') => {
    return api.get('/attendance/trends', { params: { period } });
  },

  // Get missing attendance alerts
  getMissingAttendanceAlerts: () => {
    return api.get('/attendance/missing-alerts');
  }
};

export default attendanceService;