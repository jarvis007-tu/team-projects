const moment = require('moment');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class SubscriptionController {
  // Get all subscriptions (Admin only)
  async getAllSubscriptions(req, res) {
    try {
      const { page = 1, limit = 10, status, plan_type, user_id } = req.query;
      const skip = (page - 1) * limit;

      const queryConditions = {};

      if (status) queryConditions.status = status;
      if (plan_type) queryConditions.plan_type = plan_type;
      if (user_id) queryConditions.user_id = user_id;

      const [subscriptions, count] = await Promise.all([
        Subscription.find(queryConditions)
          .limit(parseInt(limit))
          .skip(skip)
          .populate('user_id', 'full_name email phone')
          .sort({ createdAt: -1 }),
        Subscription.countDocuments(queryConditions)
      ]);

      res.json({
        success: true,
        data: {
          subscriptions,
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

      const subscriptions = await Subscription.find({ user_id: userId })
        .sort({ createdAt: -1 });

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
      const today = moment().format('YYYY-MM-DD');

      const subscription = await Subscription.findOne({
        user_id: userId,
        status: 'active',
        start_date: { $lte: today },
        end_date: { $gte: today }
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { user_id, plan_type, start_date, payment_id } = req.body;

      // Check if user exists
      const user = await User.findById(user_id);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check for existing active subscription
      const today = moment().format('YYYY-MM-DD');
      const existingSubscription = await Subscription.findOne({
        user_id,
        status: 'active',
        end_date: { $gte: today }
      });

      if (existingSubscription) {
        await session.abortTransaction();
        session.endSession();
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
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid plan type'
          });
      }

      const subscription = await Subscription.create([{
        user_id,
        plan_type,
        start_date: start_date || moment().format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        amount,
        payment_id,
        payment_status: payment_id ? 'paid' : 'pending',
        status: 'active'
      }], { session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription[0]
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
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

      const subscription = await Subscription.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

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

      const subscription = await Subscription.findByIdAndUpdate(
        id,
        { status: 'cancelled' },
        { new: true }
      );

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { plan_type, payment_id } = req.body;

      const oldSubscription = await Subscription.findById(id);

      if (!oldSubscription) {
        await session.abortTransaction();
        session.endSession();
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

      const newSubscription = await Subscription.create([{
        user_id: oldSubscription.user_id,
        plan_type: plan_type || oldSubscription.plan_type,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        amount,
        payment_id,
        payment_status: payment_id ? 'paid' : 'pending',
        status: 'active'
      }], { session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Subscription renewed successfully',
        data: newSubscription[0]
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
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
        Subscription.countDocuments({
          status: 'active',
          end_date: { $gte: today }
        }),
        Subscription.countDocuments({
          status: { $in: ['expired', 'cancelled'] }
        }),
        Subscription.aggregate([
          { $match: { payment_status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      // Plan distribution
      const planDistribution = await Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan_type', count: { $sum: 1 } } },
        { $project: { plan_type: '$_id', count: 1, _id: 0 } }
      ]);

      res.json({
        success: true,
        data: {
          activeSubscriptions: activeCount,
          expiredSubscriptions: expiredCount,
          totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
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

      const result = await Subscription.updateMany(
        {
          status: 'active',
          end_date: { $lt: today }
        },
        { status: 'expired' }
      );

      res.json({
        success: true,
        message: `Updated ${result.modifiedCount} expired subscriptions`
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

      const subscription = await Subscription.findById(id)
        .populate('user_id', 'full_name email phone');

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
