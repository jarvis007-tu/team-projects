const User = require('../models/User');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

// Extension methods for user controller
const userControllerExtensions = {
  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;

      const user = await User.findById(userId).select('-password -deletedAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get active subscription if exists
      const subscription = await Subscription.findOne({
        user_id: userId,
        status: 'active'
      });

      res.json({
        success: true,
        data: {
          user,
          subscription
        }
      });
    } catch (error) {
      logger.error('Error fetching profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  },

  // Get user settings
  async getSettings(req, res) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;

      const user = await User.findById(userId).select('user_id full_name email phone preferences email_verified phone_verified status createdAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          profile: {
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            email_verified: user.email_verified,
            phone_verified: user.phone_verified
          },
          preferences: user.preferences || {
            notifications: true,
            email_notifications: true,
            sms_notifications: false,
            meal_reminders: true
          },
          account: {
            status: user.status,
            created_at: user.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settings'
      });
    }
  },

  // Update user settings
  async updateSettings(req, res) {
    try {
      const userId = req.user.userId || req.user.id || req.user.user_id;
      const { preferences, notifications } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update preferences if provided
      if (preferences) {
        user.preferences = {
          ...user.preferences,
          ...preferences
        };
        await user.save();
      }

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: {
          preferences: user.preferences
        }
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  },

  // Get admin settings
  async getAdminSettings(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const adminId = req.user.userId || req.user.id || req.user.user_id;

      const admin = await User.findById(adminId).select('user_id full_name email phone preferences role status');

      // Get system settings (mock data for now)
      const systemSettings = {
        meal_timings: {
          breakfast: { start: '07:00', end: '09:30' },
          lunch: { start: '12:00', end: '14:30' },
          dinner: { start: '19:00', end: '21:30' }
        },
        subscription_settings: {
          auto_renewal_reminder_days: 7,
          late_fee_percentage: 5,
          grace_period_days: 3
        },
        notification_settings: {
          send_meal_reminders: true,
          reminder_time: '30', // minutes before meal
          send_payment_reminders: true,
          send_expiry_notifications: true
        },
        qr_settings: {
          qr_code_expiry: 300, // seconds
          allow_multiple_scans: false,
          require_location: false
        }
      };

      res.json({
        success: true,
        data: {
          admin: {
            full_name: admin.full_name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role
          },
          preferences: admin.preferences,
          system: systemSettings
        }
      });
    } catch (error) {
      logger.error('Error fetching admin settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin settings'
      });
    }
  },

  // Update admin settings
  async updateAdminSettings(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const { preferences, system_settings } = req.body;
      const adminId = req.user.userId || req.user.id || req.user.user_id;

      const admin = await User.findById(adminId);

      if (preferences) {
        admin.preferences = {
          ...admin.preferences,
          ...preferences
        };
        await admin.save();
      }

      // In a real application, you would save system settings to a separate table or config
      // For now, we just return success

      res.json({
        success: true,
        message: 'Admin settings updated successfully',
        data: {
          preferences: admin.preferences
        }
      });
    } catch (error) {
      logger.error('Error updating admin settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update admin settings'
      });
    }
  }
};

module.exports = userControllerExtensions;
