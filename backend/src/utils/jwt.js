const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis-optional');
const logger = require('./logger');

class JWTManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_EXPIRE || '7d';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '30d';
  }

  generateTokens(payload) {
    try {
      const accessToken = jwt.sign(
        payload,
        this.accessTokenSecret,
        { 
          expiresIn: this.accessTokenExpiry,
          issuer: 'hostel-mess-system',
          audience: 'hostel-mess-app'
        }
      );

      const refreshToken = jwt.sign(
        payload,
        this.refreshTokenSecret,
        { 
          expiresIn: this.refreshTokenExpiry,
          issuer: 'hostel-mess-system',
          audience: 'hostel-mess-app'
        }
      );

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Token generation error:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'hostel-mess-system',
        audience: 'hostel-mess-app'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'hostel-mess-system',
        audience: 'hostel-mess-app'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  async blacklistToken(token, type = 'access') {
    try {
      const decoded = type === 'refresh' 
        ? this.verifyRefreshToken(token)
        : this.verifyAccessToken(token);
      
      const key = `blacklist:${token}`;
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (ttl > 0) {
        await redisClient.set(key, true, ttl);
        logger.info(`Token blacklisted: ${token.substring(0, 20)}...`);
      }
      
      return true;
    } catch (error) {
      logger.error('Token blacklist error:', error);
      return false;
    }
  }

  async isBlacklisted(token) {
    try {
      const key = `blacklist:${token}`;
      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Token blacklist check error:', error);
      return false;
    }
  }

  async storeRefreshToken(userId, refreshToken) {
    try {
      const key = `refresh_token:${userId}`;
      const decoded = this.verifyRefreshToken(refreshToken);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      
      await redisClient.set(key, refreshToken, ttl);
      return true;
    } catch (error) {
      logger.error('Refresh token store error:', error);
      return false;
    }
  }

  async getStoredRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Refresh token retrieve error:', error);
      return null;
    }
  }

  async removeRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Refresh token remove error:', error);
      return false;
    }
  }

  decodeToken(token) {
    return jwt.decode(token);
  }

  getTokenExpiry(token) {
    const decoded = this.decodeToken(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  }
}

module.exports = new JWTManager();