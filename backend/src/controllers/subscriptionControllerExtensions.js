const Subscription = require('../models/Subscription');
const User = require('../models/User');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Extension methods for subscription controller
const subscriptionExtensions = {
  // Delete subscription (soft delete)
  async deleteSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Soft delete - set deleted_at timestamp
      await Subscription.findByIdAndUpdate(id, { deleted_at: new Date() });

      logger.info(`Subscription ${id} soft deleted`);

      res.json({
        success: true,
        message: 'Subscription deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete subscription'
      });
    }
  },

  // Bulk update subscriptions
  async bulkUpdateSubscriptions(req, res) {
    try {
      const { ids, ...updateData } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide subscription IDs'
        });
      }

      // Convert string IDs to ObjectIds
      const objectIds = ids.map(id => {
        if (mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });

      const result = await Subscription.updateMany(
        {
          _id: { $in: objectIds }
        },
        { $set: updateData }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} subscriptions updated successfully`,
        data: {
          updated: result.modifiedCount
        }
      });
    } catch (error) {
      logger.error('Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscriptions'
      });
    }
  },

  // Get subscription plans
  async getSubscriptionPlans(req, res) {
    try {
      const plans = [
        {
          id: 1,
          name: 'Basic Plan',
          plan_type: 'monthly',
          price: 3000,
          duration: 30,
          features: [
            '3 meals per day',
            'Basic menu',
            'Standard support'
          ],
          is_active: true
        },
        {
          id: 2,
          name: 'Standard Plan',
          plan_type: 'quarterly',
          price: 8500,
          duration: 90,
          features: [
            '3 meals per day',
            'Premium menu options',
            'Priority support',
            '5% discount'
          ],
          is_active: true
        },
        {
          id: 3,
          name: 'Premium Plan',
          plan_type: 'half_yearly',
          price: 16000,
          duration: 180,
          features: [
            '3 meals per day',
            'Premium menu options',
            'VIP support',
            '10% discount',
            'Special occasion meals'
          ],
          is_active: true
        },
        {
          id: 4,
          name: 'Annual Plan',
          plan_type: 'yearly',
          price: 30000,
          duration: 365,
          features: [
            '3 meals per day',
            'All menu options',
            'VIP support',
            '15% discount',
            'Special occasion meals',
            'Guest meal vouchers'
          ],
          is_active: true
        }
      ];

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      logger.error('Error fetching subscription plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription plans'
      });
    }
  },

  // Get subscription analytics
  async getSubscriptionAnalytics(req, res) {
    try {
      const { period = 'month' } = req.query;

      let startDate = new Date();

      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get subscription trends using aggregation
      const trends = await Subscription.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            deleted_at: null
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            new_subscriptions: { $sum: 1 },
            revenue: { $sum: "$amount" }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            new_subscriptions: 1,
            revenue: 1
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      // Get subscription by plan type
      const byPlanType = await Subscription.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$plan_type',
            count: { $sum: 1 },
            total_revenue: { $sum: '$amount' }
          }
        }
      ]);

      // Get churn rate
      const totalSubscriptions = await Subscription.countDocuments({
        createdAt: { $gte: startDate }
      });

      const cancelledSubscriptions = await Subscription.countDocuments({
        status: 'cancelled',
        updatedAt: { $gte: startDate }
      });

      const churnRate = totalSubscriptions > 0
        ? ((cancelledSubscriptions / totalSubscriptions) * 100).toFixed(2)
        : 0;

      // Get active vs inactive vs expired counts
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const [activeCount, inactiveCount, expiredCount, expiringSoonCount, totalCount, monthlyRevenue] = await Promise.all([
        Subscription.countDocuments({ status: 'active', deleted_at: null }),
        Subscription.countDocuments({ status: 'inactive', deleted_at: null }),
        Subscription.countDocuments({ status: 'expired', deleted_at: null }),
        // Expiring soon: active subscriptions ending within 7 days
        Subscription.countDocuments({
          status: 'active',
          deleted_at: null,
          end_date: { $gte: today, $lte: sevenDaysFromNow }
        }),
        // Total subscriptions (non-deleted)
        Subscription.countDocuments({ deleted_at: null }),
        // Monthly revenue from active paid subscriptions
        Subscription.aggregate([
          {
            $match: {
              status: 'active',
              payment_status: 'paid',
              deleted_at: null
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

      const revenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0;

      res.json({
        success: true,
        data: {
          // Fields expected by frontend stats cards
          total: totalCount,
          active: activeCount,
          expiringSoon: expiringSoonCount,
          monthlyRevenue: revenue,
          // Additional data
          period,
          trends,
          byPlanType,
          churnRate: parseFloat(churnRate),
          statusDistribution: {
            active: activeCount,
            inactive: inactiveCount,
            expired: expiredCount
          },
          summary: {
            totalSubscriptions,
            cancelledSubscriptions,
            averageRevenue: trends.reduce((acc, t) => acc + (t.revenue || 0), 0) / (trends.length || 1)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching subscription analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription analytics'
      });
    }
  },

  // Export subscriptions
  async exportSubscriptions(req, res) {
    try {
      const { status, start_date, end_date, format = 'csv' } = req.query;

      const whereConditions = {};
      if (status) whereConditions.status = status;
      if (start_date && end_date) {
        whereConditions.createdAt = {
          $gte: start_date,
          $lte: end_date
        };
      }

      const subscriptions = await Subscription.find(whereConditions)
        .populate('user_id', 'user_id full_name email phone')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        const csv = 'ID,User,Email,Plan,Amount,Status,Start Date,End Date\n' +
          subscriptions.map(s =>
            `${s._id || s.subscription_id},"${s.user_id?.full_name || ''}","${s.user_id?.email || ''}","${s.plan_type}",${s.amount},"${s.status}","${s.start_date}","${s.end_date}"`
          ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="subscriptions-export.csv"');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: subscriptions
        });
      }
    } catch (error) {
      logger.error('Error exporting subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export subscriptions'
      });
    }
  }
};

module.exports = subscriptionExtensions;
