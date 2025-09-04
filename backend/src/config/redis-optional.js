const logger = require('../utils/logger');

class OptionalRedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.cache = new Map(); // Fallback in-memory cache
  }

  async connect() {
    try {
      // Only try to connect if Redis is configured
      if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost') {
        const { createClient } = require('redis');
        this.client = createClient({
          socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT || 6379
          },
          password: process.env.REDIS_PASSWORD || undefined
        });

        await this.client.connect();
        this.isConnected = true;
        logger.info('Redis connected successfully');
      } else {
        logger.warn('Redis not configured, using in-memory cache');
      }
    } catch (error) {
      logger.warn('Redis connection failed, using in-memory cache:', error.message);
      this.isConnected = false;
    }
  }

  async get(key) {
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.cache.get(key) || null;
      }
    } catch (error) {
      logger.debug(`Redis GET error for key ${key}, using cache:`, error.message);
      return this.cache.get(key) || null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      if (this.isConnected && this.client) {
        if (ttl) {
          await this.client.setEx(key, ttl, serialized);
        } else {
          await this.client.set(key, serialized);
        }
      } else {
        this.cache.set(key, value);
        if (ttl) {
          setTimeout(() => this.cache.delete(key), ttl * 1000);
        }
      }
      return true;
    } catch (error) {
      logger.debug(`Redis SET error for key ${key}, using cache:`, error.message);
      this.cache.set(key, value);
      if (ttl) {
        setTimeout(() => this.cache.delete(key), ttl * 1000);
      }
      return true;
    }
  }

  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      } else {
        this.cache.delete(key);
      }
      return true;
    } catch (error) {
      logger.debug(`Redis DEL error for key ${key}, using cache:`, error.message);
      this.cache.delete(key);
      return true;
    }
  }

  async exists(key) {
    try {
      if (this.isConnected && this.client) {
        const exists = await this.client.exists(key);
        return exists === 1;
      } else {
        return this.cache.has(key);
      }
    } catch (error) {
      logger.debug(`Redis EXISTS error for key ${key}, using cache:`, error.message);
      return this.cache.has(key);
    }
  }

  async expire(key, seconds) {
    try {
      if (this.isConnected && this.client) {
        await this.client.expire(key, seconds);
      } else {
        const value = this.cache.get(key);
        if (value) {
          this.cache.delete(key);
          this.cache.set(key, value);
          setTimeout(() => this.cache.delete(key), seconds * 1000);
        }
      }
      return true;
    } catch (error) {
      logger.debug(`Redis EXPIRE error for key ${key}:`, error.message);
      return true;
    }
  }

  async flush() {
    try {
      if (this.isConnected && this.client) {
        await this.client.flushDb();
      } else {
        this.cache.clear();
      }
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.debug('Cache flush error:', error.message);
      this.cache.clear();
      return true;
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
      logger.debug('Redis quit error:', error.message);
    }
  }

  async cache(key, fetchFunction, ttl = 3600) {
    try {
      const cached = await this.get(key);
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }

      logger.debug(`Cache miss for key: ${key}`);
      const data = await fetchFunction();
      
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      logger.debug(`Cache operation error for key ${key}:`, error.message);
      return await fetchFunction();
    }
  }

  async deletePattern(pattern) {
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        }
        return keys.length;
      } else {
        // Simple pattern matching for in-memory cache
        const regex = new RegExp(pattern.replace('*', '.*'));
        const keys = Array.from(this.cache.keys()).filter(key => regex.test(key));
        keys.forEach(key => this.cache.delete(key));
        return keys.length;
      }
    } catch (error) {
      logger.debug(`Delete pattern error for ${pattern}:`, error.message);
      return 0;
    }
  }
}

// Create singleton instance
const redisClient = new OptionalRedisClient();

module.exports = redisClient;
module.exports.redisClient = redisClient;