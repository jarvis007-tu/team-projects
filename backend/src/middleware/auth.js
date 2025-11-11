const jwtManager = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const { redisClient } = require('../config/redis-optional');

const authenticate = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await jwtManager.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwtManager.verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid token'
      });
    }

    // Try to get user from cache first if Redis is available
    const cacheKey = `user:${decoded.userId}`;
    let user = null;

    try {
      if (redisClient && redisClient.isReady) {
        const cachedUser = await redisClient.get(cacheKey);
        if (cachedUser) {
          user = typeof cachedUser === 'string' ? JSON.parse(cachedUser) : cachedUser;
        }
      }
    } catch (cacheError) {
      logger.debug('Cache retrieval failed, falling back to database:', cacheError.message);
    }

    if (!user) {
      // If not in cache, fetch from database using MongoDB
      const userDoc = await User.findById(decoded.userId).select('-password');

      if (!userDoc) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Try to cache user for 5 minutes if Redis is available
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.set(cacheKey, JSON.stringify(userDoc.toJSON()), { EX: 300 });
        }
      } catch (cacheError) {
        logger.debug('Failed to cache user, continuing without cache:', cacheError.message);
      }

      // Convert to plain object
      user = userDoc.toJSON();
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}`
      });
    }

    // Check if user is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    // Log authentication
    logger.debug(`User ${user.user_id} authenticated successfully`);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Flatten roles array in case arrays are passed as arguments
    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.user_id} (role: ${req.user.role}) to ${req.originalUrl}. Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

const refreshAuth = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwtManager.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid refresh token'
      });
    }

    // Check if refresh token is stored for this user
    const storedToken = await jwtManager.getStoredRefreshToken(decoded.userId);
    if (storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Get user using MongoDB
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user.toJSON();
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    logger.error('Refresh authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwtManager.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.status === 'active') {
        req.user = user.toJSON();
      }
    } catch (error) {
      // Silent fail for optional auth
      logger.debug('Optional auth failed:', error.message);
    }

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next();
  }
};

const deviceCheck = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const deviceId = req.headers['x-device-id'];

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID required'
      });
    }

    // Check if device ID matches user's registered device
    if (req.user.device_id && req.user.device_id !== deviceId) {
      logger.warn(`Device mismatch for user ${req.user.user_id}`);
      return res.status(403).json({
        success: false,
        message: 'Device not authorized. Please login again from this device.'
      });
    }

    // If no device registered, update it using MongoDB
    if (!req.user.device_id) {
      await User.findByIdAndUpdate(
        req.user.user_id,
        { device_id: deviceId }
      );
      req.user.device_id = deviceId;
    }

    next();
  } catch (error) {
    logger.error('Device check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Device verification failed'
    });
  }
};

/**
 * Middleware to enforce mess-based access control
 * - super_admin: Can access all messes (no filtering)
 * - mess_admin: Can only access their assigned mess (filtered by mess_id)
 * - subscriber: Can only access their own mess (filtered by mess_id)
 */
const enforceMessAccess = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // super_admin has global access - no filtering needed
    if (req.user.role === 'super_admin') {
      req.isGlobalAccess = true;
      req.messFilter = {}; // No filter for super_admin
      logger.debug(`Global access granted to super_admin: ${req.user.user_id}`);
      return next();
    }

    // mess_admin and subscriber can only access their assigned mess
    if (req.user.role === 'mess_admin' || req.user.role === 'subscriber') {
      if (!req.user.mess_id) {
        return res.status(403).json({
          success: false,
          message: 'No mess assigned to your account'
        });
      }

      req.isGlobalAccess = false;
      req.messFilter = { mess_id: req.user.mess_id }; // Filter by assigned mess
      req.allowedMessId = req.user.mess_id; // Store for easy access

      logger.debug(`Mess-specific access granted to ${req.user.role}: ${req.user.user_id}, mess: ${req.user.mess_id}`);
      return next();
    }

    // Unknown role
    return res.status(403).json({
      success: false,
      message: 'Invalid role'
    });
  } catch (error) {
    logger.error('Mess access enforcement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Access control check failed'
    });
  }
};

/**
 * Middleware to check if user is super_admin only
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'super_admin') {
    logger.warn(`Super admin access denied for user ${req.user.user_id} (role: ${req.user.role})`);
    return res.status(403).json({
      success: false,
      message: 'This action requires super admin privileges'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  refreshAuth,
  optionalAuth,
  deviceCheck,
  enforceMessAccess,
  requireSuperAdmin
};
