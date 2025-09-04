const { Op } = require('sequelize');
const moment = require('moment');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

class SubscriptionController {
  // Get all subscriptions (Admin only)
  async getAllSubscriptions(req, res) {
    try {
      const { page = 1, limit = 10, status, plan_type, user_id } = req.query;
      const offset = (page - 1) * limit;

      const whereConditions = {};
      
      if (status) whereConditions.status = status;
      if (plan_type) whereConditions.plan_type = plan_type;
      if (user_id) whereConditions.user_id = user_id;

      const { count, rows } = await Subscription.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          subscriptions: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions'
      });
    }
  }

  // Get user's subscriptions
  async getUserSubscriptions(req, res) {
    try {
      const userId = req.user.role === 'admin' ? req.params.userId : req.user.id;

      const subscriptions = await Subscription.findAll({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      logger.error('Error fetching user subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions'
      });
    }
  }

  // Get active subscription
  async getActiveSubscription(req, res) {
    try {
      const userId = req.user.id;

      const subscription = await Subscription.findOne({
        where: {
          user_id: userId,
          status: 'active',
          start_date: { [Op.lte]: moment().format('YYYY-MM-DD') },
          end_date: { [Op.gte]: moment().format('YYYY-MM-DD') }
        }
      });

      if (!subscription) {
        return res.json({
          success: true,
          data: null,
          message: 'No active subscription found'
        });
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error fetching active subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active subscription'
      });
    }
  }

  // Create subscription
  async createSubscription(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { user_id, plan_type, start_date, payment_id } = req.body;

      // Check if user exists
      const user = await User.findByPk(user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check for existing active subscription
      const existingSubscription = await Subscription.findOne({
        where: {
          user_id,
          status: 'active',
          end_date: { [Op.gte]: moment().format('YYYY-MM-DD') }
        }
      });

      if (existingSubscription) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'User already has an active subscription'
        });
      }

      // Calculate end date based on plan type
      const startMoment = moment(start_date || undefined);
      let endDate;
      let amount;

      switch (plan_type) {
        case 'weekly':
          endDate = startMoment.add(7, 'days');
          amount = 700;
          break;
        case 'monthly':
          endDate = startMoment.add(1, 'month');
          amount = 3000;
          break;
        case 'quarterly':
          endDate = startMoment.add(3, 'months');
          amount = 8500;
          break;
        case 'yearly':
          endDate = startMoment.add(1, 'year');
          amount = 30000;
          break;
        default:
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid plan type'
          });
      }

      const subscription = await Subscription.create({
        user_id,
        plan_type,
        start_date: start_date || moment().format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        amount,
        payment_id,
        payment_status: payment_id ? 'paid' : 'pending',
        status: 'active'
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription'
      });
    }
  }

  // Update subscription
  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const subscription = await Subscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      await subscription.update(updates);

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Error updating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription'
      });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      await subscription.update({ status: 'cancelled' });

      res.json({
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription'
      });
    }
  }

  // Renew subscription
  async renewSubscription(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { plan_type, payment_id } = req.body;

      const oldSubscription = await Subscription.findByPk(id);

      if (!oldSubscription) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Calculate new dates
      const startDate = moment(oldSubscription.end_date).add(1, 'day');
      let endDate;
      let amount;

      switch (plan_type || oldSubscription.plan_type) {
        case 'weekly':
          endDate = startDate.clone().add(7, 'days');
          amount = 700;
          break;
        case 'monthly':
          endDate = startDate.clone().add(1, 'month');
          amount = 3000;
          break;
        case 'quarterly':
          endDate = startDate.clone().add(3, 'months');
          amount = 8500;
          break;
        case 'yearly':
          endDate = startDate.clone().add(1, 'year');
          amount = 30000;
          break;
      }

      const newSubscription = await Subscription.create({
        user_id: oldSubscription.user_id,
        plan_type: plan_type || oldSubscription.plan_type,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        amount,
        payment_id,
        payment_status: payment_id ? 'paid' : 'pending',
        status: 'active'
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Subscription renewed successfully',
        data: newSubscription
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error renewing subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew subscription'
      });
    }
  }

  // Get subscription statistics
  async getSubscriptionStats(req, res) {
    try {
      const today = moment().format('YYYY-MM-DD');

      const [activeCount, expiredCount, totalRevenue] = await Promise.all([
        Subscription.count({
          where: {
            status: 'active',
            end_date: { [Op.gte]: today }
          }
        }),
        Subscription.count({
          where: {
            status: { [Op.in]: ['expired', 'cancelled'] }
          }
        }),
        Subscription.sum('amount', {
          where: {
            payment_status: 'paid'
          }
        })
      ]);

      // Plan distribution
      const planDistribution = await Subscription.findAll({
        attributes: [
          'plan_type',
          [sequelize.fn('COUNT', sequelize.col('subscription_id')), 'count']
        ],
        where: {
          status: 'active'
        },
        group: ['plan_type']
      });

      res.json({
        success: true,
        data: {
          activeSubscriptions: activeCount,
          expiredSubscriptions: expiredCount,
          totalRevenue: totalRevenue || 0,
          planDistribution
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

  // Check and update expired subscriptions
  async updateExpiredSubscriptions(req, res) {
    try {
      const today = moment().format('YYYY-MM-DD');

      const result = await Subscription.update(
        { status: 'expired' },
        {
          where: {
            status: 'active',
            end_date: { [Op.lt]: today }
          }
        }
      );

      res.json({
        success: true,
        message: `Updated ${result[0]} expired subscriptions`
      });
    } catch (error) {
      logger.error('Error updating expired subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update expired subscriptions'
      });
    }
  }

  // Get subscription by ID
  async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findByPk(id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }]
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription'
      });
    }
  }
}

// Import and merge extensions
const subscriptionExtensions = require('./subscriptionControllerExtensions');
Object.assign(SubscriptionController.prototype, subscriptionExtensions);

module.exports = new SubscriptionController();