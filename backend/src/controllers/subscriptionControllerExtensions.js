const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const logger = require('../utils/logger');

// Extension methods for subscription controller
const subscriptionExtensions = {
  // Delete subscription
  async deleteSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      await subscription.destroy();

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

      const result = await Subscription.update(updateData, {
        where: {
          subscription_id: {
            [Op.in]: ids
          }
        }
      });

      res.json({
        success: true,
        message: `${result[0]} subscriptions updated successfully`,
        data: {
          updated: result[0]
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
      let groupBy = 'DATE(created_at)';
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          groupBy = 'MONTH(created_at)';
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          groupBy = 'MONTH(created_at)';
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get subscription trends
      const trends = await sequelize.query(
        `SELECT 
          DATE(createdAt) as date,
          COUNT(*) as new_subscriptions,
          SUM(amount) as revenue
        FROM subscriptions
        WHERE createdAt >= :startDate
          AND deletedAt IS NULL
        GROUP BY DATE(createdAt)
        ORDER BY date ASC`,
        {
          replacements: { startDate },
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Get subscription by plan type
      const byPlanType = await Subscription.findAll({
        attributes: [
          'plan_type',
          [sequelize.fn('COUNT', '*'), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
        ],
        where: {
          createdAt: {
            [Op.gte]: startDate
          }
        },
        group: ['plan_type']
      });

      // Get churn rate
      const totalSubscriptions = await Subscription.count({
        where: {
          createdAt: {
            [Op.gte]: startDate
          }
        }
      });

      const cancelledSubscriptions = await Subscription.count({
        where: {
          status: 'cancelled',
          updatedAt: {
            [Op.gte]: startDate
          }
        }
      });

      const churnRate = totalSubscriptions > 0 
        ? ((cancelledSubscriptions / totalSubscriptions) * 100).toFixed(2)
        : 0;

      // Get active vs inactive
      const [activeCount, inactiveCount, expiredCount] = await Promise.all([
        Subscription.count({ where: { status: 'active' } }),
        Subscription.count({ where: { status: 'inactive' } }),
        Subscription.count({ where: { status: 'expired' } })
      ]);

      res.json({
        success: true,
        data: {
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
          [Op.between]: [start_date, end_date]
        };
      }

      const subscriptions = await Subscription.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }],
        order: [['createdAt', 'DESC']]
      });

      if (format === 'csv') {
        const csv = 'ID,User,Email,Plan,Amount,Status,Start Date,End Date\n' + 
          subscriptions.map(s => 
            `${s.subscription_id},"${s.user?.full_name || ''}","${s.user?.email || ''}","${s.plan_type}",${s.amount},"${s.status}","${s.start_date}","${s.end_date}"`
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