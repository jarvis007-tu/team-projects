const { Op } = require('sequelize');
const moment = require('moment');
const geolib = require('geolib');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const MealConfirmation = require('../models/MealConfirmation');
const logger = require('../utils/logger');
const { verifyQRCode } = require('../services/qrService');
const { sequelize } = require('../config/database');

class AttendanceController {
  // Scan QR code for attendance
  async scanQR(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { qr_code, geo_location, device_id } = req.body;
      const userId = req.user.id;

      // Verify QR code
      const qrData = await verifyQRCode(qr_code);
      
      if (!qrData.valid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: qrData.message || 'Invalid QR code'
        });
      }

      // Check active subscription
      const subscription = await Subscription.findOne({
        where: {
          user_id: userId,
          status: 'active',
          start_date: { [Op.lte]: moment().format('YYYY-MM-DD') },
          end_date: { [Op.gte]: moment().format('YYYY-MM-DD') }
        }
      });

      if (!subscription) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      // Verify geolocation
      if (geo_location && process.env.MESS_LATITUDE && process.env.MESS_LONGITUDE) {
        const distance = geolib.getDistance(
          { latitude: geo_location.latitude, longitude: geo_location.longitude },
          { latitude: parseFloat(process.env.MESS_LATITUDE), longitude: parseFloat(process.env.MESS_LONGITUDE) }
        );

        const maxRadius = parseInt(process.env.MESS_RADIUS_METERS) || 200;
        
        if (distance > maxRadius) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'You are outside the mess premises'
          });
        }
      }

      // Check for duplicate scan
      const today = moment().format('YYYY-MM-DD');
      const existingAttendance = await Attendance.findOne({
        where: {
          user_id: userId,
          scan_date: today,
          meal_type: qrData.meal_type
        }
      });

      if (existingAttendance) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked for this meal'
        });
      }

      // Check meal confirmation if required
      if (process.env.REQUIRE_MEAL_CONFIRMATION === 'true') {
        const confirmation = await MealConfirmation.findOne({
          where: {
            user_id: userId,
            meal_date: today,
            meal_type: qrData.meal_type,
            status: 'confirmed'
          }
        });

        if (!confirmation) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'Please confirm your meal attendance first'
          });
        }

        // Update confirmation status
        await confirmation.update({ status: 'attended' }, { transaction });
      }

      // Create attendance record
      const attendance = await Attendance.create({
        user_id: userId,
        subscription_id: subscription.subscription_id,
        scan_date: today,
        meal_type: qrData.meal_type,
        scan_time: new Date(),
        qr_code,
        geo_location,
        device_id,
        is_valid: true
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Attendance marked successfully',
        data: attendance
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error scanning QR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark attendance'
      });
    }
  }

  // Get attendance history
  async getAttendanceHistory(req, res) {
    try {
      const userId = req.user.role === 'admin' ? req.query.user_id : req.user.id;
      const { start_date, end_date, meal_type, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const whereConditions = {};
      if (userId) whereConditions.user_id = userId;
      if (meal_type) whereConditions.meal_type = meal_type;
      
      if (start_date && end_date) {
        whereConditions.scan_date = {
          [Op.between]: [start_date, end_date]
        };
      }

      const { count, rows } = await Attendance.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email']
        }],
        order: [['scan_time', 'DESC']]
      });

      res.json({
        success: true,
        data: {
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

      const whereConditions = { scan_date: today };
      if (meal_type) whereConditions.meal_type = meal_type;

      const attendance = await Attendance.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }],
        order: [['scan_time', 'DESC']]
      });

      // Get meal-wise count
      const mealCounts = await Attendance.findAll({
        attributes: [
          'meal_type',
          [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
        ],
        where: { scan_date: today },
        group: ['meal_type']
      });

      res.json({
        success: true,
        data: {
          date: today,
          attendance,
          summary: mealCounts,
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
      
      const whereConditions = {};
      if (start_date && end_date) {
        whereConditions.scan_date = {
          [Op.between]: [start_date, end_date]
        };
      } else {
        // Default to last 30 days
        whereConditions.scan_date = {
          [Op.gte]: moment().subtract(30, 'days').format('YYYY-MM-DD')
        };
      }

      // Daily attendance trend
      const dailyTrend = await Attendance.findAll({
        attributes: [
          'scan_date',
          [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
        ],
        where: whereConditions,
        group: ['scan_date'],
        order: [['scan_date', 'ASC']]
      });

      // Meal-wise distribution
      const mealDistribution = await Attendance.findAll({
        attributes: [
          'meal_type',
          [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
        ],
        where: whereConditions,
        group: ['meal_type']
      });

      // Peak hours
      const peakHours = await Attendance.findAll({
        attributes: [
          [sequelize.fn('HOUR', sequelize.col('scan_time')), 'hour'],
          [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
        ],
        where: whereConditions,
        group: [sequelize.fn('HOUR', sequelize.col('scan_time'))],
        order: [[sequelize.fn('COUNT', sequelize.col('attendance_id')), 'DESC']],
        limit: 5
      });

      res.json({
        success: true,
        data: {
          dailyTrend,
          mealDistribution,
          peakHours
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
    const transaction = await sequelize.transaction();

    try {
      const { user_id, meal_type, scan_date, reason } = req.body;

      // Check if user exists
      const user = await User.findByPk(user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check for duplicate
      const existingAttendance = await Attendance.findOne({
        where: {
          user_id,
          scan_date: scan_date || moment().format('YYYY-MM-DD'),
          meal_type
        }
      });

      if (existingAttendance) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked'
        });
      }

      // Get active subscription
      const subscription = await Subscription.findOne({
        where: {
          user_id,
          status: 'active',
          start_date: { [Op.lte]: scan_date || moment().format('YYYY-MM-DD') },
          end_date: { [Op.gte]: scan_date || moment().format('YYYY-MM-DD') }
        }
      });

      const attendance = await Attendance.create({
        user_id,
        subscription_id: subscription?.subscription_id,
        scan_date: scan_date || moment().format('YYYY-MM-DD'),
        meal_type,
        scan_time: new Date(),
        qr_code: 'MANUAL_ENTRY',
        validation_errors: `Manual entry by admin: ${reason || 'No reason provided'}`,
        is_valid: true
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Manual attendance marked successfully',
        data: attendance
      });
    } catch (error) {
      await transaction.rollback();
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

      const attendance = await Attendance.findByPk(id);
      
      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      await attendance.destroy();

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

      const whereConditions = {};
      if (start_date && end_date) {
        whereConditions.scan_date = {
          [Op.between]: [start_date, end_date]
        };
      }

      const attendance = await Attendance.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone']
        }],
        order: [['scan_date', 'DESC'], ['scan_time', 'DESC']]
      });

      if (format === 'csv') {
        const csv = [
          'Date,Time,User Name,Email,Phone,Meal Type,Status',
          ...attendance.map(a => 
            `${a.scan_date},${moment(a.scan_time).format('HH:mm:ss')},${a.user.full_name},${a.user.email},${a.user.phone},${a.meal_type},${a.is_valid ? 'Valid' : 'Invalid'}`
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

      const whereConditions = {};
      
      if (date) {
        const targetDate = moment(date);
        whereConditions.scan_time = {
          [Op.between]: [
            targetDate.startOf('day').toDate(),
            targetDate.endOf('day').toDate()
          ]
        };
      }
      
      if (meal_type) whereConditions.meal_type = meal_type;
      if (user_id) whereConditions.user_id = user_id;

      const { count, rows } = await Attendance.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email']
        }],
        order: [['scan_time', 'DESC']]
      });

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

      const attendance = await Attendance.findAll({
        where: {
          scan_time: {
            [Op.between]: [
              targetDate.startOf('day').toDate(),
              targetDate.endOf('day').toDate()
            ]
          }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }],
        order: [['scan_time', 'DESC']]
      });

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

      const attendance = await Attendance.findByPk(id);

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      await attendance.update(updates);

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
    const transaction = await sequelize.transaction();

    try {
      const { attendanceList } = req.body;

      if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
        await transaction.rollback();
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
          where: {
            user_id,
            meal_type,
            scan_time: {
              [Op.between]: [
                moment(date).startOf('day').toDate(),
                moment(date).endOf('day').toDate()
              ]
            }
          }
        });

        if (existing) {
          results.push({
            user_id,
            meal_type,
            status: 'skipped',
            message: 'Already marked'
          });
          continue;
        }

        const attendance = await Attendance.create({
          user_id,
          subscription_id: null,
          meal_type,
          scan_time: moment(date).toDate(),
          marked_by: req.user.id,
          verification_method: 'manual'
        }, { transaction });

        results.push({
          user_id,
          meal_type,
          status: 'success',
          attendance_id: attendance.attendance_id
        });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Bulk attendance marked successfully',
        data: results
      });
    } catch (error) {
      await transaction.rollback();
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

      const attendance = await Attendance.findAll({
        where: {
          scan_time: {
            [Op.between]: [startDate.toDate(), endDate.toDate()]
          }
        },
        attributes: [
          'meal_type',
          [sequelize.fn('COUNT', '*'), 'count'],
          [sequelize.fn('DATE', sequelize.col('scan_time')), 'date']
        ],
        group: ['meal_type', sequelize.fn('DATE', sequelize.col('scan_time'))],
        order: [[sequelize.fn('DATE', sequelize.col('scan_time')), 'ASC']]
      });

      // Calculate averages
      const totalDays = endDate.diff(startDate, 'days') + 1;
      const mealCounts = { breakfast: 0, lunch: 0, dinner: 0 };

      attendance.forEach(record => {
        mealCounts[record.meal_type] += parseInt(record.dataValues.count);
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
        daily: attendance
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

      const attendance = await Attendance.findAll({
        where: {
          user_id: userId,
          scan_time: {
            [Op.between]: [startDate.toDate(), endDate.toDate()]
          }
        },
        order: [['scan_time', 'DESC']]
      });

      const summary = {
        breakfast: attendance.filter(a => a.meal_type === 'breakfast').length,
        lunch: attendance.filter(a => a.meal_type === 'lunch').length,
        dinner: attendance.filter(a => a.meal_type === 'dinner').length,
        total: attendance.length
      };

      const user = await User.findByPk(userId, {
        attributes: ['user_id', 'full_name', 'email']
      });

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

      const attendance = await Attendance.findAll({
        attributes: [
          'meal_type',
          [sequelize.fn('COUNT', '*'), 'count'],
          [sequelize.fn('DATE', sequelize.col('scan_time')), 'date']
        ],
        where: {
          scan_time: {
            [Op.between]: [startDate.toDate(), endDate.toDate()]
          }
        },
        group: ['meal_type', sequelize.fn('DATE', sequelize.col('scan_time'))],
        order: [[sequelize.fn('DATE', sequelize.col('scan_time')), 'ASC']]
      });

      const mealwise = {};
      
      attendance.forEach(record => {
        const date = record.dataValues.date;
        if (!mealwise[date]) {
          mealwise[date] = {
            breakfast: 0,
            lunch: 0,
            dinner: 0
          };
        }
        mealwise[date][record.meal_type] = parseInt(record.dataValues.count);
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

      const attendance = await Attendance.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('scan_time')), 'date'],
          [sequelize.fn('COUNT', '*'), 'count']
        ],
        where: {
          scan_time: {
            [Op.gte]: startDate.toDate()
          }
        },
        group: [sequelize.fn('DATE', sequelize.col('scan_time'))],
        order: [[sequelize.fn('DATE', sequelize.col('scan_time')), 'ASC']]
      });

      const trends = attendance.map(record => ({
        date: record.dataValues.date,
        count: parseInt(record.dataValues.count)
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
      const activeUsers = await User.findAll({
        where: { status: 'active' },
        include: [{
          model: Subscription,
          as: 'subscriptions',
          where: {
            status: 'active',
            end_date: { [Op.gte]: today.toDate() }
          },
          required: true
        }]
      });

      const alerts = [];

      for (const user of activeUsers) {
        const attendance = await Attendance.findAll({
          where: {
            user_id: user.user_id,
            scan_time: {
              [Op.between]: [today.toDate(), moment().endOf('day').toDate()]
            }
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