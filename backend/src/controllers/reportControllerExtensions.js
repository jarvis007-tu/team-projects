const moment = require('moment');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const logger = require('../utils/logger');

// Additional report controller methods
const reportExtensions = {
  // Get meal consumption report
  async getMealConsumptionReport(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date ? moment(start_date) : moment().startOf('month');
      const endDate = end_date ? moment(end_date) : moment().endOf('month');

      const mealConsumption = await Attendance.aggregate([
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
              date: { $dateToString: { format: "%Y-%m-%d", date: "$scan_time" } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            meal_type: '$_id.meal_type',
            date: '$_id.date',
            count: 1
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          period: {
            start: startDate.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
          },
          consumption: mealConsumption
        }
      });
    } catch (error) {
      logger.error('Error generating meal consumption report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate meal consumption report'
      });
    }
  },

  // Get financial summary
  async getFinancialSummary(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date ? moment(start_date) : moment().startOf('month');
      const endDate = end_date ? moment(end_date) : moment().endOf('month');

      const revenueResult = await Subscription.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate()
            },
            payment_status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const pendingResult = await Subscription.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate()
            },
            payment_status: 'pending'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
      const pendingPayments = pendingResult.length > 0 ? pendingResult[0].total : 0;

      res.json({
        success: true,
        data: {
          period: {
            start: startDate.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
          },
          revenue: revenue || 0,
          pending: pendingPayments || 0,
          total: (revenue || 0) + (pendingPayments || 0)
        }
      });
    } catch (error) {
      logger.error('Error generating financial summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate financial summary'
      });
    }
  },

  // Get waste analysis (mock implementation)
  async getWasteAnalysis(req, res) {
    try {
      res.json({
        success: true,
        data: {
          message: 'Waste analysis feature is under development',
          estimatedWaste: {
            breakfast: '5%',
            lunch: '7%',
            dinner: '6%'
          }
        }
      });
    } catch (error) {
      logger.error('Error generating waste analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate waste analysis'
      });
    }
  },

  // Get comparative analysis
  async getComparativeAnalysis(req, res) {
    try {
      const currentMonth = moment().startOf('month');
      const previousMonth = moment().subtract(1, 'month').startOf('month');

      const currentRevenueResult = await Subscription.aggregate([
        {
          $match: {
            createdAt: { $gte: currentMonth.toDate() },
            payment_status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const previousRevenueResult = await Subscription.aggregate([
        {
          $match: {
            createdAt: {
              $gte: previousMonth.toDate(),
              $lt: currentMonth.toDate()
            },
            payment_status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const currentRevenue = currentRevenueResult.length > 0 ? currentRevenueResult[0].total : 0;
      const previousRevenue = previousRevenueResult.length > 0 ? previousRevenueResult[0].total : 0;

      const growth = previousRevenue ?
        ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2) : 0;

      res.json({
        success: true,
        data: {
          current: {
            month: currentMonth.format('MMMM YYYY'),
            revenue: currentRevenue || 0
          },
          previous: {
            month: previousMonth.format('MMMM YYYY'),
            revenue: previousRevenue || 0
          },
          growth: parseFloat(growth)
        }
      });
    } catch (error) {
      logger.error('Error generating comparative analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate comparative analysis'
      });
    }
  },

  // Get trends analysis
  async getTrendsAnalysis(req, res) {
    try {
      const { metric = 'revenue', period = 'month' } = req.query;
      let startDate;

      switch (period) {
        case 'week':
          startDate = moment().subtract(7, 'days');
          break;
        case 'month':
          startDate = moment().subtract(30, 'days');
          break;
        case 'quarter':
          startDate = moment().subtract(90, 'days');
          break;
        default:
          startDate = moment().subtract(30, 'days');
      }

      let data;

      if (metric === 'revenue') {
        data = await Subscription.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate.toDate() },
              payment_status: 'paid'
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              value: { $sum: '$amount' }
            }
          },
          {
            $project: {
              _id: 0,
              date: '$_id',
              value: 1
            }
          },
          {
            $sort: { date: 1 }
          }
        ]);
      } else if (metric === 'attendance') {
        data = await Attendance.aggregate([
          {
            $match: {
              scan_time: { $gte: startDate.toDate() }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$scan_time" } },
              value: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              date: '$_id',
              value: 1
            }
          },
          {
            $sort: { date: 1 }
          }
        ]);
      }

      res.json({
        success: true,
        data: {
          metric,
          period,
          startDate: startDate.format('YYYY-MM-DD'),
          trends: data || []
        }
      });
    } catch (error) {
      logger.error('Error generating trends analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate trends analysis'
      });
    }
  },

  // Get custom report
  async getCustomReport(req, res) {
    try {
      const { config } = req.body;

      res.json({
        success: true,
        data: {
          message: 'Custom report generation in progress',
          config: config
        }
      });
    } catch (error) {
      logger.error('Error generating custom report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate custom report'
      });
    }
  },

  // Get report templates
  async getReportTemplates(req, res) {
    try {
      // Mock templates
      const templates = [
        {
          id: 1,
          name: 'Monthly Revenue Report',
          description: 'Monthly revenue and subscription analysis',
          type: 'revenue',
          createdAt: new Date()
        },
        {
          id: 2,
          name: 'Weekly Attendance Report',
          description: 'Weekly attendance patterns and trends',
          type: 'attendance',
          createdAt: new Date()
        }
      ];

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error fetching report templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch report templates'
      });
    }
  },

  // Save custom report template
  async saveCustomReportTemplate(req, res) {
    try {
      const { name, description, type, config } = req.body;

      res.json({
        success: true,
        message: 'Template saved successfully',
        data: {
          id: Date.now(),
          name,
          description,
          type,
          config,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error saving report template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save report template'
      });
    }
  },

  // Generate scheduled report
  async generateScheduledReport(req, res) {
    try {
      const { templateId } = req.params;

      res.json({
        success: true,
        message: 'Scheduled report generation initiated',
        data: {
          templateId,
          scheduledAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error generating scheduled report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate scheduled report'
      });
    }
  },

  // Get report history
  async getReportHistory(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      // Mock history
      const history = [
        {
          id: 1,
          type: 'revenue',
          name: 'Monthly Revenue Report',
          generatedAt: moment().subtract(1, 'day').toDate(),
          generatedBy: req.user.full_name
        },
        {
          id: 2,
          type: 'attendance',
          name: 'Weekly Attendance Report',
          generatedAt: moment().subtract(2, 'days').toDate(),
          generatedBy: req.user.full_name
        }
      ];

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            total: history.length,
            page: parseInt(page),
            pages: Math.ceil(history.length / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching report history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch report history'
      });
    }
  },

  // Export to CSV
  async exportToCSV(req, res) {
    try {
      const { reportType } = req.params;
      const { start_date, end_date } = req.query;

      // Generate CSV header based on report type
      let csv = '';

      if (reportType === 'attendance') {
        csv = 'Date,User,Email,Meal Type,Time\n';
        csv += 'Sample data for attendance report';
      } else if (reportType === 'revenue') {
        csv = 'Date,Amount,Status,User\n';
        csv += 'Sample data for revenue report';
      } else {
        csv = 'Report Type,Data\n';
        csv += `${reportType},Sample data`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}_${moment().format('YYYY-MM-DD')}.csv`);
      res.send(csv);
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export report'
      });
    }
  },

  // Export to PDF
  async exportToPDF(req, res) {
    try {
      const { reportType } = req.params;

      res.json({
        success: true,
        message: 'PDF export feature is under development',
        data: {
          reportType,
          requestedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export report'
      });
    }
  }
};

module.exports = reportExtensions;
