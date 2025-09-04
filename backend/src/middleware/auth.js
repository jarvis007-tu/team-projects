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
      // If not in cache, fetch from database
      user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Try to cache user for 5 minutes if Redis is available
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.set(cacheKey, JSON.stringify(user.toJSON()), 300);
        }
      } catch (cacheError) {
        logger.debug('Failed to cache user, continuing without cache:', cacheError.message);
      }
      
      // Convert to plain object if it's a Sequelize instance
      if (user.toJSON) {
        user = user.toJSON();
      }
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

    // Get user
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
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
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
      
      if (user && user.status === 'active') {
        req.user = user;
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

    // If no device registered, update it
    if (!req.user.device_id) {
      await User.update(
        { device_id: deviceId },
        { where: { user_id: req.user.user_id } }
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

module.exports = {
  authenticate,
  authorize,
  refreshAuth,
  optionalAuth,
  deviceCheck
};