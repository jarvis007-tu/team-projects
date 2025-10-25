const { User, Subscription } = require('../models');
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
        $or: [{ email }, { phone }]
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
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // Store refresh token
      await jwtManager.storeRefreshToken(user._id.toString(), tokens.refreshToken);

      // Log registration
      logger.info(`New user registered: ${user._id} - ${user.email}`);

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

      // Build query for email or phone
      const query = {};
      if (email && phone) {
        query.$or = [{ email }, { phone }];
      } else if (email) {
        query.email = email;
      } else if (phone) {
        query.phone = phone;
      }

      // Find user - need password for validation
      const user = await User.findOne(query).select('+password');

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
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // Store refresh token
      await jwtManager.storeRefreshToken(user._id.toString(), tokens.refreshToken);

      // Get active subscription
      const today = moment().format('YYYY-MM-DD');
      const activeSubscription = await Subscription.findOne({
        user_id: user._id,
        status: 'active',
        start_date: { $lte: new Date(today) },
        end_date: { $gte: new Date(today) }
      });

      // Cache user data (if Redis is available)
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.set(`user:${user._id}`, JSON.stringify(user.toJSON()), { EX: 300 });
        }
      } catch (cacheError) {
        logger.debug('Redis cache failed during login:', cacheError.message);
      }

      // Log successful login
      logger.info(`User login successful: ${user._id} - ${user.email}`);

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
      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new AppError('User not found or inactive', 401);
      }

      // Generate new tokens
      const tokens = jwtManager.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // Store new refresh token
      await jwtManager.storeRefreshToken(user._id.toString(), tokens.refreshToken);

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

      // Clear user cache (if Redis is available)
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.del(`user:${user.user_id}`);
        }
      } catch (cacheError) {
        logger.debug('Redis cache clear failed during logout:', cacheError.message);
      }

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
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

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

      const user = await User.findOne({ email });

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

      // Store in Redis (if available)
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.set(
            `password_reset:${resetToken}`,
            JSON.stringify({ userId: user._id.toString(), email: user.email }),
            { EX: 3600 }
          );
        }
      } catch (redisError) {
        logger.error('Failed to store reset token:', redisError.message);
        throw new AppError('Unable to process password reset request', 500);
      }

      // Send email with reset link
      try {
        const emailService = require('../utils/emailService');
        await emailService.sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        logger.error('Failed to send reset email:', emailError.message);
      }

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

      // Get reset data from Redis (if available)
      let resetData = null;
      try {
        if (redisClient && redisClient.isReady) {
          const data = await redisClient.get(`password_reset:${resetToken}`);
          resetData = data ? JSON.parse(data) : null;
        }
      } catch (redisError) {
        logger.debug('Redis get failed for reset token:', redisError.message);
      }

      if (!resetData) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Get user
      const user = await User.findById(resetData.userId);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update password
      user.password = newPassword;
      user.login_attempts = 0;
      user.locked_until = null;
      await user.save();

      // Delete reset token (if Redis is available)
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.del(`password_reset:${resetToken}`);
        }
      } catch (redisError) {
        logger.debug('Redis delete failed for reset token:', redisError.message);
      }

      // Remove all tokens for this user
      await jwtManager.removeRefreshToken(user._id.toString());

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

      // Get user
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Get active subscriptions
      const today = moment().format('YYYY-MM-DD');
      const subscriptions = await Subscription.find({
        user_id: userId,
        status: 'active',
        start_date: { $lte: new Date(today) },
        end_date: { $gte: new Date(today) }
      });

      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          subscriptions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { full_name, phone, preferences } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update allowed fields
      if (full_name) user.full_name = full_name;
      if (phone) user.phone = phone;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      // Clear cache (if Redis is available)
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.del(`user:${userId}`);
        }
      } catch (cacheError) {
        logger.debug('Redis cache clear failed during profile update:', cacheError.message);
      }

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

      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Get active subscriptions
      const today = moment().format('YYYY-MM-DD');
      const subscriptions = await Subscription.find({
        user_id: userId,
        status: 'active',
        start_date: { $lte: new Date(today) },
        end_date: { $gte: new Date(today) }
      });

      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          subscriptions
        }
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

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

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
