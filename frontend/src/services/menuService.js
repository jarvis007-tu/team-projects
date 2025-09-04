import api from './api.js';

// Mock data for development
const mockWeeklyMenu = [
  {
    day: 'Monday',
    breakfast: {
      items: ['Idli', 'Sambar', 'Coconut Chutney', 'Coffee/Tea'],
      special: 'Fresh Fruit Salad',
      calories: 450,
      protein: 12
    },
    lunch: {
      items: ['Rice', 'Dal Tadka', 'Mixed Vegetable Curry', 'Curd', 'Pickle'],
      special: 'Paneer Butter Masala',
      calories: 750,
      protein: 25
    },
    dinner: {
      items: ['Chapati', 'Dal Fry', 'Aloo Gobi', 'Salad'],
      special: 'Gulab Jamun',
      calories: 650,
      protein: 20
    }
  },
  {
    day: 'Tuesday',
    breakfast: {
      items: ['Dosa', 'Sambar', 'Tomato Chutney', 'Coffee/Tea'],
      special: 'Medu Vada',
      calories: 480,
      protein: 14
    },
    lunch: {
      items: ['Rice', 'Sambar', 'Cabbage Poriyal', 'Rasam', 'Papad'],
      special: 'Chicken Curry (Non-Veg)',
      calories: 780,
      protein: 30
    },
    dinner: {
      items: ['Chapati', 'Chana Masala', 'Bhindi Fry', 'Rice'],
      special: 'Ice Cream',
      calories: 680,
      protein: 22
    }
  },
  {
    day: 'Wednesday',
    breakfast: {
      items: ['Poha', 'Jalebi', 'Coffee/Tea'],
      special: 'Boiled Eggs',
      calories: 420,
      protein: 10
    },
    lunch: {
      items: ['Rice', 'Rajma', 'Aloo Palak', 'Buttermilk'],
      special: 'Fish Curry (Non-Veg)',
      calories: 760,
      protein: 28
    },
    dinner: {
      items: ['Puri', 'Chole', 'Mixed Veg', 'Kheer'],
      special: 'Rasgulla',
      calories: 700,
      protein: 24
    }
  },
  {
    day: 'Thursday',
    breakfast: {
      items: ['Upma', 'Coconut Chutney', 'Banana', 'Coffee/Tea'],
      special: 'Bread Butter Jam',
      calories: 440,
      protein: 11
    },
    lunch: {
      items: ['Rice', 'Dal Makhani', 'Baingan Bharta', 'Raita'],
      special: 'Egg Curry',
      calories: 770,
      protein: 26
    },
    dinner: {
      items: ['Chapati', 'Kadai Paneer', 'Jeera Rice', 'Salad'],
      special: 'Fruit Custard',
      calories: 690,
      protein: 23
    }
  },
  {
    day: 'Friday',
    breakfast: {
      items: ['Paratha', 'Curd', 'Pickle', 'Coffee/Tea'],
      special: 'Sprouts Salad',
      calories: 460,
      protein: 13
    },
    lunch: {
      items: ['Biryani', 'Raita', 'Shorba', 'Papad'],
      special: 'Mutton Biryani (Non-Veg)',
      calories: 820,
      protein: 32
    },
    dinner: {
      items: ['Chapati', 'Palak Paneer', 'Dal', 'Rice'],
      special: 'Chocolate Mousse',
      calories: 670,
      protein: 21
    }
  },
  {
    day: 'Saturday',
    breakfast: {
      items: ['Pav Bhaji', 'Coffee/Tea'],
      special: 'Fresh Juice',
      calories: 490,
      protein: 15
    },
    lunch: {
      items: ['Rice', 'Kadhi Pakora', 'Aloo Matar', 'Salad'],
      special: 'Pasta in White Sauce',
      calories: 740,
      protein: 24
    },
    dinner: {
      items: ['Naan', 'Shahi Paneer', 'Veg Pulao', 'Raita'],
      special: 'Ras Malai',
      calories: 720,
      protein: 25
    }
  },
  {
    day: 'Sunday',
    breakfast: {
      items: ['Chole Bhature', 'Lassi', 'Coffee/Tea'],
      special: 'Fruit Bowl',
      calories: 520,
      protein: 16
    },
    lunch: {
      items: ['Rice', 'Mix Dal', 'Paneer Tikka', 'Naan', 'Salad'],
      special: 'Chicken Tikka (Non-Veg)',
      calories: 800,
      protein: 35
    },
    dinner: {
      items: ['Chapati', 'Matar Paneer', 'Jeera Aloo', 'Rice'],
      special: 'Gajar Halwa',
      calories: 680,
      protein: 22
    }
  }
];

const menuService = {
  // Get weekly menu
  getWeeklyMenu: async (startDate) => {
    // Mock API response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            menu: mockWeeklyMenu,
            start_date: startDate || new Date().toISOString(),
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
      }, 500);
    });
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