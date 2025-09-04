const { createClient } = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: process.env.REDIS_DB || 0
      });

      // Error handling
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis Client Reconnecting');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key, seconds) {
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async flush() {
    try {
      await this.client.flushDb();
      logger.info('Redis database flushed');
      return true;
    } catch (error) {
      logger.error('Redis FLUSH error:', error);
      return false;
    }
  }

  async quit() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Redis quit error:', error);
    }
  }

  // Cache wrapper function with automatic TTL
  async cache(key, fetchFunction, ttl = 3600) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }

      // If not in cache, fetch and store
      logger.debug(`Cache miss for key: ${key}`);
      const data = await fetchFunction();
      
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      logger.error(`Cache operation error for key ${key}:`, error);
      // Fallback to fetch function if cache fails
      return await fetchFunction();
    }
  }

  // Pattern-based key deletion (useful for cache invalidation)
  async deletePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      logger.error(`Redis delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
module.exports.redisClient = redisClient;