const { Op } = require('sequelize');
const moment = require('moment');
const WeeklyMenu = require('../models/WeeklyMenu');
const logger = require('../utils/logger');

class MenuController {
  // Get weekly menu
  async getWeeklyMenu(req, res) {
    try {
      const { week_start_date, is_active = true } = req.query;

      const whereConditions = {};
      if (is_active !== undefined) whereConditions.is_active = is_active === 'true';
      if (week_start_date) whereConditions.week_start_date = week_start_date;

      const menu = await WeeklyMenu.findAll({
        where: whereConditions,
        order: [
          ['day', 'ASC'],
          ['meal_type', 'ASC']
        ]
      });

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

      const menu = await WeeklyMenu.findAll({
        where: {
          day: today,
          is_active: true
        },
        order: [['meal_type', 'ASC']]
      });

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
        where: {
          day,
          meal_type,
          is_active: true
        }
      });

      if (menuItem) {
        // Update existing
        await menuItem.update({
          items: JSON.stringify(items),
          special_note,
          week_start_date,
          created_by: req.user.id
        });
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
      await WeeklyMenu.update(
        { is_active: false },
        { where: { is_active: true } }
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
            created_by: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      await WeeklyMenu.bulkCreate(menuItems);

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

      const menuItem = await WeeklyMenu.findByPk(id);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      await menuItem.destroy();

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
      const offset = (page - 1) * limit;

      const { count, rows } = await WeeklyMenu.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        group: ['week_start_date', 'is_active'],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          history: rows,
          pagination: {
            total: count.length,
            page: parseInt(page),
            pages: Math.ceil(count.length / limit)
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
      await WeeklyMenu.update(
        { is_active: false },
        { where: { is_active: true } }
      );

      // Activate specified version
      await WeeklyMenu.update(
        { is_active: true },
        { where: { week_start_date } }
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

      const menu = await WeeklyMenu.findAll({
        where: {
          day: dayName,
          is_active: true,
          special_note: { [Op.ne]: null }
        }
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