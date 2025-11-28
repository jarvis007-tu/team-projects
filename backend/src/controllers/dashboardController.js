const { User, Subscription, Attendance, WeeklyMenu } = require('../models');
const moment = require('moment');
const logger = require('../utils/logger');

class DashboardController {
  async getStats(req, res) {
    try {
      const today = moment().startOf('day');
      const thisMonth = moment().startOf('month');
      const lastMonth = moment().subtract(1, 'month').startOf('month');

      // Build query filter based on mess context
      // Super admin without mess_id: see all data (messFilter = {})
      // Super admin with mess_id OR mess_admin: see only their mess data
      const messFilter = {};
      if (req.messContext?.mess_id) {
        messFilter.mess_id = req.messContext.mess_id;
      }

      // Get user statistics with growth
      const totalUsers = await User.countDocuments(messFilter);
      const activeUsers = await User.countDocuments({ ...messFilter, status: 'active' });
      const lastMonthUsers = await User.countDocuments({
        ...messFilter,
        createdAt: { $lt: thisMonth.toDate() }
      });
      const userGrowth = lastMonthUsers > 0 ?
        (((totalUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(2) : 0;

      // Get subscription statistics with growth
      const activeSubscriptions = await Subscription.countDocuments({
        ...messFilter,
        status: 'active',
        end_date: { $gte: today.toDate() }
      });

      const lastMonthSubscriptions = await Subscription.countDocuments({
        ...messFilter,
        status: 'active',
        createdAt: { $lt: thisMonth.toDate() }
      });
      const subscriptionGrowth = lastMonthSubscriptions > 0 ?
        (((activeSubscriptions - lastMonthSubscriptions) / lastMonthSubscriptions) * 100).toFixed(2) : 0;

      const expiringSoon = await Subscription.countDocuments({
        ...messFilter,
        status: 'active',
        end_date: {
          $gte: today.toDate(),
          $lte: moment().add(7, 'days').toDate()
        }
      });

      // Get subscription type counts
      const subTypeStats = await Subscription.aggregate([
        {
          $match: {
            ...messFilter,
            status: 'active',
            end_date: { $gte: today.toDate() }
          }
        },
        {
          $group: {
            _id: '$sub_type',
            count: { $sum: 1 }
          }
        }
      ]);

      // Format subscription type counts
      const subTypeCounts = {
        veg: 0,
        'non-veg': 0,
        both: 0
      };
      subTypeStats.forEach(stat => {
        if (stat._id) {
          subTypeCounts[stat._id] = stat.count;
        }
      });

      // Get today's attendance with growth
      const todayAttendance = await Attendance.countDocuments({
        ...messFilter,
        scan_time: {
          $gte: today.toDate(),
          $lte: moment().endOf('day').toDate()
        }
      });

      const yesterdayAttendance = await Attendance.countDocuments({
        ...messFilter,
        scan_time: {
          $gte: moment().subtract(1, 'day').startOf('day').toDate(),
          $lte: moment().subtract(1, 'day').endOf('day').toDate()
        }
      });
      const attendanceGrowth = yesterdayAttendance > 0 ?
        (((todayAttendance - yesterdayAttendance) / yesterdayAttendance) * 100).toFixed(2) : 0;

      // Calculate monthly revenue with growth
      const currentMonthRevenue = await Subscription.aggregate([
        {
          $match: {
            ...messFilter,
            payment_status: 'paid',
            createdAt: {
              $gte: thisMonth.toDate(),
              $lte: moment().endOf('month').toDate()
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const lastMonthRevenue = await Subscription.aggregate([
        {
          $match: {
            ...messFilter,
            payment_status: 'paid',
            createdAt: {
              $gte: lastMonth.toDate(),
              $lte: moment(lastMonth).endOf('month').toDate()
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const monthlyRevenue = currentMonthRevenue[0]?.total || 0;
      const prevMonthRevenue = lastMonthRevenue[0]?.total || 0;
      const revenueGrowth = prevMonthRevenue > 0 ?
        (((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(2) : 0;

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            growth: parseFloat(userGrowth)
          },
          subscriptions: {
            active: activeSubscriptions,
            expiringSoon: expiringSoon,
            expired: await Subscription.countDocuments({
              ...messFilter,
              status: 'expired',
              end_date: { $lt: today.toDate() }
            }),
            byType: subTypeCounts,
            growth: parseFloat(subscriptionGrowth)
          },
          attendance: {
            today: todayAttendance,
            weekly: await Attendance.countDocuments({
              ...messFilter,
              scan_time: {
                $gte: moment().startOf('week').toDate(),
                $lte: moment().endOf('week').toDate()
              }
            }),
            growth: parseFloat(attendanceGrowth)
          },
          revenue: {
            monthly: monthlyRevenue,
            total: monthlyRevenue * 12,
            growth: parseFloat(revenueGrowth)
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
      const { limit = 10, mess_id } = req.query;

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      // Get recent attendance logs
      const recentAttendance = await Attendance.find(messFilter)
        .limit(parseInt(limit))
        .sort({ scan_time: -1 })
        .populate('user_id', 'full_name email');

      // Get recent subscriptions
      const recentSubscriptions = await Subscription.find(messFilter)
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
      const { period = 'week', mess_id } = req.query;
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

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      // Get attendance data using MongoDB aggregation
      const attendanceData = await Attendance.aggregate([
        {
          $match: {
            ...messFilter,
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
      const { mess_id } = req.query;
      const now = moment();

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      // Get subscription statistics by plan using aggregation
      const planStats = await Subscription.aggregate([
        {
          $match: { ...messFilter, status: 'active' }
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
          ...messFilter,
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
        ...messFilter,
        status: 'expired',
        end_date: {
          $gte: moment().subtract(30, 'days').toDate(),
          $lte: now.toDate()
        }
      });

      const renewed = await Subscription.countDocuments({
        ...messFilter,
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
            totalActive: await Subscription.countDocuments({ ...messFilter, status: 'active' }),
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
      const { mess_id } = req.query;
      const today = moment().startOf('day');
      const endOfToday = moment().endOf('day');

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      const attendance = await Attendance.find({
        ...messFilter,
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
      const { date, mess_id } = req.query;
      const targetDate = date ? moment(date) : moment();
      const startOfDay = targetDate.startOf('day');
      const endOfDay = targetDate.clone().endOf('day');

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      const attendance = await Attendance.aggregate([
        {
          $match: {
            ...messFilter,
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
      const { days = 7, mess_id } = req.query;
      const today = moment().startOf('day');
      const expiryDate = moment().add(parseInt(days), 'days').endOf('day');

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      const subscriptions = await Subscription.find({
        ...messFilter,
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
      const { period = 'month', mess_id } = req.query;
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

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      const revenue = await Subscription.aggregate([
        {
          $match: {
            ...messFilter,
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
      const { mess_id } = req.query;
      const alerts = [];
      const today = moment();

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      // Check for expiring subscriptions
      const expiringCount = await Subscription.countDocuments({
        ...messFilter,
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
        ...messFilter,
        scan_time: {
          $gte: today.startOf('day').toDate(),
          $lte: today.endOf('day').toDate()
        }
      });

      const activeUsers = await User.countDocuments({ ...messFilter, status: 'active' });
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
        ...messFilter,
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
      const { mess_id } = req.query;
      const today = moment();
      const thisMonth = moment().startOf('month');

      // Build mess filter
      const messFilter = {};
      if (req.user.role === 'super_admin') {
        // Super admin can view all or filter by specific mess
        if (mess_id) {
          messFilter.mess_id = mess_id;
        }
      } else {
        // Mess admin can only view their own mess
        messFilter.mess_id = req.user.mess_id;
      }

      const [totalUsers, activeSubscriptions, todayAttendance] = await Promise.all([
        User.countDocuments({ ...messFilter, status: 'active' }),
        Subscription.countDocuments({
          ...messFilter,
          status: 'active',
          end_date: { $gte: today.toDate() }
        }),
        Attendance.countDocuments({
          ...messFilter,
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
            ...messFilter,
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

  // User/Subscriber dashboard
  async getUserDashboard(req, res) {
    try {
      const userId = req.user._id || req.user.user_id;
      const today = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      // Get active subscription
      const subscription = await Subscription.findOne({
        user_id: userId,
        status: 'active',
        end_date: { $gte: today.toDate() }
      })
        .populate('mess_id', 'name address')
        .lean();

      // Get today's menu
      const dayOfWeek = moment().format('dddd').toLowerCase();
      const todayMenu = await WeeklyMenu.findOne({
        mess_id: req.user.mess_id,
        day: dayOfWeek,
        is_active: true
      })
        .populate('category_id', 'name')
        .populate('menu_items', 'name description is_veg')
        .lean();

      // Format menu
      const formattedMenu = todayMenu ? {
        breakfast: {
          items: todayMenu.breakfast_items || [],
          nutritional_info: todayMenu.breakfast_nutritional_info || {}
        },
        lunch: {
          items: todayMenu.lunch_items || [],
          nutritional_info: todayMenu.lunch_nutritional_info || {}
        },
        dinner: {
          items: todayMenu.dinner_items || [],
          nutritional_info: todayMenu.dinner_nutritional_info || {}
        }
      } : null;

      // Get recent attendance (last 5 records)
      const recentAttendance = await Attendance.find({
        user_id: userId
      })
        .sort({ scan_time: -1 })
        .limit(5)
        .select('meal_type scan_date scan_time is_valid')
        .lean();

      // Get unread notifications
      const { Notification } = require('../models');
      const notifications = await Notification.find({
        $or: [
          { user_id: userId },
          { user_id: null, mess_id: req.user.mess_id }, // Mess-wide notifications
          { user_id: null, mess_id: null } // System-wide notifications
        ],
        is_read: false
      })
        .sort({ created_at: -1 })
        .limit(5)
        .lean();

      res.json({
        success: true,
        data: {
          subscription,
          todayMenu: formattedMenu,
          recentAttendance,
          notifications
        }
      });
    } catch (error) {
      logger.error('Error fetching user dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user dashboard data'
      });
    }
  }
}

module.exports = new DashboardController();