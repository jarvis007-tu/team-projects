const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const MealConfirmation = require('../models/MealConfirmation');
const logger = require('../utils/logger');

class ReportController {
  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const today = moment().startOf('day').toDate();
      const endOfToday = moment().endOf('day').toDate();
      const startOfMonth = moment().startOf('month').toDate();
      const endOfMonth = moment().endOf('month').toDate();

      // User statistics
      const [totalUsers, activeUsers, totalAdmins] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ role: 'admin' })
      ]);

      // Subscription statistics
      const sevenDaysFromNow = moment().add(7, 'days').endOf('day').toDate();
      const [activeSubscriptions, expiringThisWeek, monthlyRevenueResult] = await Promise.all([
        Subscription.countDocuments({
          status: 'active',
          end_date: { $gte: today }
        }),
        Subscription.countDocuments({
          status: 'active',
          end_date: {
            $gte: today,
            $lte: sevenDaysFromNow
          }
        }),
        Subscription.aggregate([
          {
            $match: {
              payment_status: 'paid',
              createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ])
      ]);

      const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

      // Today's attendance
      const todayAttendance = await Attendance.aggregate([
        {
          $match: {
            scan_date: {
              $gte: today,
              $lte: endOfToday
            }
          }
        },
        {
          $group: {
            _id: '$meal_type',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            meal_type: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Monthly attendance trend
      const monthlyTrend = await Attendance.aggregate([
        {
          $match: {
            scan_date: {
              $gte: startOfMonth,
              $lte: endOfMonth
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$scan_date' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id',
            count: 1,
            _id: 0
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            admins: totalAdmins
          },
          subscriptions: {
            active: activeSubscriptions,
            expiringThisWeek,
            monthlyRevenue: monthlyRevenue || 0
          },
          attendance: {
            today: todayAttendance,
            monthlyTrend
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  }

  // Generate attendance report
  async generateAttendanceReport(req, res) {
    try {
      const { start_date, end_date, format = 'json', meal_type, user_id } = req.query;

      const whereConditions = {};
      if (start_date && end_date) {
        whereConditions.scan_date = {
          $gte: moment(start_date).startOf('day').toDate(),
          $lte: moment(end_date).endOf('day').toDate()
        };
      }
      if (meal_type) whereConditions.meal_type = meal_type;
      if (user_id) whereConditions.user_id = user_id;

      const attendance = await Attendance.find(whereConditions)
        .populate('user_id', 'full_name email phone')
        .sort({ scan_date: -1, scan_time: -1 })
        .lean();

      // Generate summary
      const summary = {
        totalRecords: attendance.length,
        byMealType: {},
        byDate: {},
        uniqueUsers: new Set()
      };

      attendance.forEach(record => {
        // By meal type
        if (!summary.byMealType[record.meal_type]) {
          summary.byMealType[record.meal_type] = 0;
        }
        summary.byMealType[record.meal_type]++;

        // By date
        const dateStr = moment(record.scan_date).format('YYYY-MM-DD');
        if (!summary.byDate[dateStr]) {
          summary.byDate[dateStr] = 0;
        }
        summary.byDate[dateStr]++;

        // Unique users
        summary.uniqueUsers.add(record.user_id.toString());
      });

      summary.uniqueUsers = summary.uniqueUsers.size;

      // Transform attendance for response (rename user_id to user)
      const transformedAttendance = attendance.map(record => ({
        ...record,
        user: record.user_id,
        user_id: record.user_id._id
      }));

      if (format === 'excel') {
        return this.exportAttendanceToExcel(res, transformedAttendance, summary);
      } else if (format === 'pdf') {
        return this.exportAttendanceToPDF(res, transformedAttendance, summary);
      }

      res.json({
        success: true,
        data: {
          summary,
          records: transformedAttendance
        }
      });
    } catch (error) {
      logger.error('Error generating attendance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate attendance report'
      });
    }
  }

  // Generate subscription report
  async generateSubscriptionReport(req, res) {
    try {
      const { status, plan_type, format = 'json' } = req.query;

      const whereConditions = {};
      if (status) whereConditions.status = status;
      if (plan_type) whereConditions.plan_type = plan_type;

      const subscriptions = await Subscription.find(whereConditions)
        .populate('user_id', 'full_name email phone')
        .sort({ createdAt: -1 })
        .lean();

      // Generate summary
      const summary = {
        total: subscriptions.length,
        byStatus: {},
        byPlanType: {},
        totalRevenue: 0
      };

      subscriptions.forEach(sub => {
        // By status
        if (!summary.byStatus[sub.status]) {
          summary.byStatus[sub.status] = 0;
        }
        summary.byStatus[sub.status]++;

        // By plan type
        if (!summary.byPlanType[sub.plan_type]) {
          summary.byPlanType[sub.plan_type] = 0;
        }
        summary.byPlanType[sub.plan_type]++;

        // Revenue
        if (sub.payment_status === 'paid') {
          summary.totalRevenue += parseFloat(sub.amount);
        }
      });

      // Transform subscriptions for response (rename user_id to user)
      const transformedSubscriptions = subscriptions.map(sub => ({
        ...sub,
        user: sub.user_id,
        user_id: sub.user_id._id
      }));

      if (format === 'excel') {
        return this.exportSubscriptionsToExcel(res, transformedSubscriptions, summary);
      }

      res.json({
        success: true,
        data: {
          summary,
          records: transformedSubscriptions
        }
      });
    } catch (error) {
      logger.error('Error generating subscription report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate subscription report'
      });
    }
  }

  // Generate revenue report
  async generateRevenueReport(req, res) {
    try {
      const { start_date, end_date, group_by = 'month' } = req.query;

      const matchConditions = {
        payment_status: 'paid'
      };

      if (start_date && end_date) {
        matchConditions.createdAt = {
          $gte: moment(start_date).startOf('day').toDate(),
          $lte: moment(end_date).endOf('day').toDate()
        };
      }

      let groupByExpression;
      let sortField;

      switch (group_by) {
        case 'day':
          groupByExpression = {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          };
          sortField = 1;
          break;
        case 'week':
          groupByExpression = {
            $dateToString: { format: '%Y-W%V', date: '$createdAt' }
          };
          sortField = 1;
          break;
        case 'month':
          groupByExpression = {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          };
          sortField = 1;
          break;
        case 'year':
          groupByExpression = {
            $dateToString: { format: '%Y', date: '$createdAt' }
          };
          sortField = 1;
          break;
        default:
          groupByExpression = {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          };
          sortField = 1;
      }

      const revenue = await Subscription.aggregate([
        {
          $match: matchConditions
        },
        {
          $group: {
            _id: {
              period: groupByExpression,
              plan_type: '$plan_type'
            },
            count: { $sum: 1 },
            total_revenue: { $sum: '$amount' }
          }
        },
        {
          $project: {
            period: '$_id.period',
            plan_type: '$_id.plan_type',
            count: 1,
            total_revenue: 1,
            _id: 0
          }
        },
        {
          $sort: { period: sortField }
        }
      ]);

      // Calculate totals
      const totals = {
        totalRevenue: 0,
        totalSubscriptions: 0,
        byPlanType: {}
      };

      revenue.forEach(record => {
        totals.totalRevenue += parseFloat(record.total_revenue);
        totals.totalSubscriptions += parseInt(record.count);

        if (!totals.byPlanType[record.plan_type]) {
          totals.byPlanType[record.plan_type] = {
            count: 0,
            revenue: 0
          };
        }

        totals.byPlanType[record.plan_type].count += parseInt(record.count);
        totals.byPlanType[record.plan_type].revenue += parseFloat(record.total_revenue);
      });

      res.json({
        success: true,
        data: {
          summary: totals,
          details: revenue
        }
      });
    } catch (error) {
      logger.error('Error generating revenue report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate revenue report'
      });
    }
  }

  // Generate user activity report
  async generateUserActivityReport(req, res) {
    try {
      const { user_id, start_date, end_date } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Get user details
      const user = await User.findById(user_id).select('-password').lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const dateConditions = {};
      if (start_date && end_date) {
        dateConditions.scan_date = {
          $gte: moment(start_date).startOf('day').toDate(),
          $lte: moment(end_date).endOf('day').toDate()
        };
      }

      // Get subscriptions
      const subscriptions = await Subscription.find({ user_id })
        .sort({ createdAt: -1 })
        .lean();

      // Get attendance
      const attendance = await Attendance.find({
        user_id,
        ...dateConditions
      })
        .sort({ scan_date: -1, scan_time: -1 })
        .lean();

      // Get meal confirmations
      const confirmationDateFilter = dateConditions.scan_date || {
        $gte: moment().subtract(30, 'days').startOf('day').toDate()
      };

      const confirmations = await MealConfirmation.find({
        user_id,
        meal_date: confirmationDateFilter
      })
        .sort({ meal_date: -1 })
        .lean();

      // Calculate statistics
      const stats = {
        totalAttendance: attendance.length,
        attendanceByMeal: {},
        confirmationRate: 0,
        currentSubscription: null
      };

      attendance.forEach(record => {
        if (!stats.attendanceByMeal[record.meal_type]) {
          stats.attendanceByMeal[record.meal_type] = 0;
        }
        stats.attendanceByMeal[record.meal_type]++;
      });

      const confirmedMeals = confirmations.filter(c => c.status === 'confirmed').length;
      const attendedMeals = confirmations.filter(c => c.status === 'attended').length;
      stats.confirmationRate = confirmedMeals > 0 ? ((attendedMeals / confirmedMeals) * 100).toFixed(2) : 0;

      // Get current active subscription
      stats.currentSubscription = subscriptions.find(s =>
        s.status === 'active' &&
        moment(s.end_date).isAfter(moment())
      );

      res.json({
        success: true,
        data: {
          user,
          statistics: stats,
          subscriptions,
          recentAttendance: attendance.slice(0, 10),
          recentConfirmations: confirmations.slice(0, 10)
        }
      });
    } catch (error) {
      logger.error('Error generating user activity report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate user activity report'
      });
    }
  }

  // Export attendance to Excel
  async exportAttendanceToExcel(res, attendance, summary) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      // Add headers
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Meal Type', key: 'meal_type', width: 12 },
        { header: 'Status', key: 'status', width: 10 }
      ];

      // Add data
      attendance.forEach(record => {
        worksheet.addRow({
          date: moment(record.scan_date).format('YYYY-MM-DD'),
          time: moment(record.scan_time).format('HH:mm:ss'),
          name: record.user.full_name,
          email: record.user.email,
          phone: record.user.phone,
          meal_type: record.meal_type,
          status: record.is_valid ? 'Valid' : 'Invalid'
        });
      });

      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Total Records', summary.totalRecords]);
      summarySheet.addRow(['Unique Users', summary.uniqueUsers]);
      summarySheet.addRow([]);
      summarySheet.addRow(['Meal Type', 'Count']);
      Object.entries(summary.byMealType).forEach(([type, count]) => {
        summarySheet.addRow([type, count]);
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${moment().format('YYYY-MM-DD')}.xlsx`);

      // Send file
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  // Export subscriptions to Excel
  async exportSubscriptionsToExcel(res, subscriptions, summary) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Subscriptions');

      worksheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Plan', key: 'plan', width: 12 },
        { header: 'Start Date', key: 'start', width: 12 },
        { header: 'End Date', key: 'end', width: 12 },
        { header: 'Amount', key: 'amount', width: 10 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Payment', key: 'payment', width: 10 }
      ];

      subscriptions.forEach(sub => {
        worksheet.addRow({
          name: sub.user.full_name,
          email: sub.user.email,
          phone: sub.user.phone,
          plan: sub.plan_type,
          start: moment(sub.start_date).format('YYYY-MM-DD'),
          end: moment(sub.end_date).format('YYYY-MM-DD'),
          amount: sub.amount,
          status: sub.status,
          payment: sub.payment_status
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=subscriptions_${moment().format('YYYY-MM-DD')}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      logger.error('Error exporting subscriptions to Excel:', error);
      throw error;
    }
  }

  // Export attendance to PDF
  async exportAttendanceToPDF(res, attendance, summary) {
    try {
      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${moment().format('YYYY-MM-DD')}.pdf`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).text('Attendance Report', { align: 'center' });
      doc.moveDown();

      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Records: ${summary.totalRecords}`);
      doc.text(`Unique Users: ${summary.uniqueUsers}`);
      doc.moveDown();

      // Meal Type Summary
      doc.fontSize(14).text('By Meal Type', { underline: true });
      doc.fontSize(12);
      Object.entries(summary.byMealType).forEach(([type, count]) => {
        doc.text(`${type}: ${count}`);
      });
      doc.moveDown();

      // Records
      doc.addPage();
      doc.fontSize(14).text('Attendance Records', { underline: true });
      doc.fontSize(10);

      attendance.slice(0, 50).forEach(record => {
        doc.text(`${moment(record.scan_date).format('YYYY-MM-DD')} ${moment(record.scan_time).format('HH:mm')} - ${record.user.full_name} - ${record.meal_type}`);
      });

      if (attendance.length > 50) {
        doc.moveDown();
        doc.text(`... and ${attendance.length - 50} more records`);
      }

      doc.end();
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }
}

// Import and merge extensions
const reportExtensions = require('./reportControllerExtensions');
Object.assign(ReportController.prototype, reportExtensions);

module.exports = new ReportController();
