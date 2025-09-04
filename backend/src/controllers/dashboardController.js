const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, Subscription, Attendance, WeeklyMenu } = require('../models');
const moment = require('moment');
const logger = require('../utils/logger');

class DashboardController {
  async getStats(req, res) {
    try {
      const today = moment().startOf('day');
      const thisMonth = moment().startOf('month');
      
      // Get user statistics
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      
      // Get subscription statistics
      const activeSubscriptions = await Subscription.count({
        where: {
          status: 'active',
          end_date: { [Op.gte]: today.toDate() }
        }
      });
      
      const expiringSoon = await Subscription.count({
        where: {
          status: 'active',
          end_date: {
            [Op.between]: [today.toDate(), moment().add(7, 'days').toDate()]
          }
        }
      });
      
      // Get today's attendance
      const todayAttendance = await Attendance.count({
        where: {
          scan_time: {
            [Op.between]: [today.toDate(), moment().endOf('day').toDate()]
          }
        }
      });
      
      // Calculate actual revenue from active subscriptions
      const activeSubscriptionsWithAmount = await Subscription.findAll({
        where: {
          status: 'active',
          end_date: { [Op.gte]: today.toDate() }
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']]
      });
      
      const monthlyRevenue = activeSubscriptionsWithAmount[0]?.dataValues?.total || 0;
      
      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          },
          subscriptions: {
            active: activeSubscriptions,
            expiringSoon: expiringSoon,
            expired: await Subscription.count({
              where: {
                status: 'expired',
                end_date: { [Op.lt]: today.toDate() }
              }
            })
          },
          attendance: {
            today: todayAttendance,
            weekly: await Attendance.count({
              where: {
                scan_time: {
                  [Op.between]: [moment().startOf('week').toDate(), moment().endOf('week').toDate()]
                }
              }
            })
          },
          revenue: {
            monthly: monthlyRevenue,
            total: monthlyRevenue * 12 // Annual projection
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

  async getRecentActivity(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      // Get recent attendance logs
      const recentAttendance = await Attendance.findAll({
        limit: parseInt(limit),
        order: [['scan_time', 'DESC']],
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email']
        }]
      });
      
      // Get recent subscriptions
      const recentSubscriptions = await Subscription.findAll({
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email']
        }]
      });
      
      // Combine and sort activities
      const activities = [];
      
      recentAttendance.forEach(log => {
        activities.push({
          type: 'attendance',
          message: `${log.user?.full_name || 'User'} scanned for ${log.meal_type}`,
          timestamp: log.scan_time,
          user: log.user
        });
      });
      
      recentSubscriptions.forEach(sub => {
        activities.push({
          type: 'subscription',
          message: `${sub.user?.full_name || 'User'} ${sub.status === 'active' ? 'activated' : sub.status} subscription`,
          timestamp: sub.createdAt,
          user: sub.user
        });
      });
      
      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json({
        success: true,
        data: activities.slice(0, limit)
      });
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent activity'
      });
    }
  }

  async getAttendanceStats(req, res) {
    try {
      const { period = 'week' } = req.query;
      let startDate, endDate;
      
      switch (period) {
        case 'day':
          startDate = moment().startOf('day');
          endDate = moment().endOf('day');
          break;
        case 'week':
          startDate = moment().startOf('week');
          endDate = moment().endOf('week');
          break;
        case 'month':
          startDate = moment().startOf('month');
          endDate = moment().endOf('month');
          break;
        default:
          startDate = moment().startOf('week');
          endDate = moment().endOf('week');
      }
      
      // Get attendance data
      const attendanceData = await Attendance.findAll({
        where: {
          scan_time: {
            [Op.between]: [startDate.toDate(), endDate.toDate()]
          }
        },
        attributes: [
          'meal_type',
          [User.sequelize.fn('COUNT', '*'), 'count'],
          [User.sequelize.fn('DATE', User.sequelize.col('scan_time')), 'date']
        ],
        group: ['meal_type', User.sequelize.fn('DATE', User.sequelize.col('scan_time'))]
      });
      
      // Format data for charts
      const chartData = {};
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      
      // Initialize chart data
      for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'day')) {
        const dateStr = m.format('YYYY-MM-DD');
        chartData[dateStr] = {
          date: dateStr,
          breakfast: 0,
          lunch: 0,
          dinner: 0
        };
      }
      
      // Populate with actual data
      attendanceData.forEach(record => {
        const dateStr = moment(record.dataValues.date).format('YYYY-MM-DD');
        if (chartData[dateStr]) {
          chartData[dateStr][record.meal_type] = parseInt(record.dataValues.count);
        }
      });
      
      res.json({
        success: true,
        data: {
          period,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          chartData: Object.values(chartData),
          summary: {
            total: attendanceData.reduce((sum, record) => sum + parseInt(record.dataValues.count), 0),
            byMealType: mealTypes.reduce((acc, type) => {
              acc[type] = attendanceData
                .filter(record => record.meal_type === type)
                .reduce((sum, record) => sum + parseInt(record.dataValues.count), 0);
              return acc;
            }, {})
          }
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

  async getSubscriptionStats(req, res) {
    try {
      const now = moment();
      
      // Get subscription statistics by plan
      const planStats = await Subscription.findAll({
        attributes: [
          'plan_type',
          [User.sequelize.fn('COUNT', '*'), 'count'],
          [User.sequelize.fn('SUM', User.sequelize.col('amount')), 'revenue']
        ],
        where: {
          status: 'active'
        },
        group: ['plan_type']
      });
      
      // Get monthly growth
      const monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = moment().subtract(i, 'months').startOf('month');
        const monthEnd = moment().subtract(i, 'months').endOf('month');
        
        const count = await Subscription.count({
          where: {
            createdAt: {
              [Op.between]: [monthStart.toDate(), monthEnd.toDate()]
            }
          }
        });
        
        monthlyGrowth.push({
          month: monthStart.format('MMM YYYY'),
          count
        });
      }
      
      // Get renewal rate
      const totalExpired = await Subscription.count({
        where: {
          status: 'expired',
          end_date: {
            [Op.between]: [moment().subtract(30, 'days').toDate(), now.toDate()]
          }
        }
      });
      
      const renewed = await Subscription.count({
        where: {
          status: 'active',
          createdAt: {
            [Op.between]: [moment().subtract(30, 'days').toDate(), now.toDate()]
          }
        }
      });
      
      const renewalRate = totalExpired > 0 ? (renewed / totalExpired * 100).toFixed(2) : 0;
      
      res.json({
        success: true,
        data: {
          planDistribution: planStats,
          monthlyGrowth,
          renewalRate: parseFloat(renewalRate),
          summary: {
            totalActive: await Subscription.count({ where: { status: 'active' } }),
            totalRevenue: planStats.reduce((sum, plan) => sum + (parseFloat(plan.dataValues.revenue) || 0), 0),
            averageSubscriptionValue: planStats.length > 0 
              ? planStats.reduce((sum, plan) => sum + (parseFloat(plan.dataValues.revenue) || 0), 0) / 
                planStats.reduce((sum, plan) => sum + parseInt(plan.dataValues.count), 0)
              : 0
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching subscription stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription statistics'
      });
    }
  }

  async getMenuToday(req, res) {
    try {
      const today = moment().format('dddd').toLowerCase();
      
      const todayMenu = await WeeklyMenu.findOne({
        where: {
          day_of_week: today,
          is_active: true
        }
      });
      
      if (!todayMenu) {
        return res.json({
          success: true,
          data: {
            day: today,
            meals: {
              breakfast: { items: [], nutritional_info: {} },
              lunch: { items: [], nutritional_info: {} },
              dinner: { items: [], nutritional_info: {} }
            }
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          day: today,
          meals: {
            breakfast: todayMenu.breakfast_menu,
            lunch: todayMenu.lunch_menu,
            dinner: todayMenu.dinner_menu
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching today\'s menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s menu'
      });
    }
  }

  async getTodayAttendance(req, res) {
    try {
      const today = moment().startOf('day');
      const endOfToday = moment().endOf('day');
      
      const attendance = await Attendance.findAll({
        where: {
          scan_time: {
            [Op.between]: [today.toDate(), endOfToday.toDate()]
          }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email']
        }],
        order: [['scan_time', 'DESC']]
      });
      
      const summary = {
        breakfast: attendance.filter(a => a.meal_type === 'breakfast').length,
        lunch: attendance.filter(a => a.meal_type === 'lunch').length,
        dinner: attendance.filter(a => a.meal_type === 'dinner').length,
        total: attendance.length
      };
      
      res.json({
        success: true,
        data: {
          attendance,
          summary
        }
      });
    } catch (error) {
      logger.error('Error fetching today\'s attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s attendance'
      });
    }
  }

  async getMealwiseAttendance(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date ? moment(date) : moment();
      const startOfDay = targetDate.startOf('day');
      const endOfDay = targetDate.clone().endOf('day');
      
      const attendance = await Attendance.findAll({
        where: {
          scan_time: {
            [Op.between]: [startOfDay.toDate(), endOfDay.toDate()]
          }
        },
        attributes: [
          'meal_type',
          [User.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['meal_type']
      });
      
      const mealwise = {
        breakfast: 0,
        lunch: 0,
        dinner: 0
      };
      
      attendance.forEach(record => {
        mealwise[record.meal_type] = parseInt(record.dataValues.count);
      });
      
      res.json({
        success: true,
        data: {
          date: targetDate.format('YYYY-MM-DD'),
          mealwise,
          total: Object.values(mealwise).reduce((sum, count) => sum + count, 0)
        }
      });
    } catch (error) {
      logger.error('Error fetching mealwise attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch mealwise attendance'
      });
    }
  }

  async getExpiringSubscriptions(req, res) {
    try {
      const { days = 7 } = req.query;
      const today = moment().startOf('day');
      const expiryDate = moment().add(parseInt(days), 'days').endOf('day');
      
      const subscriptions = await Subscription.findAll({
        where: {
          status: 'active',
          end_date: {
            [Op.between]: [today.toDate(), expiryDate.toDate()]
          }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }],
        order: [['end_date', 'ASC']]
      });
      
      res.json({
        success: true,
        data: {
          subscriptions,
          count: subscriptions.length,
          period: `${days} days`
        }
      });
    } catch (error) {
      logger.error('Error fetching expiring subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring subscriptions'
      });
    }
  }

  async getRevenueStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      let startDate, endDate, groupBy;
      
      switch (period) {
        case 'week':
          startDate = moment().startOf('week');
          endDate = moment().endOf('week');
          groupBy = 'day';
          break;
        case 'month':
          startDate = moment().startOf('month');
          endDate = moment().endOf('month');
          groupBy = 'week';
          break;
        case 'quarter':
          startDate = moment().startOf('quarter');
          endDate = moment().endOf('quarter');
          groupBy = 'month';
          break;
        case 'year':
          startDate = moment().startOf('year');
          endDate = moment().endOf('year');
          groupBy = 'month';
          break;
        default:
          startDate = moment().startOf('month');
          endDate = moment().endOf('month');
          groupBy = 'day';
      }
      
      const revenue = await Subscription.findAll({
        attributes: [
          [User.sequelize.fn('SUM', User.sequelize.col('amount')), 'total'],
          [User.sequelize.fn('COUNT', '*'), 'count'],
          [User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'date']
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate.toDate(), endDate.toDate()]
          },
          payment_status: 'paid'
        },
        group: [User.sequelize.fn('DATE', User.sequelize.col('createdAt'))]
      });
      
      const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.dataValues.total || 0), 0);
      const averageRevenue = revenue.length > 0 ? totalRevenue / revenue.length : 0;
      
      res.json({
        success: true,
        data: {
          period,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          totalRevenue,
          averageRevenue,
          dailyRevenue: revenue,
          growth: 0 // Calculate growth percentage if needed
        }
      });
    } catch (error) {
      logger.error('Error fetching revenue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue statistics'
      });
    }
  }

  async getSystemAlerts(req, res) {
    try {
      const alerts = [];
      const today = moment();
      
      // Check for expiring subscriptions
      const expiringCount = await Subscription.count({
        where: {
          status: 'active',
          end_date: {
            [Op.between]: [today.toDate(), moment().add(3, 'days').toDate()]
          }
        }
      });
      
      if (expiringCount > 0) {
        alerts.push({
          type: 'warning',
          message: `${expiringCount} subscriptions expiring in the next 3 days`,
          timestamp: new Date()
        });
      }
      
      // Check for low attendance
      const todayAttendance = await Attendance.count({
        where: {
          scan_time: {
            [Op.between]: [today.startOf('day').toDate(), today.endOf('day').toDate()]
          }
        }
      });
      
      const activeUsers = await User.count({ where: { status: 'active' } });
      const attendanceRate = activeUsers > 0 ? (todayAttendance / (activeUsers * 3)) * 100 : 0;
      
      if (attendanceRate < 50) {
        alerts.push({
          type: 'info',
          message: `Low attendance today: ${attendanceRate.toFixed(1)}%`,
          timestamp: new Date()
        });
      }
      
      // Check for pending payments
      const pendingPayments = await Subscription.count({
        where: {
          payment_status: 'pending',
          status: 'active'
        }
      });
      
      if (pendingPayments > 0) {
        alerts.push({
          type: 'error',
          message: `${pendingPayments} subscriptions with pending payments`,
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error fetching system alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system alerts'
      });
    }
  }

  async getQuickStats(req, res) {
    try {
      const today = moment();
      const thisMonth = moment().startOf('month');
      
      const [totalUsers, activeSubscriptions, todayAttendance, monthlyRevenue] = await Promise.all([
        User.count({ where: { status: 'active' } }),
        Subscription.count({
          where: {
            status: 'active',
            end_date: { [Op.gte]: today.toDate() }
          }
        }),
        Attendance.count({
          where: {
            scan_time: {
              [Op.between]: [today.startOf('day').toDate(), today.endOf('day').toDate()]
            }
          }
        }),
        Subscription.sum('amount', {
          where: {
            createdAt: { [Op.gte]: thisMonth.toDate() },
            payment_status: 'paid'
          }
        })
      ]);
      
      res.json({
        success: true,
        data: {
          totalUsers,
          activeSubscriptions,
          todayAttendance,
          monthlyRevenue: monthlyRevenue || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching quick stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quick statistics'
      });
    }
  }
}

module.exports = new DashboardController();