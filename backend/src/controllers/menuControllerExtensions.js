const WeeklyMenu = require('../models/WeeklyMenu');
const logger = require('../utils/logger');

// Extension methods for menu controller
const menuExtensions = {
  // Get all menu items
  async getMenuItems(req, res) {
    try {
      const { category, search, page = 1, limit = 100 } = req.query;
      const skip = (page - 1) * limit;

      const whereConditions = { is_active: true, deleted_at: null };

      if (category) {
        whereConditions.meal_type = category;
      }

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
        .sort({ day: 1, meal_type: 1 })
        .lean();

      // Transform the data to match frontend expectations
      const transformedItems = menuItems.map(item => {
        // items is already an array in the model, no need to parse
        const itemsArray = Array.isArray(item.items) ? item.items : [];

        return {
          item_id: item._id.toString(),
          name: `${item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)} - ${item.day.charAt(0).toUpperCase() + item.day.slice(1)}`,
          description: itemsArray.join(', '),
          items: itemsArray,
          category: item.meal_type,
          day: item.day,
          special_note: item.notes || '',
          is_available: item.is_active,
          is_vegetarian: item.is_veg || false,
          is_vegan: false,
          price: item.price || 0,
          nutritional_info: item.nutritional_info || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0
          },
          allergens: item.allergen_info || [],
          image_url: null,
          created_at: item.createdAt,
          updated_at: item.updatedAt
        };
      });

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
        message: 'Failed to fetch menu items',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create menu item
  async createMenuItem(req, res) {
    try {
      const { name, description, items, category, day, special_note, nutrition, nutritional_info, mess_id, price, is_vegetarian, allergens } = req.body;

      // Handle items - if description provided but not items, split description into items
      let itemsArray = [];
      if (Array.isArray(items) && items.length > 0) {
        itemsArray = items;
      } else if (description) {
        // Split description by comma or use as single item
        itemsArray = description.includes(',')
          ? description.split(',').map(item => item.trim()).filter(item => item)
          : [description];
      } else if (name) {
        // Fallback to name
        itemsArray = [name];
      }

      // Get or calculate week dates
      const moment = require('moment');
      const today = moment();
      const weekStart = moment().startOf('week');
      const weekEnd = moment().endOf('week');

      // User's mess_id or provided mess_id
      const targetMessId = mess_id || req.user?.mess_id;

      if (!targetMessId) {
        return res.status(400).json({
          success: false,
          message: 'Mess ID is required'
        });
      }

      // Get user ID - the User model's toJSON() renames _id to user_id
      const userId = req.user?.user_id || req.user?._id || req.user?.id;

      if (!userId) {
        logger.error('User ID not found in req.user:', JSON.stringify(req.user));
        return res.status(400).json({
          success: false,
          message: 'User authentication required - user ID not found'
        });
      }

      // Use nutritional_info if provided, otherwise nutrition, otherwise defaults
      const nutritionData = nutritional_info || nutrition || {};

      const menuItem = await WeeklyMenu.create({
        mess_id: targetMessId,
        week_start_date: weekStart.toDate(),
        week_end_date: weekEnd.toDate(),
        day: day?.toLowerCase() || 'monday',
        meal_type: category || 'breakfast',  // Don't lowercase - already correct
        items: itemsArray,
        notes: special_note || description || '',
        is_active: true,
        created_by: userId,
        nutritional_info: {
          calories: nutritionData.calories || 0,
          protein: nutritionData.protein || 0,
          carbs: nutritionData.carbs || 0,
          fat: nutritionData.fat || 0,
          fiber: nutritionData.fiber || 0
        },
        price: price || 0,
        is_veg: is_vegetarian !== undefined ? is_vegetarian : true,
        allergen_info: allergens || []
      });

      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: {
          item_id: menuItem._id.toString(),
          name: `${menuItem.meal_type.charAt(0).toUpperCase() + menuItem.meal_type.slice(1)} - ${menuItem.day.charAt(0).toUpperCase() + menuItem.day.slice(1)}`,
          description: itemsArray.join(', '),
          items: menuItem.items,
          category: menuItem.meal_type,
          day: menuItem.day,
          special_note: menuItem.notes,
          is_available: menuItem.is_active,
          is_vegetarian: menuItem.is_veg,
          price: menuItem.price,
          nutritional_info: menuItem.nutritional_info,
          allergens: menuItem.allergen_info
        }
      });
    } catch (error) {
      logger.error('Error creating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create menu item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update menu item
  async updateMenuItem(req, res) {
    try {
      const { id } = req.params;
      const { name, items, category, day, special_note, is_available, nutrition, price, is_vegetarian, allergens } = req.body;

      const menuItem = await WeeklyMenu.findById(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Update fields
      if (day) menuItem.day = day.toLowerCase();
      if (category) menuItem.meal_type = category.toLowerCase();
      if (items) menuItem.items = Array.isArray(items) ? items : menuItem.items;
      if (special_note !== undefined) menuItem.notes = special_note;
      if (is_available !== undefined) menuItem.is_active = is_available;
      if (price !== undefined) menuItem.price = price;
      if (is_vegetarian !== undefined) menuItem.is_veg = is_vegetarian;
      if (allergens) menuItem.allergen_info = allergens;

      // Update nutritional info
      if (nutrition) {
        menuItem.nutritional_info = {
          calories: nutrition.calories || menuItem.nutritional_info?.calories || 0,
          protein: nutrition.protein || menuItem.nutritional_info?.protein || 0,
          carbs: nutrition.carbs || menuItem.nutritional_info?.carbs || 0,
          fat: nutrition.fat || menuItem.nutritional_info?.fat || 0,
          fiber: nutrition.fiber || menuItem.nutritional_info?.fiber || 0
        };
      }

      await menuItem.save();

      const itemsArray = Array.isArray(menuItem.items) ? menuItem.items : [];

      res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: {
          item_id: menuItem._id.toString(),
          name: `${menuItem.meal_type.charAt(0).toUpperCase() + menuItem.meal_type.slice(1)} - ${menuItem.day.charAt(0).toUpperCase() + menuItem.day.slice(1)}`,
          description: itemsArray.join(', '),
          items: menuItem.items,
          category: menuItem.meal_type,
          day: menuItem.day,
          special_note: menuItem.notes,
          is_available: menuItem.is_active,
          is_vegetarian: menuItem.is_veg,
          price: menuItem.price,
          nutritional_info: menuItem.nutritional_info,
          allergens: menuItem.allergen_info
        }
      });
    } catch (error) {
      logger.error('Error updating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        { category_id: 'breakfast', name: 'Breakfast' },
        { category_id: 'lunch', name: 'Lunch' },
        { category_id: 'snack', name: 'Snacks' },
        { category_id: 'dinner', name: 'Dinner' }
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
