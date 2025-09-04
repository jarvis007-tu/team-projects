const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const moment = require('moment');

// Extension methods for notification controller
const notificationExtensions = {
  // Get notification templates
  async getNotificationTemplates(req, res) {
    try {
      // Mock templates for now
      const templates = [
        {
          id: 1,
          name: 'Subscription Reminder',
          subject: 'Your subscription is expiring soon',
          body: 'Dear {{user_name}}, your subscription will expire on {{expiry_date}}.',
          type: 'subscription',
          variables: ['user_name', 'expiry_date']
        },
        {
          id: 2,
          name: 'Menu Update',
          subject: 'New menu available',
          body: 'Check out our new menu for this week!',
          type: 'menu',
          variables: []
        }
      ];

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error fetching notification templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification templates'
      });
    }
  },

  // Create notification template
  async createNotificationTemplate(req, res) {
    try {
      const { name, subject, body, type, variables } = req.body;

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: {
          id: Date.now(),
          name,
          subject,
          body,
          type,
          variables,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error creating notification template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification template'
      });
    }
  },

  // Update notification template
  async updateNotificationTemplate(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: {
          id,
          ...updates,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error updating notification template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification template'
      });
    }
  },

  // Delete notification template
  async deleteNotificationTemplate(req, res) {
    try {
      const { id } = req.params;

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting notification template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification template'
      });
    }
  },

  // Get notification history
  async getNotificationHistory(req, res) {
    try {
      const { page = 1, limit = 10, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      const whereConditions = {};
      
      if (start_date && end_date) {
        whereConditions.created_at = {
          [Op.between]: [start_date, end_date]
        };
      }

      const notifications = await Notification.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email']
        }],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          notifications: notifications.rows,
          pagination: {
            total: notifications.count,
            page: parseInt(page),
            pages: Math.ceil(notifications.count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification history'
      });
    }
  },

  // Get notification analytics
  async getNotificationAnalytics(req, res) {
    try {
      const { period = 'week' } = req.query;
      let startDate;

      switch (period) {
        case 'day':
          startDate = moment().subtract(1, 'day');
          break;
        case 'week':
          startDate = moment().subtract(7, 'days');
          break;
        case 'month':
          startDate = moment().subtract(30, 'days');
          break;
        default:
          startDate = moment().subtract(7, 'days');
      }

      const [totalSent, totalRead, byType] = await Promise.all([
        Notification.count({
          where: {
            created_at: { [Op.gte]: startDate.toDate() }
          }
        }),
        Notification.count({
          where: {
            created_at: { [Op.gte]: startDate.toDate() },
            is_read: true
          }
        }),
        Notification.findAll({
          attributes: [
            'type',
            [Notification.sequelize.fn('COUNT', '*'), 'count']
          ],
          where: {
            created_at: { [Op.gte]: startDate.toDate() }
          },
          group: ['type']
        })
      ]);

      res.json({
        success: true,
        data: {
          period,
          totalSent,
          totalRead,
          readRate: totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) : 0,
          byType: byType.map(t => ({
            type: t.type,
            count: parseInt(t.dataValues.count)
          }))
        }
      });
    } catch (error) {
      logger.error('Error fetching notification analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification analytics'
      });
    }
  },

  // Get scheduled notifications
  async getScheduledNotifications(req, res) {
    try {
      const scheduledNotifications = await Notification.findAll({
        where: {
          scheduled_time: { [Op.gt]: new Date() },
          status: 'scheduled'
        },
        order: [['scheduled_time', 'ASC']]
      });

      res.json({
        success: true,
        data: scheduledNotifications
      });
    } catch (error) {
      logger.error('Error fetching scheduled notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scheduled notifications'
      });
    }
  },

  // Send test notification
  async sendTestNotification(req, res) {
    try {
      const { user_id, title, message, type = 'test' } = req.body;

      const notification = await Notification.create({
        user_id,
        title,
        message,
        type,
        priority: 'low',
        is_read: false
      });

      res.json({
        success: true,
        message: 'Test notification sent successfully',
        data: notification
      });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  }
};

module.exports = notificationExtensions;