const { User, Subscription } = require('../models');
const { Op } = require('sequelize');
const jwtManager = require('../utils/jwt');
const { redisClient } = require('../config/redis-optional');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');
const moment = require('moment-timezone');

class AuthController {
  async register(req, res, next) {
    try {
      const { full_name, email, phone, password, role = 'subscriber' } = req.body;

      // Validate password strength
      if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400);
      }

      // Check if user exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { phone }]
        }
      });

      if (existingUser) {
        throw new AppError('User with this email or phone already exists', 409);
      }

      // Create user
      const user = await User.create({
        full_name,
        email,
        phone,
        password,
        role,
        device_id: req.headers['x-device-id'] || null
      });

      // Remove password from response
      const userResponse = user.toJSON();

      // Generate tokens
      const tokens = jwtManager.generateTokens({
        userId: user.user_id,
        email: user.email,
        role: user.role
      });

      // Store refresh token
      await jwtManager.storeRefreshToken(user.user_id, tokens.refreshToken);

      // Log registration
      logger.info(`New user registered: ${user.user_id} - ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: userResponse,
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, phone, password } = req.body;
      const deviceId = req.headers['x-device-id'];

      if (!password || (!email && !phone)) {
        throw new AppError('Email/Phone and password are required', 400);
      }

      // Find user
      const user = await User.findOne({
        where: {
          [Op.or]: [
            email ? { email } : {},
            phone ? { phone } : {}
          ].filter(obj => Object.keys(obj).length > 0)
        }
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if account is locked
      if (user.isLocked()) {
        const lockTime = moment(user.locked_until).fromNow();
        throw new AppError(`Account is locked. Try again ${lockTime}`, 423);
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      
      if (!isValidPassword) {
        await user.incrementLoginAttempts();
        throw new AppError('Invalid credentials', 401);
      }

      // Check user status
      if (user.status !== 'active') {
        throw new AppError(`Account is ${user.status}`, 403);
      }

      // Reset login attempts
      await user.resetLoginAttempts();

      // Update device ID if provided
      if (deviceId && user.device_id !== deviceId) {
        user.device_id = deviceId;
        await user.save();
      }

      // Generate tokens
      const tokens = jwtManager.generateTokens({
        userId: user.user_id,
        email: user.email,
        role: user.role
      });

      // Store refresh token
      await jwtManager.storeRefreshToken(user.user_id, tokens.refreshToken);

      // Get active subscription
      const activeSubscription = await Subscription.findOne({
        where: {
          user_id: user.user_id,
          status: 'active',
          start_date: {
            [Op.lte]: moment().format('YYYY-MM-DD')
          },
          end_date: {
            [Op.gte]: moment().format('YYYY-MM-DD')
          }
        }
      });

      // Cache user data
      await redisClient.set(`user:${user.user_id}`, user.toJSON(), 300);

      // Log successful login
      logger.info(`User login successful: ${user.user_id} - ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          subscription: activeSubscription,
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = jwtManager.verifyRefreshToken(refreshToken);
      } catch (error) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Check if refresh token is stored
      const storedToken = await jwtManager.getStoredRefreshToken(decoded.userId);
      if (storedToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Get user
      const user = await User.findByPk(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new AppError('User not found or inactive', 401);
      }

      // Generate new tokens
      const tokens = jwtManager.generateTokens({
        userId: user.user_id,
        email: user.email,
        role: user.role
      });

      // Store new refresh token
      await jwtManager.storeRefreshToken(user.user_id, tokens.refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { user, token } = req;

      // Blacklist access token
      await jwtManager.blacklistToken(token);

      // Remove refresh token
      await jwtManager.removeRefreshToken(user.user_id);

      // Clear user cache
      await redisClient.del(`user:${user.user_id}`);

      logger.info(`User logout: ${user.user_id} - ${user.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.user_id;

      if (!currentPassword || !newPassword) {
        throw new AppError('Current and new password required', 400);
      }

      if (newPassword.length < 8) {
        throw new AppError('New password must be at least 8 characters', 400);
      }

      // Get user with password
      const user = await User.findByPk(userId);

      // Validate current password
      const isValid = await user.validatePassword(currentPassword);
      if (!isValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Blacklist current token
      await jwtManager.blacklistToken(req.token);

      // Remove all refresh tokens
      await jwtManager.removeRefreshToken(userId);

      logger.info(`Password changed for user: ${userId}`);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email is required', 400);
      }

      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        // Don't reveal if user exists
        res.json({
          success: true,
          message: 'If the email exists, a reset link has been sent'
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      // Store in Redis
      await redisClient.set(
        `password_reset:${resetToken}`,
        { userId: user.user_id, email: user.email },
        3600
      );

      // TODO: Send email with reset link
      logger.info(`Password reset requested for: ${user.email}`);

      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
        // In development, return token for testing
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        throw new AppError('Reset token and new password required', 400);
      }

      // Get reset data from Redis
      const resetData = await redisClient.get(`password_reset:${resetToken}`);
      
      if (!resetData) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Get user
      const user = await User.findByPk(resetData.userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update password
      user.password = newPassword;
      user.login_attempts = 0;
      user.locked_until = null;
      await user.save();

      // Delete reset token
      await redisClient.del(`password_reset:${resetToken}`);

      // Remove all tokens for this user
      await jwtManager.removeRefreshToken(user.user_id);

      logger.info(`Password reset successful for: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.user_id;

      // Get user with subscription
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Subscription,
          as: 'subscriptions',
          where: {
            status: 'active',
            start_date: {
              [Op.lte]: moment().format('YYYY-MM-DD')
            },
            end_date: {
              [Op.gte]: moment().format('YYYY-MM-DD')
            }
          },
          required: false
        }]
      });

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { full_name, phone, preferences } = req.body;

      const user = await User.findByPk(userId);

      // Update allowed fields
      if (full_name) user.full_name = full_name;
      if (phone) user.phone = phone;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      // Clear cache
      await redisClient.del(`user:${userId}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.user_id;
      
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Subscription,
          as: 'subscriptions',
          where: {
            status: 'active',
            start_date: {
              [Op.lte]: moment().format('YYYY-MM-DD')
            },
            end_date: {
              [Op.gte]: moment().format('YYYY-MM-DD')
            }
          },
          required: false
        }]
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDeviceId(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { device_id } = req.body;

      if (!device_id) {
        throw new AppError('Device ID is required', 400);
      }

      const user = await User.findByPk(userId);
      user.device_id = device_id;
      await user.save();

      logger.info(`Device ID updated for user: ${userId}`);

      res.json({
        success: true,
        message: 'Device ID updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();