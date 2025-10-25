const moment = require('moment');
const WeeklyMenu = require('../models/WeeklyMenu');
const logger = require('../utils/logger');

class MenuController {
  // Get weekly menu
  async getWeeklyMenu(req, res) {
    try {
      const { week_start_date, is_active = true } = req.query;

      const queryConditions = {};
      if (is_active !== undefined) queryConditions.is_active = is_active === 'true';
      if (week_start_date) queryConditions.week_start_date = week_start_date;

      const menu = await WeeklyMenu.find(queryConditions)
        .sort({ day: 1, meal_type: 1 });

      // Group by day
      const groupedMenu = menu.reduce((acc, item) => {
        if (!acc[item.day]) {
          acc[item.day] = {};
        }
        acc[item.day][item.meal_type] = {
          items: JSON.parse(item.items),
          special_note: item.special_note
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

      const menu = await WeeklyMenu.find({
        day: today,
        is_active: true
      }).sort({ meal_type: 1 });

      const todayMenu = menu.reduce((acc, item) => {
        acc[item.meal_type] = {
          items: JSON.parse(item.items),
          special_note: item.special_note
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
        message: 'Failed to fetch today\'s menu'
      });
    }
  }

  // Create or update menu item
  async upsertMenuItem(req, res) {
    try {
      const { day, meal_type, items, special_note, week_start_date } = req.body;

      // Check if menu item exists
      let menuItem = await WeeklyMenu.findOne({
        day,
        meal_type,
        is_active: true
      });

      if (menuItem) {
        // Update existing
        menuItem.items = JSON.stringify(items);
        menuItem.special_note = special_note;
        menuItem.week_start_date = week_start_date;
        menuItem.created_by = req.user.id;
        await menuItem.save();
      } else {
        // Create new
        menuItem = await WeeklyMenu.create({
          day,
          meal_type,
          items: JSON.stringify(items),
          special_note,
          week_start_date,
          is_active: true,
          created_by: req.user.id
        });
      }

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
      const { menu, week_start_date } = req.body;

      // Deactivate old menu
      await WeeklyMenu.updateMany(
        { is_active: true },
        { is_active: false }
      );

      // Create new menu items
      const menuItems = [];
      const days = Object.keys(menu);

      for (const day of days) {
        const meals = Object.keys(menu[day]);
        for (const meal_type of meals) {
          menuItems.push({
            day,
            meal_type,
            items: JSON.stringify(menu[day][meal_type].items),
            special_note: menu[day][meal_type].special_note,
            week_start_date,
            is_active: true,
            created_by: req.user.id
          });
        }
      }

      await WeeklyMenu.insertMany(menuItems);

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

      const menuItem = await WeeklyMenu.findByIdAndDelete(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

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
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [history, count] = await Promise.all([
        WeeklyMenu.aggregate([
          { $group: { _id: { week_start_date: '$week_start_date', is_active: '$is_active' } } },
          { $sort: { '_id.week_start_date': -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ]),
        WeeklyMenu.aggregate([
          { $group: { _id: { week_start_date: '$week_start_date', is_active: '$is_active' } } },
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
      const { week_start_date } = req.body;

      // Deactivate all menus
      await WeeklyMenu.updateMany(
        { is_active: true },
        { is_active: false }
      );

      // Activate specified version
      await WeeklyMenu.updateMany(
        { week_start_date },
        { is_active: true }
      );

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
