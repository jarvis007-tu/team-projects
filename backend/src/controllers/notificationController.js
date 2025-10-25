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
      const skip = (page - 1) * limit;

      const queryConditions = {};
      if (type) queryConditions.type = type;
      if (priority) queryConditions.priority = priority;

      const [notifications, count] = await Promise.all([
        Notification.find(queryConditions)
          .limit(parseInt(limit))
          .skip(skip)
          .populate('user_id', 'full_name email')
          .sort({ created_at: -1 }),
        Notification.countDocuments(queryConditions)
      ]);

      res.json({
        success: true,
        data: {
          notifications,
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
      logger.debug('User object:', req.user);
      const userId = req.user.user_id;
      const { page = 1, limit = 10, is_read } = req.query;
      const skip = (page - 1) * limit;

      const queryConditions = {
        $or: [
          { user_id: userId },
          { user_id: null } // Broadcast notifications
        ]
      };

      if (is_read !== undefined) {
        queryConditions.is_read = is_read === 'true';
      }

      const [notifications, count] = await Promise.all([
        Notification.find(queryConditions)
          .limit(parseInt(limit))
          .skip(skip)
          .sort({ createdAt: -1 }),
        Notification.countDocuments(queryConditions)
      ]);

      const unreadCount = await Notification.countDocuments({
        $or: [
          { user_id: userId },
          { user_id: null }
        ],
        is_read: false
      });

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          },
          unreadCount
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
      const createdBy = req.user.user_id;

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
        const user = await User.findById(user_id);
        if (user && user.device_token) {
          await sendPushNotification(user.device_token, {
            title,
            body: message,
            data: {
              notification_id: notification._id.toString(),
              type
            }
          });
        }
      } else {
        // Broadcast to all users with device tokens
        const users = await User.find({
          device_token: { $ne: null },
          status: 'active'
        });

        const deviceTokens = users.map(u => u.device_token);
        if (deviceTokens.length > 0) {
          await sendPushNotification(deviceTokens, {
            title,
            body: message,
            data: {
              notification_id: notification._id.toString(),
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
      const userId = req.user.user_id;

      const notification = await Notification.findOne({
        _id: id,
        $or: [
          { user_id: userId },
          { user_id: null }
        ]
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();

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
      const userId = req.user.user_id;

      await Notification.updateMany(
        {
          $or: [
            { user_id: userId },
            { user_id: null }
          ],
          is_read: false
        },
        {
          is_read: true,
          read_at: new Date()
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

      const notification = await Notification.findByIdAndDelete(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

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
      const createdBy = req.user.user_id;

      let recipients = [];

      if (recipient_criteria) {
        const queryConditions = {};

        if (recipient_criteria.role) {
          queryConditions.role = recipient_criteria.role;
        }

        if (recipient_criteria.has_active_subscription) {
          // Get users with active subscriptions
          const Subscription = require('../models/Subscription');
          const today = moment().format('YYYY-MM-DD');

          const activeSubscriptions = await Subscription.find({
            status: 'active',
            start_date: { $lte: today },
            end_date: { $gte: today }
          }).distinct('user_id');

          queryConditions._id = { $in: activeSubscriptions };
        }

        recipients = await User.find(queryConditions).select('_id device_token');
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
            user_id: recipient._id,
            priority,
            created_by: createdBy
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
          created_by: createdBy
        });
      }

      await Notification.insertMany(notifications);

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
        Notification.countDocuments(),
        Notification.countDocuments({ is_read: true }),
        Notification.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $project: { type: '$_id', count: 1, _id: 0 } }
        ]),
        Notification.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $project: { priority: '$_id', count: 1, _id: 0 } }
        ])
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
