const moment = require('moment');
const WeeklyMenu = require('../models/WeeklyMenu');
const logger = require('../utils/logger');
const { addMessFilter } = require('../utils/messHelpers');

class MenuController {
  // Get weekly menu
  async getWeeklyMenu(req, res) {
    try {
      const { week_start_date, is_active = true, mess_id } = req.query;

      const queryConditions = { deleted_at: null };

      // Add mess filtering
      addMessFilter(queryConditions, req.user, mess_id);

      if (is_active !== undefined) queryConditions.is_active = is_active === 'true';
      if (week_start_date) queryConditions.week_start_date = week_start_date;

      const menu = await WeeklyMenu.find(queryConditions)
        .populate('mess_id', 'name code')
        .sort({ day: 1, meal_type: 1 });

      // Group by day
      const groupedMenu = menu.reduce((acc, item) => {
        if (!acc[item.day]) {
          acc[item.day] = {};
        }

        // items is already an array from the model
        const itemsArray = Array.isArray(item.items) ? item.items : [];

        acc[item.day][item.meal_type] = {
          items: itemsArray,
          special_note: item.notes || item.special_note || ''
        };
        return acc;
      }, {});

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

  // Get today's menu
  async getTodayMenu(req, res) {
    try {
      const today = moment().format('dddd').toLowerCase();
      const { mess_id } = req.query;

      const queryConditions = {
        day: today,
        is_active: true,
        deleted_at: null
      };

      // Add mess filtering
      addMessFilter(queryConditions, req.user, mess_id);

      const menu = await WeeklyMenu.find(queryConditions)
        .populate('mess_id', 'name code')
        .sort({ meal_type: 1 });

      const todayMenu = menu.reduce((acc, item) => {
        // items is already an array from the model
        const itemsArray = Array.isArray(item.items) ? item.items : [];

        acc[item.meal_type] = {
          items: itemsArray,
          special_note: item.notes || item.special_note || ''
        };
        return acc;
      }, {});

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

  // Create or update menu item
  async upsertMenuItem(req, res) {
    try {
      const { day, meal_type, items, special_note, week_start_date, mess_id } = req.body;

      // Determine mess_id: super_admin can specify, mess_admin uses their own
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      // Check if menu item exists for this mess
      let menuItem = await WeeklyMenu.findOne({
        day,
        meal_type,
        mess_id: targetMessId,
        is_active: true
      });

      if (menuItem) {
        // Mess boundary check for updates
        if (req.user.role === 'mess_admin' &&
            menuItem.mess_id.toString() !== req.user.mess_id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only manage menus for your own mess'
          });
        }

        // Update existing - items should be array, not JSON string
        menuItem.items = Array.isArray(items) ? items : (typeof items === 'string' ? JSON.parse(items) : []);
        menuItem.notes = special_note;
        menuItem.week_start_date = week_start_date;
        menuItem.week_end_date = moment(week_start_date).add(6, 'days').toDate();
        menuItem.created_by = req.user._id || req.user.id;
        await menuItem.save();
      } else {
        // Create new - items should be array, not JSON string
        const itemsArray = Array.isArray(items) ? items : (typeof items === 'string' ? JSON.parse(items) : []);

        menuItem = await WeeklyMenu.create({
          day: day.toLowerCase(),
          meal_type: meal_type.toLowerCase(),
          items: itemsArray,
          notes: special_note,
          week_start_date,
          week_end_date: moment(week_start_date).add(6, 'days').toDate(),
          mess_id: targetMessId,
          is_active: true,
          created_by: req.user._id || req.user.id
        });
      }

      logger.info(`Menu item upserted by ${req.user.role}: ${req.user.user_id} for mess ${targetMessId}`);

      res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: menuItem
      });
    } catch (error) {
      logger.error('Error upserting menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item'
      });
    }
  }

  // Update entire weekly menu
  async updateWeeklyMenu(req, res) {
    try {
      const { menu, week_start_date, mess_id } = req.body;

      // Determine mess_id: super_admin can specify, mess_admin uses their own
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      // Build filter for deactivation - CRITICAL: Filter by mess_id to avoid affecting other messes
      const deactivateFilter = { is_active: true };
      if (req.user.role !== 'super_admin') {
        deactivateFilter.mess_id = targetMessId;
      } else if (mess_id) {
        // If super_admin specified a mess, only deactivate that mess's menu
        deactivateFilter.mess_id = mess_id;
      }

      // Deactivate old menu for the target mess only
      await WeeklyMenu.updateMany(
        deactivateFilter,
        { is_active: false }
      );

      // Create new menu items
      const menuItems = [];
      const days = Object.keys(menu);

      for (const day of days) {
        const meals = Object.keys(menu[day]);
        for (const meal_type of meals) {
          const mealData = menu[day][meal_type];
          // items should be an array, not JSON string
          const itemsArray = Array.isArray(mealData.items) ? mealData.items :
                            (typeof mealData.items === 'string' ? JSON.parse(mealData.items) : []);

          menuItems.push({
            day: day.toLowerCase(),
            meal_type: meal_type.toLowerCase(),
            items: itemsArray,
            notes: mealData.special_note || mealData.notes || '',
            week_start_date,
            week_end_date: moment(week_start_date).add(6, 'days').toDate(),
            mess_id: targetMessId,
            is_active: true,
            created_by: req.user._id || req.user.id
          });
        }
      }

      await WeeklyMenu.insertMany(menuItems);

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

  // Delete menu item
  async deleteMenuItem(req, res) {
    try {
      const { id } = req.params;

      // Find menu item first for permission checks
      const menuItem = await WeeklyMenu.findById(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Mess boundary check - mess_admin can only delete their own mess menu items
      if (req.user.role === 'mess_admin' &&
          menuItem.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only manage menus for your own mess'
        });
      }

      await WeeklyMenu.findByIdAndDelete(id);

      logger.info(`Menu item deleted by ${req.user.role}: ${req.user.user_id} for mess ${menuItem.mess_id}`);

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

  // Get menu history
  async getMenuHistory(req, res) {
    try {
      const { page = 1, limit = 10, mess_id } = req.query;
      const skip = (page - 1) * limit;

      // Build match stage for mess filtering
      const matchStage = {};

      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          matchStage.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess history
        matchStage.mess_id = req.user.mess_id;
      }

      const [history, count] = await Promise.all([
        WeeklyMenu.aggregate([
          { $match: matchStage },
          { $group: { _id: { week_start_date: '$week_start_date', is_active: '$is_active', mess_id: '$mess_id' } } },
          { $sort: { '_id.week_start_date': -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ]),
        WeeklyMenu.aggregate([
          { $match: matchStage },
          { $group: { _id: { week_start_date: '$week_start_date', is_active: '$is_active', mess_id: '$mess_id' } } },
          { $count: 'total' }
        ])
      ]);

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            total: count.length > 0 ? count[0].total : 0,
            page: parseInt(page),
            pages: Math.ceil((count.length > 0 ? count[0].total : 0) / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching menu history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu history'
      });
    }
  }

  // Activate menu version
  async activateMenuVersion(req, res) {
    try {
      const { week_start_date, mess_id } = req.body;

      // Determine mess_id: super_admin can specify, mess_admin uses their own
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      // Build filter for deactivation - only affect target mess
      const deactivateFilter = { is_active: true };
      if (targetMessId) {
        deactivateFilter.mess_id = targetMessId;
      }

      // Build filter for activation - only activate target mess's version
      const activateFilter = { week_start_date };
      if (targetMessId) {
        activateFilter.mess_id = targetMessId;
      }

      // Verify the version exists before activating
      const versionExists = await WeeklyMenu.findOne(activateFilter);
      if (!versionExists) {
        return res.status(404).json({
          success: false,
          message: 'Menu version not found for this mess'
        });
      }

      // Mess boundary check for mess_admin
      if (req.user.role === 'mess_admin' &&
          versionExists.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only activate menu versions for your own mess'
        });
      }

      // Deactivate all menus for this mess
      await WeeklyMenu.updateMany(
        deactivateFilter,
        { is_active: false }
      );

      // Activate specified version for this mess
      await WeeklyMenu.updateMany(
        activateFilter,
        { is_active: true }
      );

      logger.info(`Menu version activated by ${req.user.role}: ${req.user.user_id} for mess ${targetMessId}`);

      res.json({
        success: true,
        message: 'Menu version activated successfully'
      });
    } catch (error) {
      logger.error('Error activating menu version:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate menu version'
      });
    }
  }

  // Get special menu for date
  async getSpecialMenu(req, res) {
    try {
      const { date } = req.query;
      const dayName = moment(date).format('dddd').toLowerCase();

      const menu = await WeeklyMenu.find({
        day: dayName,
        is_active: true,
        special_note: { $ne: null }
      });

      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      logger.error('Error fetching special menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch special menu'
      });
    }
  }
}

// Import and merge extensions
const menuExtensions = require('./menuControllerExtensions');
Object.assign(MenuController.prototype, menuExtensions);

module.exports = new MenuController();
