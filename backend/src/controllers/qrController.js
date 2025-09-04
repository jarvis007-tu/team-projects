const QRCode = require('qrcode');
const crypto = require('crypto');
const moment = require('moment');
const logger = require('../utils/logger');
const { generateQRData, verifyQRCode } = require('../services/qrService');
const { redisClient } = require('../config/redis-optional');

class QRController {
  // Generate QR code for meal
  async generateQRCode(req, res) {
    try {
      const { meal_type, date, validity_minutes = 30 } = req.body;
      const mealDate = date || moment().format('YYYY-MM-DD');

      // Generate QR data
      const qrData = await generateQRData({
        meal_type,
        date: mealDate,
        validity_minutes
      });

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(qrData.code, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });

      // Store in Redis with expiry (if available)
      const key = `qr:${meal_type}:${mealDate}`;
      try {
        if (redisClient && redisClient.isReady) {
          await redisClient.setex(
            key,
            validity_minutes * 60,
            JSON.stringify(qrData)
          );
        }
      } catch (redisError) {
        logger.warn('Redis storage failed for QR code, continuing without cache:', redisError.message);
      }

      res.json({
        success: true,
        data: {
          qr_code: qrData.code,
          qr_image: qrCodeImage,
          meal_type,
          date: mealDate,
          expires_at: qrData.expires_at,
          validity_minutes
        }
      });
    } catch (error) {
      logger.error('Error generating QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code'
      });
    }
  }

  // Get daily QR codes for all meals
  async getDailyQRCode(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || moment().format('YYYY-MM-DD');
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const qrCodes = {};

      for (const mealType of mealTypes) {
        // Check if QR exists in Redis (if available)
        const key = `qr:${mealType}:${targetDate}`;
        let existingQR = null;
        
        try {
          if (redisClient && redisClient.isReady) {
            existingQR = await redisClient.get(key);
          }
        } catch (redisError) {
          logger.debug('Redis get failed, continuing without cache:', redisError.message);
        }

        if (existingQR) {
          const qrData = JSON.parse(existingQR);
          
          // Generate QR image
          const qrCodeImage = await QRCode.toDataURL(qrData.code, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 300
          });

          qrCodes[mealType] = {
            code: qrData.code,
            image: qrCodeImage,
            expires_at: qrData.expires_at
          };
        } else {
          // Generate new QR
          const qrData = await generateQRData({
            meal_type: mealType,
            date: targetDate,
            validity_minutes: getMealValidityMinutes(mealType)
          });

          const qrCodeImage = await QRCode.toDataURL(qrData.code, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 300
          });

          // Store in Redis (if available)
          try {
            if (redisClient && redisClient.isReady) {
              await redisClient.setex(
                key,
                getMealValidityMinutes(mealType) * 60,
                JSON.stringify(qrData)
              );
            }
          } catch (redisError) {
            logger.debug('Redis setex failed, continuing without cache:', redisError.message);
          }

          qrCodes[mealType] = {
            code: qrData.code,
            image: qrCodeImage,
            expires_at: qrData.expires_at
          };
        }
      }

      res.json({
        success: true,
        data: {
          date: targetDate,
          qr_codes: qrCodes
        }
      });
    } catch (error) {
      logger.error('Error getting daily QR codes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get daily QR codes'
      });
    }
  }

  // Validate QR code
  async validateQRCode(req, res) {
    try {
      const { qr_code } = req.body;

      const validation = await verifyQRCode(qr_code);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message || 'Invalid QR code',
          error_code: validation.error_code
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          meal_type: validation.meal_type,
          date: validation.date,
          message: 'QR code is valid'
        }
      });
    } catch (error) {
      logger.error('Error validating QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate QR code'
      });
    }
  }

  // Get user-specific QR code
  async getUserQRCode(req, res) {
    try {
      const userId = req.user.id;
      const { meal_type } = req.query;
      const today = moment().format('YYYY-MM-DD');

      // Generate user-specific QR data
      const qrData = {
        user_id: userId,
        meal_type: meal_type || 'lunch',
        date: today,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      // Sign the data
      const signature = crypto
        .createHmac('sha256', process.env.QR_SECRET || 'default-secret')
        .update(JSON.stringify(qrData))
        .digest('hex');

      const qrPayload = {
        ...qrData,
        signature
      };

      const qrCodeString = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

      // Generate QR image
      const qrCodeImage = await QRCode.toDataURL(qrCodeString, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#1a365d',
          light: '#FFFFFF'
        },
        width: 350
      });

      res.json({
        success: true,
        data: {
          qr_code: qrCodeString,
          qr_image: qrCodeImage,
          user_id: userId,
          meal_type: meal_type || 'lunch',
          date: today,
          valid_until: moment().add(30, 'minutes').toISOString()
        }
      });
    } catch (error) {
      logger.error('Error generating user QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate user QR code'
      });
    }
  }

  // Generate bulk QR codes for printing
  async generateBulkQRCodes(req, res) {
    try {
      const { start_date, end_date } = req.body;
      const dates = [];
      const currentDate = moment(start_date);
      const endMoment = moment(end_date);

      // Generate dates
      while (currentDate.isSameOrBefore(endMoment)) {
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate.add(1, 'day');
      }

      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const allQRCodes = [];

      for (const date of dates) {
        for (const mealType of mealTypes) {
          const qrData = await generateQRData({
            meal_type: mealType,
            date,
            validity_minutes: getMealValidityMinutes(mealType)
          });

          const qrCodeImage = await QRCode.toDataURL(qrData.code, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 250
          });

          allQRCodes.push({
            date,
            meal_type: mealType,
            code: qrData.code,
            image: qrCodeImage,
            expires_at: qrData.expires_at
          });
        }
      }

      res.json({
        success: true,
        data: {
          total: allQRCodes.length,
          qr_codes: allQRCodes
        }
      });
    } catch (error) {
      logger.error('Error generating bulk QR codes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate bulk QR codes'
      });
    }
  }
}

// Helper function to get meal-specific validity minutes
function getMealValidityMinutes(mealType) {
  const validityMap = {
    breakfast: 180, // 3 hours (6 AM - 9 AM)
    lunch: 240,     // 4 hours (11 AM - 3 PM)
    dinner: 240     // 4 hours (6 PM - 10 PM)
  };
  return validityMap[mealType] || 120;
}

module.exports = new QRController();