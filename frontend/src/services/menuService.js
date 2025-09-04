import api from './api.js';

const menuService = {
  // Get weekly menu
  getWeeklyMenu: async (startDate) => {
    return api.get('/menu/weekly', { params: { start_date: startDate } });
  },

  // Get menu items
  getMenuItems: (params = {}) => {
    return api.get('/menu/items', { params });
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

  // Get menu templates
  getMenuTemplates: () => {
    return api.get('/menu/templates');
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

  // Get menu categories
  getMenuCategories: () => {
    return api.get('/menu/categories');
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