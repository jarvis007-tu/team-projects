const moment = require('moment');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const MenuTemplate = require('../models/MenuTemplate');
const WeeklyMenu = require('../models/WeeklyMenu');
const Mess = require('../models/Mess');
const logger = require('../utils/logger');
const { addMessFilter } = require('../utils/messHelpers');

class MenuController {
  // ==================== MENU ITEMS CRUD ====================

  /**
   * Get all menu items with filtering
   * super_admin: Can see all or filter by mess_id
   * mess_admin: Can only see their mess items
   */
  async getMenuItems(req, res) {
    try {
      const { category_id, search, page = 1, limit = 100, mess_id } = req.query;
      const skip = (page - 1) * limit;

      const queryConditions = { deleted_at: null };

      // Apply mess filtering based on role
      if (req.user.role === 'super_admin') {
        // Super admin can optionally filter by specific mess
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
        // Otherwise, no filter - sees all messes
      } else {
        // Mess admin can only see their own mess items
        queryConditions.mess_id = req.user.mess_id;
      }

      if (category_id) {
        queryConditions.category_id = category_id;
      }

      // Text search if provided
      let items;
      if (search) {
        items = await MenuItem.searchItems(search, queryConditions.mess_id)
          .populate('category_id', 'name display_name slug')
          .populate('mess_id', 'name code')
          .limit(parseInt(limit))
          .skip(parseInt(skip));
      } else {
        items = await MenuItem.find(queryConditions)
          .populate('category_id', 'name display_name slug')
          .populate('mess_id', 'name code')
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort({ name: 1 });
      }

      const total = await MenuItem.countDocuments(queryConditions);

      res.json({
        success: true,
        data: items,
        pagination: {
          total,
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
  }

  /**
   * Get single menu item by ID
   */
  async getMenuItem(req, res) {
    try {
      const { id } = req.params;

      const item = await MenuItem.findById(id)
        .populate('category_id', 'name display_name slug')
        .populate('mess_id', 'name code')
        .populate('created_by', 'full_name email');

      if (!item || item.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Mess boundary check
      if (req.user.role === 'mess_admin' &&
          item.mess_id._id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      logger.error('Error fetching menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu item'
      });
    }
  }

  /**
   * Create new menu item
   * super_admin: Can specify any mess_id
   * mess_admin: Can only create for their mess
   */
  async createMenuItem(req, res) {
    try {
      const {
        name,
        description,
        category_id,
        category, // Support legacy field name
        price,
        image_url,
        nutritional_info,
        allergen_info,
        is_vegetarian,
        is_vegan,
        is_available,
        preparation_time,
        serving_size,
        ingredients,
        mess_id
      } = req.body;

      // Support both category_id and category field names
      const categoryId = category_id || category;

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category is required'
        });
      }

      // Determine target mess_id
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      if (!targetMessId) {
        return res.status(400).json({
          success: false,
          message: 'Mess ID is required'
        });
      }

      // Get user ID
      const userId = req.user.user_id || req.user._id || req.user.id;

      const menuItem = await MenuItem.create({
        mess_id: targetMessId,
        name,
        description,
        category_id: categoryId,
        price: price || 0,
        image_url,
        nutritional_info: nutritional_info || {},
        allergen_info: allergen_info || [],
        is_vegetarian: is_vegetarian !== undefined ? is_vegetarian : false,
        is_vegan: is_vegan !== undefined ? is_vegan : false,
        is_available: is_available !== undefined ? is_available : true,
        preparation_time: preparation_time || 0,
        serving_size: serving_size || '1 serving',
        ingredients: ingredients || [],
        created_by: userId
      });

      // Populate before sending
      await menuItem.populate('category_id', 'name display_name slug');
      await menuItem.populate('mess_id', 'name code');

      logger.info(`Menu item created by ${req.user.role}: ${req.user.user_id} for mess ${targetMessId}`);

      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: menuItem
      });
    } catch (error) {
      logger.error('Error creating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create menu item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update menu item
   * super_admin: Can update any item
   * mess_admin: Can only update their mess items
   */
  async updateMenuItem(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Support both category_id and category field names
      if (updateData.category && !updateData.category_id) {
        updateData.category_id = updateData.category;
      }

      const menuItem = await MenuItem.findById(id);

      if (!menuItem || menuItem.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Mess boundary check
      if (req.user.role === 'mess_admin' &&
          menuItem.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update menu items for your own mess'
        });
      }

      // Update fields
      const allowedFields = [
        'name', 'description', 'category_id', 'price', 'image_url',
        'nutritional_info', 'allergen_info', 'is_vegetarian', 'is_vegan',
        'is_available', 'preparation_time', 'serving_size', 'ingredients'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          menuItem[field] = updateData[field];
        }
      });

      await menuItem.save();

      // Populate before sending
      await menuItem.populate('category_id', 'name display_name slug');
      await menuItem.populate('mess_id', 'name code');

      logger.info(`Menu item updated by ${req.user.role}: ${req.user.user_id}`);

      res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: menuItem
      });
    } catch (error) {
      logger.error('Error updating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete menu item (soft delete)
   * super_admin: Can delete any item
   * mess_admin: Can only delete their mess items
   */
  async deleteMenuItem(req, res) {
    try {
      const { id } = req.params;

      const menuItem = await MenuItem.findById(id);

      if (!menuItem || menuItem.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Mess boundary check
      if (req.user.role === 'mess_admin' &&
          menuItem.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete menu items for your own mess'
        });
      }

      await menuItem.softDelete();

      logger.info(`Menu item deleted by ${req.user.role}: ${req.user.user_id}`);

      res.json({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete menu item'
      });
    }
  }

  // ==================== MENU CATEGORIES ====================

  /**
   * Get menu categories
   * Filtered by mess
   */
  async getMenuCategories(req, res) {
    try {
      const { mess_id } = req.query;

      const queryConditions = { deleted_at: null, is_active: true };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      const categories = await MenuCategory.find(queryConditions)
        .sort({ sort_order: 1, name: 1 });

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
  }

  /**
   * Create menu category
   */
  async createMenuCategory(req, res) {
    try {
      const { name, display_name, description, icon, color, sort_order, mess_id } = req.body;

      // Determine target mess_id
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      const slug = name.toLowerCase().replace(/\s+/g, '-');

      const category = await MenuCategory.create({
        mess_id: targetMessId,
        name,
        slug,
        display_name: display_name || name,
        description,
        icon: icon || 'MdRestaurantMenu',
        color: color || 'blue',
        sort_order: sort_order || 0,
        is_default: false
      });

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
  }

  // ==================== WEEKLY MENU ====================

  /**
   * Get weekly menu
   * Returns menu items grouped by day and category
   */
  async getWeeklyMenu(req, res) {
    try {
      const { week_start_date, is_active = true, mess_id } = req.query;

      const queryConditions = { deleted_at: null };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      if (is_active !== undefined) queryConditions.is_active = is_active === 'true';
      if (week_start_date) queryConditions.week_start_date = week_start_date;

      const menu = await WeeklyMenu.find(queryConditions)
        .populate({
          path: 'menu_items',
          populate: { path: 'category_id', select: 'name display_name slug' }
        })
        .populate('category_id', 'name display_name slug')
        .populate('mess_id', 'name code')
        .sort({ day: 1, 'category_id.sort_order': 1 });

      // Group by day and category
      const groupedMenu = {};

      for (const item of menu) {
        if (!groupedMenu[item.day]) {
          groupedMenu[item.day] = {};
        }

        const categoryName = item.category_id?.slug || 'uncategorized';

        groupedMenu[item.day][categoryName] = {
          menu_items: item.menu_items || [],
          items: item.items || [], // Legacy support
          special_note: item.notes || ''
        };
      }

      res.json({
        success: true,
        data: groupedMenu
      });
    } catch (error) {
      logger.error('Error fetching weekly menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weekly menu'
      });
    }
  }

  /**
   * Get today's menu
   */
  async getTodayMenu(req, res) {
    try {
      const today = moment().format('dddd').toLowerCase();
      const { mess_id } = req.query;

      const queryConditions = {
        day: today,
        is_active: true,
        deleted_at: null
      };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      const menu = await WeeklyMenu.find(queryConditions)
        .populate({
          path: 'menu_items',
          populate: { path: 'category_id', select: 'name display_name slug' }
        })
        .populate('category_id', 'name display_name slug')
        .populate('mess_id', 'name code')
        .sort({ 'category_id.sort_order': 1 });

      const todayMenu = {};
      for (const item of menu) {
        const categoryName = item.category_id?.slug || 'uncategorized';
        todayMenu[categoryName] = {
          menu_items: item.menu_items || [],
          items: item.items || [], // Legacy support
          special_note: item.notes || ''
        };
      }

      res.json({
        success: true,
        data: {
          date: moment().format('YYYY-MM-DD'),
          day: today,
          menu: todayMenu
        }
      });
    } catch (error) {
      logger.error('Error fetching today menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s menu',
        error: error.message
      });
    }
  }

  /**
   * Update weekly menu
   * Replaces entire week's menu
   */
  async updateWeeklyMenu(req, res) {
    try {
      const { menu, week_start_date, mess_id } = req.body;

      // Determine target mess_id
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      // Build filter for deactivation
      const deactivateFilter = { is_active: true, mess_id: targetMessId };

      // Deactivate old menu for the target mess only
      await WeeklyMenu.updateMany(deactivateFilter, { is_active: false });

      // Create new menu items
      const menuDocs = [];
      const days = Object.keys(menu);
      const userId = req.user.user_id || req.user._id || req.user.id;

      for (const day of days) {
        const categories = Object.keys(menu[day]);

        for (const categorySlug of categories) {
          const mealData = menu[day][categorySlug];

          // Find category by slug
          const category = await MenuCategory.findOne({
            mess_id: targetMessId,
            slug: categorySlug,
            deleted_at: null
          });

          if (!category) {
            logger.warn(`Category not found: ${categorySlug} for mess ${targetMessId}`);
            continue;
          }

          menuDocs.push({
            day: day.toLowerCase(),
            category_id: category._id,
            menu_items: mealData.menu_items || [],
            items: mealData.items || [], // Legacy support
            notes: mealData.special_note || mealData.notes || '',
            week_start_date,
            week_end_date: moment(week_start_date).add(6, 'days').toDate(),
            mess_id: targetMessId,
            is_active: true,
            created_by: userId
          });
        }
      }

      await WeeklyMenu.insertMany(menuDocs);

      logger.info(`Weekly menu updated by ${req.user.role}: ${req.user.user_id} for mess ${targetMessId}`);

      res.json({
        success: true,
        message: 'Weekly menu updated successfully'
      });
    } catch (error) {
      logger.error('Error updating weekly menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update weekly menu'
      });
    }
  }

  // ==================== MENU TEMPLATES ====================

  /**
   * Get menu templates
   * Filtered by mess
   */
  async getMenuTemplates(req, res) {
    try {
      const { mess_id } = req.query;

      const queryConditions = { deleted_at: null, is_active: true };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      const templates = await MenuTemplate.find(queryConditions)
        .populate('mess_id', 'name code')
        .populate('created_by', 'full_name email')
        .sort({ usage_count: -1, createdAt: -1 });

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
  }

  /**
   * Create menu template
   */
  async createMenuTemplate(req, res) {
    try {
      const { name, description, menu_data, mess_id } = req.body;

      // Determine target mess_id
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      const userId = req.user.user_id || req.user._id || req.user.id;

      const template = await MenuTemplate.create({
        mess_id: targetMessId,
        name,
        description,
        menu_data,
        created_by: userId
      });

      await template.populate('mess_id', 'name code');
      await template.populate('created_by', 'full_name email');

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
  }

  /**
   * Apply menu template to a week
   */
  async applyMenuTemplate(req, res) {
    try {
      const { id } = req.params;
      const { startDate, mess_id } = req.body;

      const template = await MenuTemplate.findById(id);

      if (!template || template.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Mess boundary check
      if (req.user.role === 'mess_admin' &&
          template.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Apply template using updateWeeklyMenu logic
      await this.updateWeeklyMenu({
        user: req.user,
        body: {
          menu: template.menu_data,
          week_start_date: startDate,
          mess_id: mess_id || template.mess_id
        }
      }, res);

      // Increment usage count
      await template.incrementUsage();

      // Response already sent by updateWeeklyMenu
    } catch (error) {
      logger.error('Error applying menu template:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to apply menu template'
        });
      }
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get menu preview for a week
   */
  async getMenuPreview(req, res) {
    try {
      const { startDate } = req.params;
      const { mess_id } = req.query;

      const queryConditions = {
        week_start_date: startDate,
        is_active: true,
        deleted_at: null
      };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      const menu = await WeeklyMenu.find(queryConditions)
        .populate({
          path: 'menu_items',
          populate: { path: 'category_id', select: 'name display_name' }
        })
        .populate('category_id', 'name display_name slug')
        .sort({ day: 1, 'category_id.sort_order': 1 });

      // Group by day and category
      const preview = {};

      for (const item of menu) {
        if (!preview[item.day]) {
          preview[item.day] = {};
        }

        const categoryName = item.category_id?.slug || 'uncategorized';

        preview[item.day][categoryName] = {
          menu_items: item.menu_items,
          special_note: item.notes || ''
        };
      }

      res.json({
        success: true,
        data: {
          week_start: startDate,
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

  /**
   * Export menu to CSV
   */
  async exportMenu(req, res) {
    try {
      const { startDate, endDate, mess_id } = req.query;

      const queryConditions = {
        is_active: true,
        deleted_at: null
      };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      if (startDate || endDate) {
        queryConditions.week_start_date = {};
        if (startDate) queryConditions.week_start_date.$gte = new Date(startDate);
        if (endDate) queryConditions.week_start_date.$lte = new Date(endDate);
      }

      const menuItems = await WeeklyMenu.find(queryConditions)
        .populate('menu_items', 'name price')
        .populate('category_id', 'name')
        .populate('mess_id', 'name');

      // CSV export
      const csv = 'Mess,Day,Category,Menu Items,Notes\n' +
        menuItems.map(item => {
          const messName = item.mess_id?.name || '';
          const categoryName = item.category_id?.name || '';
          const itemNames = item.menu_items?.map(mi => mi.name).join('; ') || item.items?.join('; ') || '';
          const notes = item.notes || '';
          return `"${messName}","${item.day}","${categoryName}","${itemNames}","${notes}"`;
        }).join('\n');

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
  }

  // Get special menu items
  async getSpecialMenu(req, res) {
    try {
      const { mess_id } = req.query;
      const queryConditions = {
        is_active: true,
        deleted_at: null,
        special_items: { $exists: true, $ne: [] }
      };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      const specialMenus = await WeeklyMenu.find(queryConditions)
        .populate('menu_items', 'name description price')
        .populate('category_id', 'name')
        .populate('mess_id', 'name')
        .sort({ week_start_date: -1, day: 1 });

      res.status(200).json({
        success: true,
        data: specialMenus
      });
    } catch (error) {
      logger.error('Error fetching special menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch special menu'
      });
    }
  }

  // Get nutritional information for a menu item
  async getNutritionalInfo(req, res) {
    try {
      const { id } = req.params;
      const menuItem = await MenuItem.findById(id);

      if (!menuItem || menuItem.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          nutritional_info: menuItem.nutritional_info,
          allergen_info: menuItem.allergen_info,
          is_vegetarian: menuItem.is_vegetarian,
          is_vegan: menuItem.is_vegan
        }
      });
    } catch (error) {
      logger.error('Error fetching nutritional info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nutritional information'
      });
    }
  }

  // Update nutritional information for a menu item
  async updateNutritionalInfo(req, res) {
    try {
      const { id } = req.params;
      const { nutritional_info, allergen_info, is_vegetarian, is_vegan } = req.body;

      const menuItem = await MenuItem.findById(id);

      if (!menuItem || menuItem.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Verify mess access
      if (req.user.role !== 'super_admin' && menuItem.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (nutritional_info) menuItem.nutritional_info = nutritional_info;
      if (allergen_info) menuItem.allergen_info = allergen_info;
      if (is_vegetarian !== undefined) menuItem.is_vegetarian = is_vegetarian;
      if (is_vegan !== undefined) menuItem.is_vegan = is_vegan;

      await menuItem.save();

      res.status(200).json({
        success: true,
        message: 'Nutritional information updated successfully',
        data: menuItem
      });
    } catch (error) {
      logger.error('Error updating nutritional info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update nutritional information'
      });
    }
  }

  // Upload menu item image (placeholder - requires multer setup)
  async uploadMenuImage(req, res) {
    try {
      const { id } = req.params;

      // This is a placeholder - actual implementation requires multer middleware
      res.status(501).json({
        success: false,
        message: 'Image upload not yet implemented. Requires file storage configuration.'
      });
    } catch (error) {
      logger.error('Error uploading menu image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload menu image'
      });
    }
  }

  // Import menu data (placeholder)
  async importMenu(req, res) {
    try {
      // This is a placeholder - actual implementation requires CSV parsing
      res.status(501).json({
        success: false,
        message: 'Menu import not yet implemented. Requires CSV parser configuration.'
      });
    } catch (error) {
      logger.error('Error importing menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import menu'
      });
    }
  }

  // Upsert menu item (legacy method - creates or updates)
  async upsertMenuItem(req, res) {
    try {
      const { id, ...itemData } = req.body;

      if (id) {
        // Update existing
        req.params.id = id;
        return await this.updateMenuItem(req, res);
      } else {
        // Create new
        return await this.createMenuItem(req, res);
      }
    } catch (error) {
      logger.error('Error upserting menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save menu item'
      });
    }
  }

  // Get menu history
  async getMenuHistory(req, res) {
    try {
      const { mess_id, limit = 10 } = req.query;
      const queryConditions = { deleted_at: null };

      // Apply mess filtering
      if (req.user.role === 'super_admin') {
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        queryConditions.mess_id = req.user.mess_id;
      }

      const history = await WeeklyMenu.find(queryConditions)
        .populate('menu_items', 'name price')
        .populate('category_id', 'name')
        .populate('created_by', 'full_name')
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching menu history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu history'
      });
    }
  }

  // Activate menu version (placeholder - requires versioning implementation)
  async activateMenuVersion(req, res) {
    try {
      const { version_id } = req.body;

      // This is a placeholder - actual implementation requires menu versioning system
      res.status(501).json({
        success: false,
        message: 'Menu versioning not yet implemented'
      });
    } catch (error) {
      logger.error('Error activating menu version:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate menu version'
      });
    }
  }
}

module.exports = new MenuController();
