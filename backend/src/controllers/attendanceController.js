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

// Import shared helper
const { getCurrentMealType } = require('../utils/messHelpers');

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

      // Add mess filtering based on user role
      if (req.messContext?.mess_id) {
        filter.mess_id = req.messContext.mess_id;
      }

      if (date) {
        // Filter by scan_date - use date range for the entire day
        const targetDate = moment(date);
        filter.scan_date = {
          $gte: targetDate.clone().startOf('day').toDate(),
          $lte: targetDate.clone().endOf('day').toDate()
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
        scan_date: {
          $gte: targetDate.clone().startOf('day').toDate(),
          $lte: targetDate.clone().endOf('day').toDate()
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
          date: moment(date).format('YYYY-MM-DD'),
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
      const { start_date, end_date, date, group_by = 'day' } = req.query;

      // If date parameter is provided, use it for today's stats
      const targetDate = date ? moment(date) : moment();
      const startDate = start_date ? moment(start_date) : targetDate.clone().startOf('day');
      const endDate = end_date ? moment(end_date) : targetDate.clone().endOf('day');

      // Build match filter with mess context
      const matchFilter = {
        scan_time: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate()
        }
      };

      // Add mess filtering
      if (req.messContext?.mess_id) {
        matchFilter.mess_id = req.messContext.mess_id;
      }

      const attendance = await Attendance.aggregate([
        {
          $match: matchFilter
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

      // Calculate totals for today
      const mealCounts = { breakfast: 0, lunch: 0, dinner: 0 };
      let totalPresent = 0;

      const formattedAttendance = attendance.map(record => {
        const mealType = record._id.meal_type;
        const count = record.count;
        mealCounts[mealType] = (mealCounts[mealType] || 0) + count;
        totalPresent += count;

        return {
          meal_type: mealType,
          count: count,
          date: record._id.date
        };
      });

      // Get total active users/subscribers for the mess to calculate attendance rate
      const User = require('../models/User');
      const userFilter = { status: 'active', role: 'subscriber' };
      if (req.messContext?.mess_id) {
        userFilter.mess_id = req.messContext.mess_id;
      }
      const totalActiveUsers = await User.countDocuments(userFilter);

      // Calculate attendance rate (present / total active users * 100)
      const attendanceRate = totalActiveUsers > 0
        ? ((totalPresent / totalActiveUsers) * 100).toFixed(1)
        : 0;

      // For now, absent and late are not tracked in the model, so they're 0
      const analytics = {
        totalPresent: totalPresent,
        totalAbsent: 0, // Not tracked in current model
        attendanceRate: parseFloat(attendanceRate),
        lateArrivals: 0, // Not tracked in current model
        presentChange: '+0%', // Can be calculated if needed
        absentChange: '+0%',
        rateChange: '+0%',
        lateChange: '+0%',
        period: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD'),
          days: endDate.diff(startDate, 'days') + 1
        },
        totals: mealCounts,
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

      // Build match filter with mess context
      const matchFilter = {
        scan_time: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate()
        }
      };

      // Add mess filtering
      if (req.messContext?.mess_id) {
        matchFilter.mess_id = req.messContext.mess_id;
      }

      const attendance = await Attendance.aggregate([
        {
          $match: matchFilter
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

      // Build match filter with mess context
      const matchFilter = {
        scan_time: {
          $gte: startDate.toDate()
        }
      };

      // Add mess filtering
      if (req.messContext?.mess_id) {
        matchFilter.mess_id = req.messContext.mess_id;
      }

      const attendance = await Attendance.aggregate([
        {
          $match: matchFilter
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

  // Get meal prediction statistics (day-wise attendance ratio)
  async getMealPrediction(req, res) {
    try {
      const { weeks = 4 } = req.query;
      const weeksToAnalyze = parseInt(weeks) || 4;

      // Build match filter with mess context
      const matchFilter = {};
      if (req.messContext?.mess_id) {
        matchFilter.mess_id = req.messContext.mess_id;
      } else if (req.user.role === 'mess_admin') {
        matchFilter.mess_id = req.user.mess_id;
      }

      // Get attendance data for the specified number of weeks
      const startDate = moment().subtract(weeksToAnalyze, 'weeks').startOf('day');
      matchFilter.scan_time = { $gte: startDate.toDate() };

      // Get unique active subscribers count for the mess (count unique users, not subscriptions)
      const subscriberFilter = {
        status: 'active',
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() }
      };
      if (matchFilter.mess_id) {
        subscriberFilter.mess_id = matchFilter.mess_id;
      }

      // Count unique users with active subscriptions (not subscription count)
      const uniqueSubscribers = await Subscription.distinct('user_id', subscriberFilter);
      const activeSubscribersCount = uniqueSubscribers.length;

      // Get meal-wise subscriber count (users subscribed for each meal type)
      const mealWiseSubscribers = await Subscription.aggregate([
        { $match: subscriberFilter },
        {
          $group: {
            _id: '$user_id',
            meals_included: { $first: '$meals_included' }
          }
        },
        {
          $group: {
            _id: null,
            breakfastCount: {
              $sum: { $cond: [{ $ifNull: ['$meals_included.breakfast', true] }, 1, 0] }
            },
            lunchCount: {
              $sum: { $cond: [{ $ifNull: ['$meals_included.lunch', true] }, 1, 0] }
            },
            dinnerCount: {
              $sum: { $cond: [{ $ifNull: ['$meals_included.dinner', true] }, 1, 0] }
            }
          }
        }
      ]);

      const mealSubscriberCounts = mealWiseSubscribers[0] || {
        breakfastCount: activeSubscribersCount,
        lunchCount: activeSubscribersCount,
        dinnerCount: activeSubscribersCount
      };

      // Aggregate attendance by day of week and meal type
      const attendanceByDayOfWeek = await Attendance.aggregate([
        { $match: matchFilter },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$scan_time' }, // 1 = Sunday, 2 = Monday, etc.
            meal_type: 1,
            scan_date: { $dateToString: { format: '%Y-%m-%d', date: '$scan_time' } }
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: '$dayOfWeek',
              meal_type: '$meal_type',
              date: '$scan_date'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: '$_id.dayOfWeek',
              meal_type: '$_id.meal_type'
            },
            totalAttendance: { $sum: '$count' },
            daysCount: { $sum: 1 },
            avgAttendance: { $avg: '$count' },
            minAttendance: { $min: '$count' },
            maxAttendance: { $max: '$count' }
          }
        },
        { $sort: { '_id.dayOfWeek': 1, '_id.meal_type': 1 } }
      ]);

      // Map day numbers to day names
      const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const mealOrder = { breakfast: 1, lunch: 2, dinner: 3 };

      // Format the prediction data
      const predictionByDay = {};
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      // Initialize all days with empty data
      daysOfWeek.forEach(day => {
        predictionByDay[day] = {
          breakfast: { predicted: 0, ratio: 0, avgAttendance: 0, minAttendance: 0, maxAttendance: 0 },
          lunch: { predicted: 0, ratio: 0, avgAttendance: 0, minAttendance: 0, maxAttendance: 0 },
          dinner: { predicted: 0, ratio: 0, avgAttendance: 0, minAttendance: 0, maxAttendance: 0 },
          total: { predicted: 0, ratio: 0 }
        };
      });

      // Fill in actual data with meal-specific subscriber counts for accurate ratio
      attendanceByDayOfWeek.forEach(record => {
        const dayName = dayNames[record._id.dayOfWeek];
        const mealType = record._id.meal_type;

        if (predictionByDay[dayName] && mealType) {
          const avgAttendance = Math.round(record.avgAttendance);

          // Use meal-specific subscriber count for accurate ratio
          let mealSubscriberCount = activeSubscribersCount;
          if (mealType === 'breakfast') {
            mealSubscriberCount = mealSubscriberCounts.breakfastCount || activeSubscribersCount;
          } else if (mealType === 'lunch') {
            mealSubscriberCount = mealSubscriberCounts.lunchCount || activeSubscribersCount;
          } else if (mealType === 'dinner') {
            mealSubscriberCount = mealSubscriberCounts.dinnerCount || activeSubscribersCount;
          }

          const ratio = mealSubscriberCount > 0
            ? Math.round((avgAttendance / mealSubscriberCount) * 100)
            : 0;

          predictionByDay[dayName][mealType] = {
            predicted: avgAttendance,
            ratio: ratio,
            avgAttendance: avgAttendance,
            minAttendance: record.minAttendance,
            maxAttendance: record.maxAttendance,
            samplesCount: record.daysCount,
            subscriberCount: mealSubscriberCount
          };
        }
      });

      // Calculate daily totals
      const totalMealSubscribers = mealSubscriberCounts.breakfastCount + mealSubscriberCounts.lunchCount + mealSubscriberCounts.dinnerCount;
      Object.keys(predictionByDay).forEach(day => {
        const dayData = predictionByDay[day];
        const totalPredicted = dayData.breakfast.predicted + dayData.lunch.predicted + dayData.dinner.predicted;
        dayData.total = {
          predicted: totalPredicted,
          ratio: totalMealSubscribers > 0 ? Math.round((totalPredicted / totalMealSubscribers) * 100) : 0
        };
      });

      // Get today's day name for highlighting
      const todayDayName = moment().format('dddd');

      // Get next 7 days prediction
      const next7Days = [];
      for (let i = 0; i < 7; i++) {
        const date = moment().add(i, 'days');
        const dayName = date.format('dddd');
        const dayData = predictionByDay[dayName];

        next7Days.push({
          date: date.format('YYYY-MM-DD'),
          dayName: dayName,
          isToday: i === 0,
          prediction: {
            breakfast: dayData.breakfast.predicted,
            lunch: dayData.lunch.predicted,
            dinner: dayData.dinner.predicted,
            total: dayData.total.predicted
          },
          ratio: {
            breakfast: dayData.breakfast.ratio,
            lunch: dayData.lunch.ratio,
            dinner: dayData.dinner.ratio,
            total: dayData.total.ratio
          }
        });
      }

      res.json({
        success: true,
        data: {
          totalSubscribers: activeSubscribersCount,
          mealWiseSubscribers: {
            breakfast: mealSubscriberCounts.breakfastCount,
            lunch: mealSubscriberCounts.lunchCount,
            dinner: mealSubscriberCounts.dinnerCount
          },
          weeksAnalyzed: weeksToAnalyze,
          analysisStartDate: startDate.format('YYYY-MM-DD'),
          todayDayName,
          predictionByDay,
          next7Days,
          summary: {
            averageAttendanceRate: Object.values(predictionByDay).reduce((acc, day) => acc + day.total.ratio, 0) / 7,
            highestAttendanceDay: Object.entries(predictionByDay).reduce((max, [day, data]) =>
              data.total.ratio > max.ratio ? { day, ratio: data.total.ratio } : max,
              { day: '', ratio: 0 }
            ),
            lowestAttendanceDay: Object.entries(predictionByDay).reduce((min, [day, data]) =>
              (min.day === '' || data.total.ratio < min.ratio) ? { day, ratio: data.total.ratio } : min,
              { day: '', ratio: 100 }
            )
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching meal prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meal prediction statistics'
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
