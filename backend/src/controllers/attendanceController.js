const mongoose = require('mongoose');
const moment = require('moment');
const geolib = require('geolib');
const crypto = require('crypto');
const User = require('../models/User');
const Mess = require('../models/Mess');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const MealConfirmation = require('../models/MealConfirmation');
const logger = require('../utils/logger');
const { verifyQRCode } = require('../services/qrService');

// Helper function to verify mess QR code (outside class to avoid binding issues)
function verifyMessQRCode(qrCodeString) {
  try {
    const qrData = JSON.parse(qrCodeString);

    // Check if it's a mess QR code
    if (qrData.type !== 'MESS_QR') {
      return { valid: false, message: 'Invalid QR code type' };
    }

    // Verify signature
    const { signature, ...dataToVerify } = qrData;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
      .update(JSON.stringify(dataToVerify))
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, message: 'QR code signature verification failed' };
    }

    return { valid: true, data: qrData };
  } catch (error) {
    logger.error('Error verifying mess QR code:', error);
    return { valid: false, message: 'Invalid QR code format' };
  }
}

// Helper function to determine current meal type (outside class to avoid binding issues)
function getCurrentMealType() {
  const now = moment();
  const hour = now.hour();
  const minute = now.minute();
  const currentTime = hour * 60 + minute; // Convert to minutes

  // Breakfast: 7:00 AM - 10:00 AM
  if (currentTime >= 7 * 60 && currentTime < 10 * 60) {
    return 'breakfast';
  }
  // Lunch: 12:00 PM - 3:00 PM
  else if (currentTime >= 12 * 60 && currentTime < 15 * 60) {
    return 'lunch';
  }
  // Dinner: 7:00 PM - 10:00 PM
  else if (currentTime >= 19 * 60 && currentTime < 22 * 60) {
    return 'dinner';
  }

  return null;
}

class AttendanceController {

  // Scan QR code for attendance
  async scanQR(req, res) {
    try {
      const { qr_code, geo_location, device_id } = req.body;

      // Use user_id which is set by the User model's toJSON method
      // (it converts _id to user_id for consistency)
      const userId = req.user.user_id || req.user._id || req.user.id;

      logger.info(`QR Scan attempt by user ID: ${userId}`);

      // Verify mess QR code
      const qrVerification = verifyMessQRCode(qr_code);

      if (!qrVerification.valid) {
        return res.status(400).json({
          success: false,
          message: qrVerification.message || 'Invalid QR code'
        });
      }

      const qrData = qrVerification.data;

      // Get user's mess information
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify user belongs to the mess in the QR code
      if (user.mess_id.toString() !== qrData.mess_id) {
        return res.status(403).json({
          success: false,
          message: `This QR code belongs to ${qrData.name}. You are not authorized to scan it.`
        });
      }

      // Get mess details
      const mess = await Mess.findById(user.mess_id);
      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Determine current meal type based on time
      const mealType = getCurrentMealType();
      if (!mealType) {
        return res.status(403).json({
          success: false,
          message: 'No meal service available at this time'
        });
      }

      // Check active subscription
      const today = moment().format('YYYY-MM-DD');
      const subscription = await Subscription.findOne({
        user_id: userId,
        mess_id: user.mess_id,
        status: 'active',
        start_date: { $lte: today },
        end_date: { $gte: today }
      });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      // Verify geolocation using coordinates from QR code
      if (geo_location && qrData.latitude && qrData.longitude) {
        const distance = geolib.getDistance(
          { latitude: geo_location.latitude, longitude: geo_location.longitude },
          { latitude: qrData.latitude, longitude: qrData.longitude }
        );

        const maxRadius = qrData.radius_meters || 200;

        if (distance > maxRadius) {
          return res.status(403).json({
            success: false,
            message: `You are outside the ${qrData.name} premises. Distance: ${distance}m, Max allowed: ${maxRadius}m`
          });
        }

        logger.info(`Geolocation verified for user ${userId} at ${qrData.name}: ${distance}m from mess`);
      } else if (!geo_location) {
        return res.status(400).json({
          success: false,
          message: 'Geolocation is required for attendance'
        });
      }

      // Check for duplicate scan
      const existingAttendance = await Attendance.findOne({
        user_id: userId,
        mess_id: user.mess_id,
        scan_date: today,
        meal_type: mealType
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked for this meal'
        });
      }

      // Check meal confirmation if required
      const requireConfirmation = mess.settings?.allow_meal_confirmation !== false;
      if (requireConfirmation) {
        const confirmation = await MealConfirmation.findOne({
          user_id: userId,
          mess_id: user.mess_id,
          meal_date: today,
          meal_type: mealType,
          status: 'confirmed'
        });

        if (!confirmation) {
          return res.status(403).json({
            success: false,
            message: 'Please confirm your meal attendance first'
          });
        }

        // Update confirmation status
        confirmation.status = 'attended';
        await confirmation.save();
      }

      // Create attendance record
      const attendance = await Attendance.create({
        user_id: userId,
        mess_id: user.mess_id,
        subscription_id: subscription._id,
        scan_date: today,
        meal_type: mealType,
        scan_time: new Date(),
        qr_code,
        geo_location,
        device_id,
        is_valid: true
      });

      res.json({
        success: true,
        message: `Attendance marked successfully for ${mealType}`,
        data: {
          attendance: attendance,
          meal_type: mealType,
          mess_name: qrData.name
        }
      });
    } catch (error) {
      logger.error('Error scanning QR:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to mark attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Get attendance history
  async getAttendanceHistory(req, res) {
    try {
      const userId = req.user.role === 'admin' ? req.query.user_id : (req.user.user_id || req.user._id || req.user.id);
      const { start_date, end_date, meal_type, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const filter = {};
      if (userId) filter.user_id = userId;
      if (meal_type) filter.meal_type = meal_type;

      if (start_date && end_date) {
        filter.scan_date = {
          $gte: start_date,
          $lte: end_date
        };
      }

      const count = await Attendance.countDocuments(filter);
      const rows = await Attendance.find(filter)
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .populate('user_id', 'user_id full_name email')
        .sort({ scan_time: -1 });

      // Transform attendance records to include check_in_time for frontend compatibility
      const history = rows.map(record => ({
        ...record.toObject(),
        check_in_time: record.scan_time
      }));

      res.json({
        success: true,
        data: {
          history: history,
          attendance: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching attendance history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance history'
      });
    }
  }

  // Get today's attendance (Admin)
  async getTodayAttendance(req, res) {
    try {
      const today = moment().format('YYYY-MM-DD');
      const { meal_type } = req.query;

      const filter = { scan_date: today };
      if (meal_type) filter.meal_type = meal_type;

      // Mess boundary check for mess_admin
      if (req.user.role === 'mess_admin') {
        filter.mess_id = req.user.mess_id;
      }

      const attendance = await Attendance.find(filter)
        .populate('user_id', 'user_id full_name email phone')
        .sort({ scan_time: -1 });

      // Get meal-wise count
      const matchFilter = { scan_date: today };
      if (req.user.role === 'mess_admin') {
        matchFilter.mess_id = req.user.mess_id;
      }

      const mealCounts = await Attendance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$meal_type',
            count: { $sum: 1 }
          }
        }
      ]);

      const formattedMealCounts = mealCounts.map(item => ({
        meal_type: item._id,
        count: item.count
      }));

      res.json({
        success: true,
        data: {
          date: today,
          attendance,
          summary: formattedMealCounts,
          total: attendance.length
        }
      });
    } catch (error) {
      logger.error('Error fetching today attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s attendance'
      });
    }
  }

  // Get attendance statistics
  async getAttendanceStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const filter = {};
      if (start_date && end_date) {
        filter.scan_date = {
          $gte: start_date,
          $lte: end_date
        };
      } else {
        // Default to last 30 days
        filter.scan_date = {
          $gte: moment().subtract(30, 'days').format('YYYY-MM-DD')
        };
      }

      // Daily attendance trend
      const dailyTrend = await Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$scan_date',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const formattedDailyTrend = dailyTrend.map(item => ({
        scan_date: item._id,
        count: item.count
      }));

      // Meal-wise distribution
      const mealDistribution = await Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$meal_type',
            count: { $sum: 1 }
          }
        }
      ]);

      const formattedMealDistribution = mealDistribution.map(item => ({
        meal_type: item._id,
        count: item.count
      }));

      // Peak hours
      const peakHours = await Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $hour: '$scan_time' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const formattedPeakHours = peakHours.map(item => ({
        hour: item._id,
        count: item.count
      }));

      res.json({
        success: true,
        data: {
          dailyTrend: formattedDailyTrend,
          mealDistribution: formattedMealDistribution,
          peakHours: formattedPeakHours
        }
      });
    } catch (error) {
      logger.error('Error fetching attendance stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance statistics'
      });
    }
  }

  // Mark manual attendance (Admin only)
  async markManualAttendance(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { user_id, meal_type, scan_date, reason } = req.body;

      // Check if user exists
      const user = await User.findById(user_id).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check for duplicate
      const existingAttendance = await Attendance.findOne({
        user_id,
        scan_date: scan_date || moment().format('YYYY-MM-DD'),
        meal_type
      }).session(session);

      if (existingAttendance) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked'
        });
      }

      // Get active subscription
      const targetDate = scan_date || moment().format('YYYY-MM-DD');
      const subscription = await Subscription.findOne({
        user_id,
        status: 'active',
        start_date: { $lte: targetDate },
        end_date: { $gte: targetDate }
      }).session(session);

      const attendance = await Attendance.create([{
        user_id,
        subscription_id: subscription?.subscription_id,
        scan_date: targetDate,
        meal_type,
        scan_time: new Date(),
        qr_code: 'MANUAL_ENTRY',
        validation_errors: `Manual entry by admin: ${reason || 'No reason provided'}`,
        is_valid: true
      }], { session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Manual attendance marked successfully',
        data: attendance[0]
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error marking manual attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark manual attendance'
      });
    }
  }

  // Delete attendance record (Admin only)
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;

      const attendance = await Attendance.findById(id);

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      await attendance.deleteOne();

      res.json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete attendance record'
      });
    }
  }

  // Export attendance report
  async exportAttendanceReport(req, res) {
    try {
      const { start_date, end_date, format = 'csv' } = req.query;

      const filter = {};
      if (start_date && end_date) {
        filter.scan_date = {
          $gte: start_date,
          $lte: end_date
        };
      }

      const attendance = await Attendance.find(filter)
        .populate('user_id', 'full_name email phone')
        .sort({ scan_date: -1, scan_time: -1 });

      if (format === 'csv') {
        const csv = [
          'Date,Time,User Name,Email,Phone,Meal Type,Status',
          ...attendance.map(a =>
            `${a.scan_date},${moment(a.scan_time).format('HH:mm:ss')},${a.user_id.full_name},${a.user_id.email},${a.user_id.phone},${a.meal_type},${a.is_valid ? 'Valid' : 'Invalid'}`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_${moment().format('YYYY-MM-DD')}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: attendance
        });
      }
    } catch (error) {
      logger.error('Error exporting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export attendance report'
      });
    }
  }

  // Get all attendance records with filters
  async getAttendanceRecords(req, res) {
    try {
      const { page = 1, limit = 10, date, meal_type, user_id } = req.query;
      const offset = (page - 1) * limit;

      const filter = {};

      if (date) {
        const targetDate = moment(date);
        filter.scan_time = {
          $gte: targetDate.startOf('day').toDate(),
          $lte: targetDate.endOf('day').toDate()
        };
      }

      if (meal_type) filter.meal_type = meal_type;
      if (user_id) filter.user_id = user_id;

      const count = await Attendance.countDocuments(filter);
      const rows = await Attendance.find(filter)
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .populate('user_id', 'user_id full_name email')
        .sort({ scan_time: -1 });

      res.json({
        success: true,
        data: {
          records: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching attendance records:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance records'
      });
    }
  }

  // Get daily attendance
  async getDailyAttendance(req, res) {
    try {
      const { date } = req.params;
      const targetDate = moment(date);

      const attendance = await Attendance.find({
        scan_time: {
          $gte: targetDate.startOf('day').toDate(),
          $lte: targetDate.endOf('day').toDate()
        }
      })
        .populate('user_id', 'user_id full_name email phone')
        .sort({ scan_time: -1 });

      const summary = {
        breakfast: attendance.filter(a => a.meal_type === 'breakfast'),
        lunch: attendance.filter(a => a.meal_type === 'lunch'),
        dinner: attendance.filter(a => a.meal_type === 'dinner')
      };

      res.json({
        success: true,
        data: {
          date: targetDate.format('YYYY-MM-DD'),
          attendance,
          summary: {
            breakfast: summary.breakfast.length,
            lunch: summary.lunch.length,
            dinner: summary.dinner.length,
            total: attendance.length
          },
          details: summary
        }
      });
    } catch (error) {
      logger.error('Error fetching daily attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily attendance'
      });
    }
  }

  // Update attendance record
  async updateAttendance(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const attendance = await Attendance.findById(id);

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      Object.assign(attendance, updates);
      await attendance.save();

      res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: attendance
      });
    } catch (error) {
      logger.error('Error updating attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update attendance'
      });
    }
  }

  // Bulk mark attendance
  async bulkMarkAttendance(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { attendanceList } = req.body;

      if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Invalid attendance list'
        });
      }

      const results = [];

      for (const record of attendanceList) {
        const { user_id, meal_type, date } = record;

        // Check for existing attendance
        const existing = await Attendance.findOne({
          user_id,
          meal_type,
          scan_time: {
            $gte: moment(date).startOf('day').toDate(),
            $lte: moment(date).endOf('day').toDate()
          }
        }).session(session);

        if (existing) {
          results.push({
            user_id,
            meal_type,
            status: 'skipped',
            message: 'Already marked'
          });
          continue;
        }

        const attendance = await Attendance.create([{
          user_id,
          subscription_id: null,
          meal_type,
          scan_time: moment(date).toDate(),
          marked_by: req.user.user_id || req.user._id || req.user.id,
          verification_method: 'manual'
        }], { session });

        results.push({
          user_id,
          meal_type,
          status: 'success',
          attendance_id: attendance[0].attendance_id
        });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Bulk attendance marked successfully',
        data: results
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error in bulk attendance marking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark bulk attendance'
      });
    }
  }

  // Get attendance analytics
  async getAttendanceAnalytics(req, res) {
    try {
      const { start_date, end_date, group_by = 'day' } = req.query;

      const startDate = start_date ? moment(start_date) : moment().subtract(30, 'days');
      const endDate = end_date ? moment(end_date) : moment();

      const attendance = await Attendance.aggregate([
        {
          $match: {
            scan_time: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate()
            }
          }
        },
        {
          $group: {
            _id: {
              meal_type: '$meal_type',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$scan_time' } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // Calculate averages
      const totalDays = endDate.diff(startDate, 'days') + 1;
      const mealCounts = { breakfast: 0, lunch: 0, dinner: 0 };

      const formattedAttendance = attendance.map(record => {
        const mealType = record._id.meal_type;
        const count = record.count;
        mealCounts[mealType] = (mealCounts[mealType] || 0) + count;

        return {
          meal_type: mealType,
          count: count,
          date: record._id.date
        };
      });

      const analytics = {
        period: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD'),
          days: totalDays
        },
        totals: mealCounts,
        averages: {
          breakfast: (mealCounts.breakfast / totalDays).toFixed(2),
          lunch: (mealCounts.lunch / totalDays).toFixed(2),
          dinner: (mealCounts.dinner / totalDays).toFixed(2)
        },
        daily: formattedAttendance
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching attendance analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance analytics'
      });
    }
  }

  // Get user attendance summary
  async getUserAttendanceSummary(req, res) {
    try {
      const { userId } = req.params;
      const { start_date, end_date } = req.query;

      const startDate = start_date ? moment(start_date) : moment().subtract(30, 'days');
      const endDate = end_date ? moment(end_date) : moment();

      const attendance = await Attendance.find({
        user_id: userId,
        scan_time: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate()
        }
      }).sort({ scan_time: -1 });

      const summary = {
        breakfast: attendance.filter(a => a.meal_type === 'breakfast').length,
        lunch: attendance.filter(a => a.meal_type === 'lunch').length,
        dinner: attendance.filter(a => a.meal_type === 'dinner').length,
        total: attendance.length
      };

      const user = await User.findById(userId, 'user_id full_name email');

      res.json({
        success: true,
        data: {
          user,
          period: {
            start: startDate.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
          },
          summary,
          attendance
        }
      });
    } catch (error) {
      logger.error('Error fetching user attendance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user attendance summary'
      });
    }
  }

  // Get meal-wise attendance
  async getMealWiseAttendance(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const startDate = start_date ? moment(start_date) : moment().startOf('month');
      const endDate = end_date ? moment(end_date) : moment().endOf('month');

      const attendance = await Attendance.aggregate([
        {
          $match: {
            scan_time: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate()
            }
          }
        },
        {
          $group: {
            _id: {
              meal_type: '$meal_type',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$scan_time' } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      const mealwise = {};

      attendance.forEach(record => {
        const date = record._id.date;
        if (!mealwise[date]) {
          mealwise[date] = {
            breakfast: 0,
            lunch: 0,
            dinner: 0
          };
        }
        mealwise[date][record._id.meal_type] = record.count;
      });

      res.json({
        success: true,
        data: {
          period: {
            start: startDate.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
          },
          mealwise
        }
      });
    } catch (error) {
      logger.error('Error fetching meal-wise attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meal-wise attendance'
      });
    }
  }

  // Get attendance trends
  async getAttendanceTrends(req, res) {
    try {
      const { period = 'week' } = req.query;
      let startDate, groupInterval;

      switch (period) {
        case 'week':
          startDate = moment().subtract(7, 'days');
          groupInterval = 'day';
          break;
        case 'month':
          startDate = moment().subtract(30, 'days');
          groupInterval = 'week';
          break;
        case 'quarter':
          startDate = moment().subtract(90, 'days');
          groupInterval = 'month';
          break;
        default:
          startDate = moment().subtract(7, 'days');
          groupInterval = 'day';
      }

      const attendance = await Attendance.aggregate([
        {
          $match: {
            scan_time: {
              $gte: startDate.toDate()
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$scan_time' } },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      const trends = attendance.map(record => ({
        date: record._id,
        count: record.count
      }));

      res.json({
        success: true,
        data: {
          period,
          startDate: startDate.format('YYYY-MM-DD'),
          trends
        }
      });
    } catch (error) {
      logger.error('Error fetching attendance trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance trends'
      });
    }
  }

  // Get missing attendance alerts
  async getMissingAttendanceAlerts(req, res) {
    try {
      const today = moment().startOf('day');

      // Get active users
      const activeUsers = await User.find({ status: 'active' })
        .populate({
          path: 'subscriptions',
          match: {
            status: 'active',
            end_date: { $gte: today.toDate() }
          }
        });

      // Filter users who have active subscriptions
      const usersWithActiveSubscriptions = activeUsers.filter(
        user => user.subscriptions && user.subscriptions.length > 0
      );

      const alerts = [];

      for (const user of usersWithActiveSubscriptions) {
        const attendance = await Attendance.find({
          user_id: user.user_id,
          scan_time: {
            $gte: today.toDate(),
            $lte: moment().endOf('day').toDate()
          }
        });

        const meals = ['breakfast', 'lunch', 'dinner'];
        const attended = attendance.map(a => a.meal_type);
        const missed = meals.filter(meal => !attended.includes(meal));

        if (missed.length > 0) {
          alerts.push({
            user: {
              id: user.user_id,
              name: user.full_name,
              email: user.email
            },
            missedMeals: missed,
            date: today.format('YYYY-MM-DD')
          });
        }
      }

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error fetching missing attendance alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch missing attendance alerts'
      });
    }
  }
}

module.exports = new AttendanceController();
