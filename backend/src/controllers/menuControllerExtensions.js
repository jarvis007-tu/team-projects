const WeeklyMenu = require('../models/WeeklyMenu');
const logger = require('../utils/logger');

// Extension methods for menu controller
const menuExtensions = {
  // Get all menu items
  async getMenuItems(req, res) {
    try {
      const { category, search, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const whereConditions = { is_active: true };

      if (search) {
        whereConditions.items = {
          $regex: search,
          $options: 'i'
        };
      }

      const total = await WeeklyMenu.countDocuments(whereConditions);
      const menuItems = await WeeklyMenu.find(whereConditions)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .sort({ day: 1, meal_type: 1 });

      // Transform the data to match frontend expectations
      const transformedItems = menuItems.map(item => ({
        id: item.menu_id,
        name: item.meal_type + ' - ' + item.day,
        items: JSON.parse(item.items || '[]'),
        category: item.meal_type,
        day: item.day,
        special_note: item.special_note,
        is_available: item.is_active,
        nutrition: {
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0
        },
        created_at: item.createdAt,
        updated_at: item.updatedAt
      }));

      res.json({
        success: true,
        data: transformedItems,
        pagination: {
          total: total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching menu items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu items'
      });
    }
  },

  // Create menu item
  async createMenuItem(req, res) {
    try {
      const { name, items, category, day, special_note, nutrition } = req.body;

      const menuItem = await WeeklyMenu.create({
        day: day || 'monday',
        meal_type: category || 'breakfast',
        items: JSON.stringify(items || []),
        special_note,
        is_active: true,
        created_by: req.user.id,
        calories: nutrition?.calories,
        protein: nutrition?.protein,
        carbs: nutrition?.carbs,
        fat: nutrition?.fat
      });

      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: {
          id: menuItem.menu_id,
          name,
          items: JSON.parse(menuItem.items),
          category: menuItem.meal_type,
          day: menuItem.day,
          special_note: menuItem.special_note,
          is_available: menuItem.is_active
        }
      });
    } catch (error) {
      logger.error('Error creating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create menu item'
      });
    }
  },

  // Update menu item
  async updateMenuItem(req, res) {
    try {
      const { id } = req.params;
      const { name, items, category, day, special_note, is_available, nutrition } = req.body;

      const menuItem = await WeeklyMenu.findById(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      menuItem.day = day || menuItem.day;
      menuItem.meal_type = category || menuItem.meal_type;
      menuItem.items = items ? JSON.stringify(items) : menuItem.items;
      menuItem.special_note = special_note !== undefined ? special_note : menuItem.special_note;
      menuItem.is_active = is_available !== undefined ? is_available : menuItem.is_active;
      menuItem.calories = nutrition?.calories || menuItem.calories;
      menuItem.protein = nutrition?.protein || menuItem.protein;
      menuItem.carbs = nutrition?.carbs || menuItem.carbs;
      menuItem.fat = nutrition?.fat || menuItem.fat;

      await menuItem.save();

      res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: {
          id: menuItem.menu_id,
          name,
          items: JSON.parse(menuItem.items),
          category: menuItem.meal_type,
          day: menuItem.day,
          special_note: menuItem.special_note,
          is_available: menuItem.is_active
        }
      });
    } catch (error) {
      logger.error('Error updating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item'
      });
    }
  },

  // Get menu templates
  async getMenuTemplates(req, res) {
    try {
      // Mock templates for now - you can implement database storage later
      const templates = [
        {
          id: 1,
          name: 'Standard Vegetarian Menu',
          description: 'A balanced vegetarian menu for the week',
          menu_data: {
            monday: {
              breakfast: { items: ['Idli', 'Sambar', 'Chutney'] },
              lunch: { items: ['Rice', 'Dal', 'Vegetable'] },
              dinner: { items: ['Chapati', 'Curry', 'Salad'] }
            },
            tuesday: {
              breakfast: { items: ['Dosa', 'Sambar', 'Chutney'] },
              lunch: { items: ['Rice', 'Rasam', 'Poriyal'] },
              dinner: { items: ['Chapati', 'Paneer', 'Dal'] }
            }
          },
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 2,
          name: 'Premium Non-Veg Menu',
          description: 'Premium menu with non-vegetarian options',
          menu_data: {
            monday: {
              breakfast: { items: ['Bread', 'Eggs', 'Juice'] },
              lunch: { items: ['Rice', 'Chicken Curry', 'Salad'] },
              dinner: { items: ['Chapati', 'Fish Curry', 'Rice'] }
            },
            tuesday: {
              breakfast: { items: ['Paratha', 'Curd', 'Pickle'] },
              lunch: { items: ['Biryani', 'Raita', 'Shorba'] },
              dinner: { items: ['Naan', 'Mutton', 'Dal'] }
            }
          },
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        }
      ];

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error fetching menu templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu templates'
      });
    }
  },

  // Create menu template
  async createMenuTemplate(req, res) {
    try {
      const { name, description, menu_data } = req.body;

      // Mock implementation - store template
      const template = {
        id: Date.now(),
        name,
        description,
        menu_data,
        created_by: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      };

      res.status(201).json({
        success: true,
        message: 'Menu template created successfully',
        data: template
      });
    } catch (error) {
      logger.error('Error creating menu template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create menu template'
      });
    }
  },

  // Apply menu template
  async applyMenuTemplate(req, res) {
    try {
      const { id } = req.params;
      const { startDate } = req.body;

      // Mock implementation
      // In production, you would fetch the template and apply it to the weekly menu

      res.json({
        success: true,
        message: 'Menu template applied successfully'
      });
    } catch (error) {
      logger.error('Error applying menu template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply menu template'
      });
    }
  },

  // Get menu categories
  async getMenuCategories(req, res) {
    try {
      const categories = [
        { id: 1, name: 'breakfast', display_name: 'Breakfast' },
        { id: 2, name: 'lunch', display_name: 'Lunch' },
        { id: 3, name: 'dinner', display_name: 'Dinner' },
        { id: 4, name: 'snacks', display_name: 'Snacks' }
      ];

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching menu categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu categories'
      });
    }
  },

  // Create menu category
  async createMenuCategory(req, res) {
    try {
      const { name, display_name } = req.body;

      const category = {
        id: Date.now(),
        name,
        display_name,
        created_at: new Date()
      };

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      logger.error('Error creating menu category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create menu category'
      });
    }
  },

  // Get nutritional info
  async getNutritionalInfo(req, res) {
    try {
      const { id } = req.params;

      const menuItem = await WeeklyMenu.findById(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.json({
        success: true,
        data: {
          calories: menuItem.calories || 0,
          protein: menuItem.protein || 0,
          carbs: menuItem.carbs || 0,
          fat: menuItem.fat || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching nutritional info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nutritional info'
      });
    }
  },

  // Update nutritional info
  async updateNutritionalInfo(req, res) {
    try {
      const { id } = req.params;
      const { calories, protein, carbs, fat } = req.body;

      const menuItem = await WeeklyMenu.findById(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      menuItem.calories = calories;
      menuItem.protein = protein;
      menuItem.carbs = carbs;
      menuItem.fat = fat;

      await menuItem.save();

      res.json({
        success: true,
        message: 'Nutritional info updated successfully',
        data: {
          calories: menuItem.calories,
          protein: menuItem.protein,
          carbs: menuItem.carbs,
          fat: menuItem.fat
        }
      });
    } catch (error) {
      logger.error('Error updating nutritional info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update nutritional info'
      });
    }
  },

  // Upload menu image
  async uploadMenuImage(req, res) {
    try {
      const { id } = req.params;

      // Mock implementation
      // In production, you would handle file upload and storage

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          image_url: `/uploads/menu/${id}/image.jpg`
        }
      });
    } catch (error) {
      logger.error('Error uploading menu image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image'
      });
    }
  },

  // Export menu
  async exportMenu(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const menuItems = await WeeklyMenu.find({
        is_active: true,
        createdAt: {
          $gte: startDate || new Date(),
          $lte: endDate || new Date()
        }
      });

      // Mock CSV export
      const csv = 'Day,Meal Type,Items,Special Note\n' +
        menuItems.map(item =>
          `${item.day},${item.meal_type},"${item.items}","${item.special_note || ''}"`
        ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="menu-export.csv"');
      res.send(csv);
    } catch (error) {
      logger.error('Error exporting menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export menu'
      });
    }
  },

  // Import menu
  async importMenu(req, res) {
    try {
      // Mock implementation
      // In production, you would parse the uploaded file and import menu items

      res.json({
        success: true,
        message: 'Menu imported successfully',
        data: {
          imported: 10,
          failed: 0
        }
      });
    } catch (error) {
      logger.error('Error importing menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import menu'
      });
    }
  },

  // Get menu preview
  async getMenuPreview(req, res) {
    try {
      const { startDate } = req.params;
      const weekStart = new Date(startDate);

      const menuItems = await WeeklyMenu.find({
        is_active: true
      }).sort({ day: 1, meal_type: 1 });

      const preview = menuItems.reduce((acc, item) => {
        if (!acc[item.day]) {
          acc[item.day] = {};
        }
        acc[item.day][item.meal_type] = {
          items: JSON.parse(item.items || '[]'),
          special_note: item.special_note
        };
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          week_start: weekStart,
          menu: preview
        }
      });
    } catch (error) {
      logger.error('Error fetching menu preview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu preview'
      });
    }
  }
};

module.exports = menuExtensions;
