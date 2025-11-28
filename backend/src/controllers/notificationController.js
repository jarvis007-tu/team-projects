const moment = require('moment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { sendPushNotification } = require('../services/firebaseService');
const { addMessFilter } = require('../utils/messHelpers');

class NotificationController {
  // Get all notifications (Admin)
  async getAllNotifications(req, res) {
    try {
      const { page = 1, limit = 10, type, priority, mess_id } = req.query;
      const skip = (page - 1) * limit;

      const queryConditions = {};

      // Add mess filtering
      addMessFilter(queryConditions, req.user, mess_id);

      if (type) queryConditions.type = type;
      if (priority) queryConditions.priority = priority;

      const [notifications, count] = await Promise.all([
        Notification.find(queryConditions)
          .limit(parseInt(limit))
          .skip(skip)
          .populate('user_id', 'full_name email')
          .populate('mess_id', 'name code')
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
      const { page = 1, limit = 10, is_read, type } = req.query;
      const skip = (page - 1) * limit;

      // Get user's signup date to filter out notifications from before their signup
      const user = await User.findById(userId).select('createdAt');
      const userSignupDate = user?.createdAt || new Date(0);

      const queryConditions = {
        $or: [
          { user_id: userId, mess_id: req.user.mess_id },
          { user_id: null, mess_id: req.user.mess_id }, // Mess-specific broadcast
          { user_id: null, mess_id: null } // Global broadcast
        ],
        // Only show notifications created after user signed up
        createdAt: { $gte: userSignupDate }
      };

      if (is_read !== undefined) {
        queryConditions.is_read = is_read === 'true';
      }

      // Filter by notification type if provided
      if (type) {
        queryConditions.type = type;
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
          { user_id: userId, mess_id: req.user.mess_id },
          { user_id: null, mess_id: req.user.mess_id },
          { user_id: null, mess_id: null }
        ],
        is_read: false,
        createdAt: { $gte: userSignupDate }
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
      const { title, message, type = 'announcement', user_id, priority = 'medium', mess_id } = req.body;
      const createdBy = req.user.user_id;

      // Determine mess_id: super_admin can specify, mess_admin uses their own
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      // If user_id specified, verify the user belongs to the admin's mess
      if (user_id) {
        const user = await User.findById(user_id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Recipient user not found'
          });
        }

        // Mess boundary check for mess_admin
        if (req.user.role === 'mess_admin' &&
            user.mess_id.toString() !== req.user.mess_id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only send notifications to users in your own mess'
          });
        }
      }

      // Create notification
      const notification = await Notification.create({
        title,
        message,
        type,
        user_id,
        mess_id: targetMessId,
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
        // Broadcast to users in the target mess only
        const userQuery = {
          device_token: { $ne: null },
          status: 'active'
        };

        if (targetMessId) {
          userQuery.mess_id = targetMessId;
        }

        const users = await User.find(userQuery);

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

      logger.info(`Notification created by ${req.user.role}: ${req.user.user_id} for mess ${targetMessId}`);

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

      // Find notification first for permission checks
      const notification = await Notification.findById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Mess boundary check - mess_admin can only delete notifications from their own mess
      if (req.user.role === 'mess_admin' &&
          notification.mess_id &&
          notification.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete notifications from your own mess'
        });
      }

      await Notification.findByIdAndDelete(id);

      logger.info(`Notification deleted by ${req.user.role}: ${req.user.user_id}`);

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
      const { title, message, type = 'announcement', priority = 'medium', recipient_criteria, mess_id } = req.body;
      const createdBy = req.user.user_id;

      // Determine mess_id: super_admin can specify, mess_admin uses their own
      const targetMessId = req.user.role === 'super_admin'
        ? (mess_id || req.user.mess_id)
        : req.user.mess_id;

      let recipients = [];

      if (recipient_criteria) {
        const queryConditions = {};

        // Add mess filtering - CRITICAL: Filter recipients by mess
        if (req.user.role === 'mess_admin') {
          queryConditions.mess_id = req.user.mess_id;
        } else if (targetMessId) {
          queryConditions.mess_id = targetMessId;
        }

        if (recipient_criteria.role) {
          queryConditions.role = recipient_criteria.role;
        }

        if (recipient_criteria.has_active_subscription) {
          // Get users with active subscriptions
          const Subscription = require('../models/Subscription');
          const today = moment().format('YYYY-MM-DD');

          const subscriptionQuery = {
            status: 'active',
            start_date: { $lte: today },
            end_date: { $gte: today }
          };

          // Add mess filtering to subscription query
          if (queryConditions.mess_id) {
            subscriptionQuery.mess_id = queryConditions.mess_id;
          }

          const activeSubscriptions = await Subscription.find(subscriptionQuery).distinct('user_id');

          queryConditions._id = { $in: activeSubscriptions };
        }

        recipients = await User.find(queryConditions).select('_id device_token mess_id');
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
            mess_id: recipient.mess_id || targetMessId,
            priority,
            created_by: createdBy
          });
        }
      } else {
        // Create broadcast notification for target mess
        notifications.push({
          title,
          message,
          type,
          user_id: null,
          mess_id: targetMessId,
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

      logger.info(`Bulk notifications sent by ${req.user.role}: ${req.user.user_id} to ${recipients.length || 'all'} users in mess ${targetMessId}`);

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
      const { mess_id } = req.query;

      // Build match stage for mess filtering
      const matchStage = {};

      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          matchStage.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess stats
        matchStage.mess_id = req.user.mess_id;
      }

      const [totalSent, totalRead, byType, byPriority] = await Promise.all([
        Notification.countDocuments(matchStage),
        Notification.countDocuments({ ...matchStage, is_read: true }),
        Notification.aggregate([
          { $match: matchStage },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $project: { type: '$_id', count: 1, _id: 0 } }
        ]),
        Notification.aggregate([
          { $match: matchStage },
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
