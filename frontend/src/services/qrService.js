import api from './api.js';

const qrService = {
  // Generate QR code for user
  generateQRCode: (userId) => {
    return api.post(`/qr/generate/${userId}`);
  },

  // Validate QR code
  validateQRCode: (qrData) => {
    return api.post('/qr/validate', { qrData });
  },

  // Scan QR code for attendance
  scanQRCode: (data) => {
    return api.post('/qr/scan', data);
  },

  // Get QR code by user ID
  getUserQRCode: (userId) => {
    return api.get(`/qr/user/${userId}`);
  },

  // Regenerate QR code
  regenerateQRCode: (userId) => {
    return api.post(`/qr/regenerate/${userId}`);
  },

  // Get QR code statistics
  getQRStats: (params = {}) => {
    return api.get('/qr/stats', { params });
  },

  // Bulk generate QR codes
  bulkGenerateQRCodes: (userIds) => {
    return api.post('/qr/bulk-generate', { userIds });
  },

  // Download QR code as image
  downloadQRCode: (userId) => {
    return api.get(`/qr/download/${userId}`, {
      responseType: 'blob'
    });
  },

  // Get QR scan history
  getScanHistory: (params = {}) => {
    return api.get('/qr/scan-history', { params });
  },

  // Get user's scan history
  getUserScanHistory: (userId, params = {}) => {
    return api.get(`/qr/scan-history/${userId}`, { params });
  },

  // Verify QR code with location
  verifyQRWithLocation: (data) => {
    return api.post('/qr/verify-location', data);
  },

  // Get active QR codes
  getActiveQRCodes: (params = {}) => {
    return api.get('/qr/active', { params });
  },

  // Deactivate QR code
  deactivateQRCode: (qrId) => {
    return api.put(`/qr/deactivate/${qrId}`);
  },

  // Batch export QR codes
  exportQRCodes: (userIds) => {
    return api.post('/qr/export', { userIds }, {
      responseType: 'blob'
    });
  },

  // Get QR code settings
  getQRSettings: () => {
    return api.get('/qr/settings');
  },

  // Update QR code settings
  updateQRSettings: (settings) => {
    return api.put('/qr/settings', settings);
  }
};

export default qrService;