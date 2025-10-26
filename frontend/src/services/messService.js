import api from './api';

const messService = {
  // Get all active messes (public - for registration)
  getActiveMesses: async () => {
    const response = await api.get('/messes/active');
    return response.data;
  },

  // Get all messes (admin)
  getAllMesses: async (params = {}) => {
    const response = await api.get('/messes', { params });
    return response.data;
  },

  // Get single mess
  getMessById: async (messId) => {
    const response = await api.get(`/messes/${messId}`);
    return response.data;
  },

  // Get mess statistics
  getMessStats: async (messId) => {
    const response = await api.get(`/messes/${messId}/stats`);
    return response.data;
  },

  // Create new mess (super_admin)
  createMess: async (messData) => {
    const response = await api.post('/messes', messData);
    return response.data;
  },

  // Update mess
  updateMess: async (messId, messData) => {
    const response = await api.put(`/messes/${messId}`, messData);
    return response.data;
  },

  // Delete mess
  deleteMess: async (messId) => {
    const response = await api.delete(`/messes/${messId}`);
    return response.data;
  },

  // Toggle mess status
  toggleMessStatus: async (messId) => {
    const response = await api.patch(`/messes/${messId}/toggle-status`);
    return response.data;
  },

  // Update mess settings
  updateMessSettings: async (messId, settings) => {
    const response = await api.patch(`/messes/${messId}/settings`, { settings });
    return response.data;
  },

  // Get mess QR code
  getMessQRCode: async (messId) => {
    const response = await api.get(`/messes/${messId}/qr-code`);
    // Axios interceptor already unwraps to response.data, so just return response
    return response;
  },

  // Regenerate mess QR code
  regenerateMessQR: async (messId) => {
    const response = await api.post(`/messes/${messId}/regenerate-qr`);
    // Axios interceptor already unwraps to response.data, so just return response
    return response;
  }
};

export default messService;
