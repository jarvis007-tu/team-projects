const { Op } = require('sequelize');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const MealConfirmation = require('../models/MealConfirmation');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

class ReportController {
  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const today = moment().format('YYYY-MM-DD');
      const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');

      // User statistics
      const [totalUsers, activeUsers, totalAdmins] = await Promise.all([
        User.count(),
        User.count({ where: { status: 'active' } }),
        User.count({ where: { role: 'admin' } })
      ]);

      // Subscription statistics
      const [activeSubscriptions, expiringThisWeek, monthlyRevenue] = await Promise.all([
        Subscription.count({
          where: {
            status: 'active',
            end_date: { [Op.gte]: today }
          }
        }),
        Subscription.count({
          where: {
            status: 'active',
            end_date: {
              [Op.between]: [
                today,
                moment().add(7, 'days').format('YYYY-MM-DD')
              ]
            }
          }
        }),
        Subscription.sum('amount', {
          where: {
            payment_status: 'paid',
            createdAt: {
              [Op.between]: [startOfMonth, endOfMonth]
            }
          }
        })
      ]);

      // Today's attendance
      const todayAttendance = await Attendance.findAll({
        attributes: [
          'meal_type',
          [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
        ],
        where: { scan_date: today },
        group: ['meal_type']
      });

      // Monthly attendance trend
      const monthlyTrend = await Attendance.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('scan_date')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
        ],
        where: {
          scan_date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        },
        group: [sequelize.fn('DATE', sequelize.col('scan_date'))],
        order: [[sequelize.fn('DATE', sequelize.col('scan_date')), 'ASC']]
      });

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
          [Op.between]: [start_date, end_date]
        };
      }
      if (meal_type) whereConditions.meal_type = meal_type;
      if (user_id) whereConditions.user_id = user_id;

      const attendance = await Attendance.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone']
        }],
        order: [['scan_date', 'DESC'], ['scan_time', 'DESC']]
      });

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
        if (!summary.byDate[record.scan_date]) {
          summary.byDate[record.scan_date] = 0;
        }
        summary.byDate[record.scan_date]++;

        // Unique users
        summary.uniqueUsers.add(record.user_id);
      });

      summary.uniqueUsers = summary.uniqueUsers.size;

      if (format === 'excel') {
        return this.exportAttendanceToExcel(res, attendance, summary);
      } else if (format === 'pdf') {
        return this.exportAttendanceToPDF(res, attendance, summary);
      }

      res.json({
        success: true,
        data: {
          summary,
          records: attendance
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

      const subscriptions = await Subscription.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone']
        }],
        order: [['createdAt', 'DESC']]
      });

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

      if (format === 'excel') {
        return this.exportSubscriptionsToExcel(res, subscriptions, summary);
      }

      res.json({
        success: true,
        data: {
          summary,
          records: subscriptions
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

      const whereConditions = {
        payment_status: 'paid'
      };

      if (start_date && end_date) {
        whereConditions.createdAt = {
          [Op.between]: [start_date, end_date]
        };
      }

      let groupByClause;
      let dateFormat;

      switch (group_by) {
        case 'day':
          groupByClause = sequelize.fn('DATE', sequelize.col('createdAt'));
          dateFormat = 'DATE';
          break;
        case 'week':
          groupByClause = sequelize.fn('YEARWEEK', sequelize.col('createdAt'));
          dateFormat = 'YEARWEEK';
          break;
        case 'month':
          groupByClause = sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m');
          dateFormat = 'MONTH';
          break;
        case 'year':
          groupByClause = sequelize.fn('YEAR', sequelize.col('createdAt'));
          dateFormat = 'YEAR';
          break;
        default:
          groupByClause = sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m');
          dateFormat = 'MONTH';
      }

      const revenue = await Subscription.findAll({
        attributes: [
          [groupByClause, 'period'],
          [sequelize.fn('COUNT', sequelize.col('subscription_id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue'],
          'plan_type'
        ],
        where: whereConditions,
        group: ['period', 'plan_type'],
        order: [[groupByClause, 'ASC']]
      });

      // Calculate totals
      const totals = {
        totalRevenue: 0,
        totalSubscriptions: 0,
        byPlanType: {}
      };

      revenue.forEach(record => {
        totals.totalRevenue += parseFloat(record.dataValues.total_revenue);
        totals.totalSubscriptions += parseInt(record.dataValues.count);
        
        if (!totals.byPlanType[record.plan_type]) {
          totals.byPlanType[record.plan_type] = {
            count: 0,
            revenue: 0
          };
        }
        
        totals.byPlanType[record.plan_type].count += parseInt(record.dataValues.count);
        totals.byPlanType[record.plan_type].revenue += parseFloat(record.dataValues.total_revenue);
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
      const user = await User.findByPk(user_id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const dateConditions = {};
      if (start_date && end_date) {
        dateConditions.scan_date = {
          [Op.between]: [start_date, end_date]
        };
      }

      // Get subscriptions
      const subscriptions = await Subscription.findAll({
        where: { user_id },
        order: [['createdAt', 'DESC']]
      });

      // Get attendance
      const attendance = await Attendance.findAll({
        where: {
          user_id,
          ...dateConditions
        },
        order: [['scan_date', 'DESC'], ['scan_time', 'DESC']]
      });

      // Get meal confirmations
      const confirmations = await MealConfirmation.findAll({
        where: {
          user_id,
          meal_date: dateConditions.scan_date || { [Op.gte]: moment().subtract(30, 'days').format('YYYY-MM-DD') }
        },
        order: [['meal_date', 'DESC']]
      });

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
          date: record.scan_date,
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
          start: sub.start_date,
          end: sub.end_date,
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
        doc.text(`${record.scan_date} ${moment(record.scan_time).format('HH:mm')} - ${record.user.full_name} - ${record.meal_type}`);
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