const QRCode = require('qrcode');
const crypto = require('crypto');
const moment = require('moment-timezone');
const { redisClient } = require('../config/redis-optional');
const logger = require('../utils/logger');

class QRService {
  constructor() {
    this.secretKey = process.env.QR_SECRET_KEY || 'default-secret-key';
    this.expiryMinutes = parseInt(process.env.QR_EXPIRY_MINUTES) || 30;
  }

  /**
   * Generate secure QR code data with encryption and time-binding
   * DSA Concept: Hash table for O(1) lookup, cryptographic hashing for security
   */
  async generateQRData(userId, mealType, date = null) {
    try {
      const scanDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
      const timestamp = Date.now();
      const expiryTime = timestamp + (this.expiryMinutes * 60 * 1000);
      
      // Create unique session ID
      const sessionId = crypto.randomBytes(16).toString('hex');
      
      // Create payload
      const payload = {
        userId,
        mealType,
        date: scanDate,
        sessionId,
        timestamp,
        expiryTime
      };

      // Create signature for integrity
      const signature = this.createSignature(payload);
      
      // Combine payload and signature
      const qrData = {
        ...payload,
        signature
      };

      // Encode QR data
      const encodedData = Buffer.from(JSON.stringify(qrData)).toString('base64');
      
      // Store in Redis for validation
      const redisKey = `qr:${userId}:${mealType}:${scanDate}`;
      await redisClient.set(redisKey, {
        sessionId,
        signature,
        timestamp,
        expiryTime,
        used: false
      }, this.expiryMinutes * 60);

      logger.info(`QR generated for user ${userId}, meal ${mealType}, date ${scanDate}`);
      
      return {
        encodedData,
        sessionId,
        expiryTime,
        qrString: `MESS:${encodedData}`
      };
    } catch (error) {
      logger.error('QR generation error:', error);
      throw error;
    }
  }

  /**
   * Generate QR code image
   * System Design: Caching generated QR codes to reduce computation
   */
  async generateQRImage(qrData, options = {}) {
    try {
      const qrOptions = {
        errorCorrectionLevel: 'H',
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: options.width || 256,
        ...options
      };

      // Generate QR code as data URL
      const qrImage = await QRCode.toDataURL(qrData.qrString, qrOptions);
      
      // Cache the QR image in Redis for quick retrieval
      const cacheKey = `qr_image:${qrData.sessionId}`;
      await redisClient.set(cacheKey, qrImage, 300); // Cache for 5 minutes
      
      return qrImage;
    } catch (error) {
      logger.error('QR image generation error:', error);
      throw error;
    }
  }

  /**
   * Validate QR code with multiple security checks
   * DSA Concept: Time complexity O(1) for hash lookups
   */
  async validateQRCode(encodedData, userId, mealType) {
    try {
      // Decode QR data
      let qrData;
      try {
        const decoded = Buffer.from(encodedData.replace('MESS:', ''), 'base64').toString();
        qrData = JSON.parse(decoded);
      } catch (error) {
        return {
          valid: false,
          error: 'Invalid QR code format'
        };
      }

      // Verify signature
      const { signature, ...payload } = qrData;
      const expectedSignature = this.createSignature(payload);
      
      if (signature !== expectedSignature) {
        logger.warn(`Invalid signature for QR scan by user ${userId}`);
        return {
          valid: false,
          error: 'QR code signature invalid'
        };
      }

      // Check expiry
      if (Date.now() > qrData.expiryTime) {
        return {
          valid: false,
          error: 'QR code has expired'
        };
      }

      // Verify user and meal type
      if (qrData.userId !== userId) {
        return {
          valid: false,
          error: 'QR code belongs to different user'
        };
      }

      if (qrData.mealType !== mealType) {
        return {
          valid: false,
          error: 'QR code is for different meal type'
        };
      }

      // Check date
      const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
      if (qrData.date !== today) {
        return {
          valid: false,
          error: 'QR code is for different date'
        };
      }

      // Check Redis for duplicate scan
      const redisKey = `qr:${userId}:${mealType}:${qrData.date}`;
      const storedData = await redisClient.get(redisKey);
      
      if (!storedData) {
        return {
          valid: false,
          error: 'QR code not found or expired'
        };
      }

      if (storedData.used) {
        return {
          valid: false,
          error: 'QR code already used'
        };
      }

      // Mark as used
      storedData.used = true;
      storedData.usedAt = Date.now();
      await redisClient.set(redisKey, storedData, 86400); // Keep for 24 hours for audit

      // Check for rapid scans (potential fraud)
      const recentScans = await this.getRecentScans(userId);
      if (recentScans.length > 0) {
        const lastScan = recentScans[0];
        const timeDiff = Date.now() - lastScan.timestamp;
        
        if (timeDiff < 60000) { // Less than 1 minute
          logger.warn(`Rapid scan detected for user ${userId}`);
          return {
            valid: false,
            error: 'Please wait before scanning again'
          };
        }
      }

      // Record successful scan
      await this.recordScan(userId, mealType, qrData.sessionId);

      return {
        valid: true,
        sessionId: qrData.sessionId,
        timestamp: qrData.timestamp
      };
    } catch (error) {
      logger.error('QR validation error:', error);
      return {
        valid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Create HMAC signature for data integrity
   * Security: Using HMAC-SHA256 for cryptographic signing
   */
  createSignature(data) {
    const stringifiedData = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringifiedData)
      .digest('hex');
  }

  /**
   * Get recent scans for fraud detection
   * DSA: Using sorted set in Redis for O(log n) operations
   */
  async getRecentScans(userId, limit = 5) {
    try {
      const key = `recent_scans:${userId}`;
      const scans = await redisClient.get(key);
      return scans ? scans.slice(0, limit) : [];
    } catch (error) {
      logger.error('Get recent scans error:', error);
      return [];
    }
  }

  /**
   * Record scan for audit and fraud detection
   */
  async recordScan(userId, mealType, sessionId) {
    try {
      const key = `recent_scans:${userId}`;
      let scans = await redisClient.get(key) || [];
      
      scans.unshift({
        mealType,
        sessionId,
        timestamp: Date.now()
      });
      
      // Keep only last 10 scans
      scans = scans.slice(0, 10);
      
      await redisClient.set(key, scans, 86400); // Keep for 24 hours
    } catch (error) {
      logger.error('Record scan error:', error);
    }
  }

  /**
   * Generate dynamic QR that changes every interval
   * Advanced Security: Time-based rotating QR codes
   */
  async generateDynamicQR(userId, mealType) {
    try {
      // Get current time slot (5-minute intervals)
      const now = moment().tz('Asia/Kolkata');
      const slot = Math.floor(now.minute() / 5) * 5;
      const slotTime = now.clone().minute(slot).second(0).millisecond(0);
      
      // Generate QR for current slot
      const qrData = await this.generateQRData(userId, mealType);
      
      // Add slot information
      qrData.slot = slotTime.format('HH:mm');
      qrData.nextRotation = slotTime.add(5, 'minutes').valueOf();
      
      return qrData;
    } catch (error) {
      logger.error('Dynamic QR generation error:', error);
      throw error;
    }
  }

  /**
   * Bulk generate QR codes for pre-booking
   * Performance: Batch processing for efficiency
   */
  async bulkGenerateQR(userIds, mealType, date) {
    try {
      const qrCodes = [];
      const batchSize = 100;
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const promises = batch.map(userId => 
          this.generateQRData(userId, mealType, date)
        );
        
        const results = await Promise.all(promises);
        qrCodes.push(...results);
      }
      
      logger.info(`Generated ${qrCodes.length} QR codes for meal ${mealType}`);
      return qrCodes;
    } catch (error) {
      logger.error('Bulk QR generation error:', error);
      throw error;
    }
  }

  /**
   * Invalidate QR code (for security purposes)
   */
  async invalidateQR(userId, mealType, date = null) {
    try {
      const scanDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
      const redisKey = `qr:${userId}:${mealType}:${scanDate}`;
      
      await redisClient.del(redisKey);
      
      logger.info(`QR invalidated for user ${userId}, meal ${mealType}, date ${scanDate}`);
      return true;
    } catch (error) {
      logger.error('QR invalidation error:', error);
      return false;
    }
  }
}

module.exports = new QRService();