const { User, Subscription, Attendance, WeeklyMenu } = require('../models');
const moment = require('moment');
const logger = require('../utils/logger');

class DashboardController {
  async getStats(req, res) {
    try {
      const today = moment().startOf('day');
      const thisMonth = moment().startOf('month');
      
      // Get user statistics
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: 'active' });

      // Get subscription statistics
      const activeSubscriptions = await Subscription.countDocuments({
        status: 'active',
        end_date: { $gte: today.toDate() }
      });

      const expiringSoon = await Subscription.countDocuments({
        status: 'active',
        end_date: {
          $gte: today.toDate(),
          $lte: moment().add(7, 'days').toDate()
        }
      });

      // Get today's attendance
      const todayAttendance = await Attendance.countDocuments({
        scan_time: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      });

      // Calculate actual revenue from active subscriptions
      const revenueResult = await Subscription.aggregate([
        {
          $match: {
            status: 'active',
            end_date: { $gte: today.toDate() }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const monthlyRevenue = revenueResult[0]?.total || 0;
      
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
            expired: await Subscription.countDocuments({
              status: 'expired',
              end_date: { $lt: today.toDate() }
            })
          },
          attendance: {
            today: todayAttendance,
            weekly: await Attendance.countDocuments({
              scan_time: {
                $gte: moment().startOf('week').toDate(),
                $lte: moment().endOf('week').toDate()
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
      const recentAttendance = await Attendance.find()
        .limit(parseInt(limit))
        .sort({ scan_time: -1 })
        .populate('user_id', 'full_name email');

      // Get recent subscriptions
      const recentSubscriptions = await Subscription.find()
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .populate('user_id', 'full_name email');
      
      // Combine and sort activities
      const activities = [];
      
      recentAttendance.forEach(log => {
        activities.push({
          type: 'attendance',
          message: `${log.user_id?.full_name || 'User'} scanned for ${log.meal_type}`,
          timestamp: log.scan_time,
          user: log.user_id
        });
      });

      recentSubscriptions.forEach(sub => {
        activities.push({
          type: 'subscription',
          message: `${sub.user_id?.full_name || 'User'} ${sub.status === 'active' ? 'activated' : sub.status} subscription`,
          timestamp: sub.createdAt,
          user: sub.user_id
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
      
      // Get attendance data using MongoDB aggregation
      const attendanceData = await Attendance.aggregate([
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
        }
      ]);
      
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
        const dateStr = record._id.date;
        if (chartData[dateStr]) {
          chartData[dateStr][record._id.meal_type] = record.count;
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
            total: attendanceData.reduce((sum, record) => sum + record.count, 0),
            byMealType: mealTypes.reduce((acc, type) => {
              acc[type] = attendanceData
                .filter(record => record._id.meal_type === type)
                .reduce((sum, record) => sum + record.count, 0);
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
      
      // Get subscription statistics by plan using aggregation
      const planStats = await Subscription.aggregate([
        {
          $match: { status: 'active' }
        },
        {
          $group: {
            _id: '$plan_type',
            count: { $sum: 1 },
            revenue: { $sum: '$amount' }
          }
        }
      ]);
      
      // Get monthly growth
      const monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = moment().subtract(i, 'months').startOf('month');
        const monthEnd = moment().subtract(i, 'months').endOf('month');
        
        const count = await Subscription.countDocuments({
          createdAt: {
            $gte: monthStart.toDate(),
            $lte: monthEnd.toDate()
          }
        });
        
        monthlyGrowth.push({
          month: monthStart.format('MMM YYYY'),
          count
        });
      }
      
      // Get renewal rate
      const totalExpired = await Subscription.countDocuments({
        status: 'expired',
        end_date: {
          $gte: moment().subtract(30, 'days').toDate(),
          $lte: now.toDate()
        }
      });

      const renewed = await Subscription.countDocuments({
        status: 'active',
        createdAt: {
          $gte: moment().subtract(30, 'days').toDate(),
          $lte: now.toDate()
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
            totalActive: await Subscription.countDocuments({ status: 'active' }),
            totalRevenue: planStats.reduce((sum, plan) => sum + (plan.revenue || 0), 0),
            averageSubscriptionValue: planStats.length > 0
              ? planStats.reduce((sum, plan) => sum + (plan.revenue || 0), 0) /
                planStats.reduce((sum, plan) => sum + plan.count, 0)
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
        day: today,
        is_active: true
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
      
      const attendance = await Attendance.find({
        scan_time: {
          $gte: today.toDate(),
          $lte: endOfToday.toDate()
        }
      })
        .populate('user_id', 'full_name email')
        .sort({ scan_time: -1 });
      
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
      
      const attendance = await Attendance.aggregate([
        {
          $match: {
            scan_time: {
              $gte: startOfDay.toDate(),
              $lte: endOfDay.toDate()
            }
          }
        },
        {
          $group: {
            _id: '$meal_type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const mealwise = {
        breakfast: 0,
        lunch: 0,
        dinner: 0
      };
      
      attendance.forEach(record => {
        mealwise[record._id] = record.count;
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
      
      const subscriptions = await Subscription.find({
        status: 'active',
        end_date: {
          $gte: today.toDate(),
          $lte: expiryDate.toDate()
        }
      })
        .populate('user_id', 'full_name email phone')
        .sort({ end_date: 1 });
      
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
      
      const revenue = await Subscription.aggregate([
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
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0);
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
      const expiringCount = await Subscription.countDocuments({
        status: 'active',
        end_date: {
          $gte: today.toDate(),
          $lte: moment().add(3, 'days').toDate()
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
      const todayAttendance = await Attendance.countDocuments({
        scan_time: {
          $gte: today.startOf('day').toDate(),
          $lte: today.endOf('day').toDate()
        }
      });

      const activeUsers = await User.countDocuments({ status: 'active' });
      const attendanceRate = activeUsers > 0 ? (todayAttendance / (activeUsers * 3)) * 100 : 0;
      
      if (attendanceRate < 50) {
        alerts.push({
          type: 'info',
          message: `Low attendance today: ${attendanceRate.toFixed(1)}%`,
          timestamp: new Date()
        });
      }
      
      // Check for pending payments
      const pendingPayments = await Subscription.countDocuments({
        payment_status: 'pending',
        status: 'active'
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
      
      const [totalUsers, activeSubscriptions, todayAttendance] = await Promise.all([
        User.countDocuments({ status: 'active' }),
        Subscription.countDocuments({
          status: 'active',
          end_date: { $gte: today.toDate() }
        }),
        Attendance.countDocuments({
          scan_time: {
            $gte: today.startOf('day').toDate(),
            $lte: today.endOf('day').toDate()
          }
        })
      ]);

      // Get monthly revenue using aggregation
      const revenueResult = await Subscription.aggregate([
        {
          $match: {
            createdAt: { $gte: thisMonth.toDate() },
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

      const monthlyRevenue = revenueResult[0]?.total || 0;
      
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