const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { sendPushNotification } = require('../services/firebaseService');

class NotificationController {
  // Get all notifications (Admin)
  async getAllNotifications(req, res) {
    try {
      const { page = 1, limit = 10, type, priority } = req.query;
      const offset = (page - 1) * limit;

      const whereConditions = {};
      if (type) whereConditions.type = type;
      if (priority) whereConditions.priority = priority;

      const { count, rows } = await Notification.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          notifications: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, is_read } = req.query;
      const offset = (page - 1) * limit;

      const whereConditions = {
        [Op.or]: [
          { user_id: userId },
          { user_id: null } // Broadcast notifications
        ]
      };

      if (is_read !== undefined) {
        whereConditions.is_read = is_read === 'true';
      }

      const { count, rows } = await Notification.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          notifications: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          },
          unreadCount: await Notification.count({
            where: {
              [Op.or]: [
                { user_id: userId },
                { user_id: null }
              ],
              is_read: false
            }
          })
        }
      });
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  // Create notification
  async createNotification(req, res) {
    try {
      const { title, message, type = 'announcement', user_id, priority = 'medium' } = req.body;
      const createdBy = req.user.id;

      // Create notification
      const notification = await Notification.create({
        title,
        message,
        type,
        user_id,
        priority,
        created_by: createdBy
      });

      // Send push notification if recipient has device token
      if (user_id) {
        const user = await User.findByPk(user_id);
        if (user && user.device_token) {
          await sendPushNotification(user.device_token, {
            title,
            body: message,
            data: {
              notification_id: notification.notification_id,
              type
            }
          });
        }
      } else {
        // Broadcast to all users with device tokens
        const users = await User.findAll({
          where: {
            device_token: { [Op.ne]: null },
            status: 'active'
          }
        });

        const deviceTokens = users.map(u => u.device_token);
        if (deviceTokens.length > 0) {
          await sendPushNotification(deviceTokens, {
            title,
            body: message,
            data: {
              notification_id: notification.notification_id,
              type
            }
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification'
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({
        where: {
          notification_id: id,
          [Op.or]: [
            { user_id: userId },
            { user_id: null }
          ]
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.update({
        is_read: true,
        read_at: new Date()
      });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await Notification.update(
        {
          is_read: true,
          read_at: new Date()
        },
        {
          where: {
            [Op.or]: [
              { user_id: userId },
              { user_id: null }
            ],
            is_read: false
          }
        }
      );

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findByPk(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.destroy();

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(req, res) {
    try {
      const { title, message, type = 'announcement', priority = 'medium', recipient_criteria } = req.body;
      const createdBy = req.user.id;

      let recipients = [];

      if (recipient_criteria) {
        const whereConditions = {};
        
        if (recipient_criteria.role) {
          whereConditions.role = recipient_criteria.role;
        }
        
        if (recipient_criteria.has_active_subscription) {
          // Get users with active subscriptions
          const activeSubscriptionUsers = await sequelize.query(
            `SELECT DISTINCT user_id FROM subscriptions 
             WHERE status = 'active' 
             AND start_date <= CURDATE() 
             AND end_date >= CURDATE()`,
            { type: Sequelize.QueryTypes.SELECT }
          );
          
          whereConditions.user_id = {
            [Op.in]: activeSubscriptionUsers.map(u => u.user_id)
          };
        }

        recipients = await User.findAll({
          where: whereConditions,
          attributes: ['user_id', 'device_token']
        });
      }

      // Create notifications
      const notifications = [];
      
      if (recipients.length > 0) {
        // Create individual notifications
        for (const recipient of recipients) {
          notifications.push({
            title,
            message,
            type,
            user_id: recipient.user_id,
            priority,
            created_by: createdBy,
            createdAt: new Date()
          });
        }
      } else {
        // Create broadcast notification
        notifications.push({
          title,
          message,
          type,
          user_id: null,
          priority,
          created_by: createdBy,
          createdAt: new Date()
        });
      }

      await Notification.bulkCreate(notifications);

      // Send push notifications
      const deviceTokens = recipients
        .filter(r => r.device_token)
        .map(r => r.device_token);

      if (deviceTokens.length > 0) {
        await sendPushNotification(deviceTokens, {
          title,
          body: message,
          data: { type }
        });
      }

      res.json({
        success: true,
        message: `Bulk notifications sent to ${recipients.length || 'all'} users`
      });
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notifications'
      });
    }
  }

  // Get notification statistics
  async getNotificationStats(req, res) {
    try {
      const [totalSent, totalRead, byType, byPriority] = await Promise.all([
        Notification.count(),
        Notification.count({ where: { is_read: true } }),
        Notification.findAll({
          attributes: [
            'type',
            [Sequelize.fn('COUNT', Sequelize.col('notification_id')), 'count']
          ],
          group: ['type']
        }),
        Notification.findAll({
          attributes: [
            'priority',
            [Sequelize.fn('COUNT', Sequelize.col('notification_id')), 'count']
          ],
          group: ['priority']
        })
      ]);

      res.json({
        success: true,
        data: {
          totalSent,
          totalRead,
          readRate: totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) : 0,
          byType,
          byPriority
        }
      });
    } catch (error) {
      logger.error('Error fetching notification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification statistics'
      });
    }
  }
}

// Import and merge extensions
const notificationExtensions = require('./notificationControllerExtensions');
Object.assign(NotificationController.prototype, notificationExtensions);

module.exports = new NotificationController();