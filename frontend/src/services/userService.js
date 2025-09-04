import api from './api.js';

const userService = {
  // Get all users with filters
  getAllUsers: (params = {}) => {
    return api.get('/users', { params });
  },

  // Get user by ID
  getUserById: (id) => {
    return api.get(`/users/${id}`);
  },

  // Create user
  createUser: (data) => {
    return api.post('/users', data);
  },

  // Update user
  updateUser: (id, data) => {
    return api.put(`/users/${id}`, data);
  },

  // Delete user
  deleteUser: (id) => {
    return api.delete(`/users/${id}`);
  },

  // Bulk import users
  bulkImportUsers: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Export users
  exportUsers: (filters = {}) => {
    return api.get('/users/export', {
      params: filters,
      responseType: 'blob'
    });
  },

  // Get user statistics
  getUserStats: () => {
    return api.get('/users/stats');
  },

  // Update user profile settings
  updateUserProfile: (data) => {
    return api.put('/users/profile/update', data);
  },

  // Update user settings
  updateUserSettings: (data) => {
    return api.put('/users/settings', data);
  },

  // Get user settings
  getUserSettings: () => {
    return api.get('/users/settings');
  },

  // Get admin settings
  getAdminSettings: () => {
    return api.get('/users/settings/admin');
  },

  // Update admin settings  
  updateAdminSettings: (data) => {
    return api.put('/users/settings/admin', data);
  },

  // Get user profile
  getUserProfile: () => {
    return api.get('/users/profile/me');
  },

  // Update notification preferences
  updateNotificationPreferences: (data) => {
    return api.put('/users/settings', { preferences: data });
  },

  // Get notification preferences
  getNotificationPreferences: () => {
    return api.get('/users/settings').then(res => res.data?.preferences);
  },

  // Change password
  changePassword: (data) => {
    return api.post('/users/profile/change-password', data);
  },

  // Upload profile picture
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/users/profile/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get user activity log
  getUserActivityLog: (params = {}) => {
    return api.get('/users/activity-log', { params });
  },

  // Delete user account
  deleteUserAccount: () => {
    return api.delete('/users/account');
  }
};

export default userService;