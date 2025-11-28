import api from './api.js';

const menuService = {
  // Get weekly menu (with optional mess_id for super_admin)
  getWeeklyMenu: async (startDate, messId = null) => {
    const params = {};
    if (startDate) params.week_start_date = startDate;
    if (messId) params.mess_id = messId;
    return api.get('/menu/weekly', { params });
  },

  // Get today's menu (with optional mess_id for super_admin)
  getTodayMenu: (messId = null) => {
    const params = {};
    if (messId) params.mess_id = messId;
    return api.get('/menu/today', { params });
  },

  // Get menu items (with optional mess_id for super_admin)
  getMenuItems: (params = {}) => {
    return api.get('/menu/items', { params });
  },

  // Get single menu item
  getMenuItem: (id) => {
    return api.get(`/menu/items/${id}`);
  },

  // Create menu item
  createMenuItem: (data) => {
    return api.post('/menu/items', data);
  },

  // Update menu item
  updateMenuItem: (id, data) => {
    return api.put(`/menu/items/${id}`, data);
  },

  // Delete menu item
  deleteMenuItem: (id) => {
    return api.delete(`/menu/items/${id}`);
  },

  // Update weekly menu
  updateWeeklyMenu: (data) => {
    return api.put('/menu/weekly', data);
  },

  // Create menu template
  createMenuTemplate: (data) => {
    return api.post('/menu/templates', data);
  },

  // Get menu templates (with optional mess_id for super_admin)
  getMenuTemplates: (messId = null) => {
    const params = {};
    if (messId) params.mess_id = messId;
    return api.get('/menu/templates', { params });
  },

  // Apply menu template
  applyMenuTemplate: (templateId, startDate) => {
    return api.post(`/menu/templates/${templateId}/apply`, { startDate });
  },

  // Get nutritional information
  getNutritionalInfo: (menuItemId) => {
    return api.get(`/menu/items/${menuItemId}/nutrition`);
  },

  // Update nutritional information
  updateNutritionalInfo: (menuItemId, data) => {
    return api.put(`/menu/items/${menuItemId}/nutrition`, data);
  },

  // Get menu categories (with optional mess_id for super_admin)
  getMenuCategories: (messId = null) => {
    const params = {};
    if (messId) params.mess_id = messId;
    return api.get('/menu/categories', { params });
  },

  // Create menu category
  createMenuCategory: (data) => {
    return api.post('/menu/categories', data);
  },

  // Upload menu image
  uploadMenuImage: (itemId, imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post(`/menu/items/${itemId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Export menu
  exportMenu: (startDate, endDate) => {
    return api.get('/menu/export', {
      params: { startDate, endDate },
      responseType: 'blob'
    });
  },

  // Import menu from file
  importMenu: (file) => {
    const formData = new FormData();
    formData.append('menuFile', file);
    return api.post('/menu/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get menu preview
  getMenuPreview: (startDate) => {
    return api.get(`/menu/preview/${startDate}`);
  }
};

export default menuService;