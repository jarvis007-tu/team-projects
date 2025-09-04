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
        is_read: false,
        created_by: req.user.user_id
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
  },

  // Send targeted notification
  async sendTargetedNotification(req, res) {
    try {
      const { user_ids, title, message, type = 'announcement', priority = 'medium' } = req.body;
      const createdBy = req.user.user_id;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'User IDs array is required'
        });
      }

      const notifications = await Promise.all(
        user_ids.map(userId => 
          Notification.create({
            user_id: userId,
            title,
            message,
            type,
            priority,
            created_by: createdBy,
            status: 'sent'
          })
        )
      );

      res.json({
        success: true,
        message: `Targeted notifications sent to ${user_ids.length} users`,
        data: notifications
      });
    } catch (error) {
      logger.error('Error sending targeted notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send targeted notification'
      });
    }
  },

  // Schedule notification
  async scheduleNotification(req, res) {
    try {
      const { user_id, title, message, type = 'announcement', priority = 'medium', scheduled_time } = req.body;
      const createdBy = req.user.user_id;

      if (!scheduled_time) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time is required'
        });
      }

      const scheduledDate = new Date(scheduled_time);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future'
        });
      }

      const notification = await Notification.create({
        user_id,
        title,
        message,
        type,
        priority,
        created_by: createdBy,
        scheduled_time: scheduledDate,
        status: 'scheduled'
      });

      res.status(201).json({
        success: true,
        message: 'Notification scheduled successfully',
        data: notification
      });
    } catch (error) {
      logger.error('Error scheduling notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule notification'
      });
    }
  },

  // Cancel scheduled notification
  async cancelScheduledNotification(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findOne({
        where: {
          notification_id: id,
          status: 'scheduled'
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Scheduled notification not found'
        });
      }

      await notification.update({ status: 'failed' });

      res.json({
        success: true,
        message: 'Scheduled notification cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling scheduled notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel scheduled notification'
      });
    }
  },

  // Update notification status
  async updateNotificationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'sent', 'scheduled', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const notification = await Notification.findByPk(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.update({ status });

      res.json({
        success: true,
        message: 'Notification status updated successfully',
        data: notification
      });
    } catch (error) {
      logger.error('Error updating notification status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification status'
      });
    }
  },

  // Export notification history
  async exportNotificationHistory(req, res) {
    try {
      const { start_date, end_date, type } = req.query;
      
      const whereConditions = {};
      
      if (start_date && end_date) {
        whereConditions.created_at = {
          [Op.between]: [start_date, end_date]
        };
      }
      
      if (type) {
        whereConditions.type = type;
      }

      const notifications = await Notification.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email']
        }],
        order: [['created_at', 'DESC']]
      });

      // Convert to CSV format
      const csvHeader = 'ID,Title,Message,Type,Priority,User,Status,Created At,Read At\n';
      const csvData = notifications.map(n => 
        `${n.notification_id},"${n.title}","${n.message}",${n.type},${n.priority},"${n.user ? n.user.full_name : 'Broadcast'}",${n.status || 'sent'},${n.created_at},${n.read_at || ''}`
      ).join('\n');

      const csv = csvHeader + csvData;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=notification-history.csv');
      res.send(csv);
    } catch (error) {
      logger.error('Error exporting notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export notification history'
      });
    }
  }
};

module.exports = notificationExtensions;