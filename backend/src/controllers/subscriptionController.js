const moment = require('moment-timezone');
const User = require('../models/User');
const Mess = require('../models/Mess');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { addMessFilter } = require('../utils/messHelpers');

class SubscriptionController {
  // Get all subscriptions (Admin only)
  async getAllSubscriptions(req, res) {
    try {
      const { page = 1, limit = 10, status, plan_type, user_id, mess_id } = req.query;
      const skip = (page - 1) * limit;

      const queryConditions = { deleted_at: null };

      // Add mess filtering
      addMessFilter(queryConditions, req.user, mess_id);

      if (status) queryConditions.status = status;
      if (plan_type) queryConditions.plan_type = plan_type;
      if (user_id) queryConditions.user_id = user_id;

      const [subscriptions, count] = await Promise.all([
        Subscription.find(queryConditions)
          .limit(parseInt(limit))
          .skip(skip)
          .populate('user_id', 'full_name email phone')
          .populate('mess_id', 'name code')
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
      // For admin routes with :userId param, use that; otherwise use current user's ID
      const userId = req.params.userId || req.user.user_id;

      // Convert to ObjectId if valid
      const userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      logger.debug(`Getting subscriptions for user: ${userId}`);

      const subscriptions = await Subscription.find({ user_id: userObjectId, deleted_at: null })
        .populate('mess_id', 'name code')
        .sort({ createdAt: -1 });

      logger.debug(`Found ${subscriptions.length} subscriptions for user`);

      res.json({
        success: true,
        data: {
          subscriptions: subscriptions
        }
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
      // Convert user_id to ObjectId if it's a string
      const userId = req.user.user_id;
      const userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      // Handle mess_id whether it's a string, ObjectId, or populated object
      const messId = req.user.mess_id?._id || req.user.mess_id;
      const messObjectId = messId && mongoose.Types.ObjectId.isValid(messId)
        ? new mongoose.Types.ObjectId(messId)
        : messId;

      // Use UTC for consistent date comparison with MongoDB
      const today = moment.utc().startOf('day').toDate();

      logger.debug(`Getting active subscription for user: ${userId} (ObjectId: ${userObjectId}), mess: ${messId}, today: ${today}`);

      // First try with both user_id and mess_id
      let subscription = await Subscription.findOne({
        user_id: userObjectId,
        mess_id: messObjectId,
        status: 'active',
        deleted_at: null,
        start_date: { $lte: today },
        end_date: { $gte: today }
      }).populate('mess_id', 'name code');

      // If not found, try without mess_id filter
      if (!subscription) {
        logger.debug('No subscription found with mess filter, trying without...');
        subscription = await Subscription.findOne({
          user_id: userObjectId,
          status: 'active',
          deleted_at: null,
          start_date: { $lte: today },
          end_date: { $gte: today }
        }).populate('mess_id', 'name code');
      }

      // If still not found, try with string comparison as fallback
      if (!subscription) {
        logger.debug('Trying with string user_id...');
        subscription = await Subscription.findOne({
          user_id: userId,
          status: 'active',
          deleted_at: null,
          start_date: { $lte: today },
          end_date: { $gte: today }
        }).populate('mess_id', 'name code');
      }

      if (!subscription) {
        logger.debug('No active subscription found for user');
        return res.json({
          success: true,
          data: null,
          message: 'No active subscription found'
        });
      }

      logger.debug(`Found active subscription: ${subscription._id}`);
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
    try {
      const {
        user_id,
        mess_id,
        plan_id,
        plan_type,
        start_date,
        end_date,
        status,
        payment_id,
        payment_status,
        payment_method,
        meal_plan,
        sub_type,
        amount: providedAmount,
        meals_included,
        auto_renewal,
        special_requirements,
        notes
      } = req.body;

      // Check if user exists
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Mess boundary check for mess_admin
      if (req.user.role === 'mess_admin') {
        // mess_admin can only create subscriptions for users in their own mess
        if (user.mess_id.toString() !== req.user.mess_id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only create subscriptions for users in your own mess'
          });
        }

        // mess_admin cannot specify a different mess_id
        if (mess_id && mess_id !== req.user.mess_id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only create subscriptions for your own mess'
          });
        }
      }

      // Use mess_id from request or user's mess_id
      const subscriptionMessId = mess_id || user.mess_id;

      // Check for existing active subscription
      const today = moment.utc().startOf('day').toDate();
      const existingSubscription = await Subscription.findOne({
        user_id,
        mess_id: subscriptionMessId,
        status: 'active',
        end_date: { $gte: today }
      });

      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'User already has an active subscription for this mess'
        });
      }

      // Prepare subscription data
      const subscriptionData = {
        user_id,
        mess_id: subscriptionMessId,
        start_date: start_date || moment().format('YYYY-MM-DD'),
        status: status || 'active'
      };

      // Handle plan_type (old model) or end_date (new model)
      if (plan_type) {
        // Old model: calculate end date based on plan type
        const startMoment = moment(start_date || undefined);
        let calculatedEndDate;
        let amount;

        switch (plan_type) {
          case 'weekly':
            calculatedEndDate = startMoment.clone().add(7, 'days');
            amount = 700;
            break;
          case 'monthly':
            calculatedEndDate = startMoment.clone().add(1, 'month');
            amount = 3000;
            break;
          case 'quarterly':
            calculatedEndDate = startMoment.clone().add(3, 'months');
            amount = 8500;
            break;
          case 'yearly':
            calculatedEndDate = startMoment.clone().add(1, 'year');
            amount = 30000;
            break;
          default:
            return res.status(400).json({
              success: false,
              message: 'Invalid plan type'
            });
        }

        subscriptionData.plan_type = plan_type;
        subscriptionData.end_date = calculatedEndDate.format('YYYY-MM-DD');
        subscriptionData.amount = amount;
      } else if (end_date) {
        // New model: use provided end_date
        subscriptionData.end_date = end_date;
        subscriptionData.plan_type = 'monthly'; // Default plan_type for model requirement

        // Calculate amount based on duration
        const startMoment = moment(start_date || undefined);
        const endMoment = moment(end_date);
        const durationDays = endMoment.diff(startMoment, 'days');

        // Simple pricing: ₹100 per day
        subscriptionData.amount = Math.max(durationDays * 100, 100); // Minimum ₹100
      } else {
        // Default to 30 days if no plan_type or end_date provided
        subscriptionData.end_date = moment(start_date || undefined).add(30, 'days').format('YYYY-MM-DD');
        subscriptionData.plan_type = 'monthly';
        subscriptionData.amount = 3000; // Default monthly amount
      }

      // Override calculated amount if provided
      if (providedAmount) {
        subscriptionData.amount = providedAmount;
      }

      // Add optional fields
      if (plan_id) subscriptionData.plan_id = plan_id;
      if (sub_type) subscriptionData.sub_type = sub_type;
      if (meal_plan) subscriptionData.meal_plan = meal_plan;
      if (meals_included) subscriptionData.meals_included = meals_included;
      if (auto_renewal !== undefined) subscriptionData.auto_renewal = auto_renewal;
      if (special_requirements) subscriptionData.special_requirements = special_requirements;
      if (notes) subscriptionData.notes = notes;

      // Handle payment status - if status is 'active', payment should be 'paid'
      if (payment_status) {
        subscriptionData.payment_status = payment_status;
      } else if (status === 'active') {
        // If admin sets status to active, assume payment is done
        subscriptionData.payment_status = 'paid';
      }

      if (payment_method) subscriptionData.payment_method = payment_method;
      if (payment_id) {
        subscriptionData.payment_id = payment_id;
        subscriptionData.payment_status = 'paid';
      }

      const subscription = await Subscription.create(subscriptionData);

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update subscription
  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get subscription first to check mess ownership
      const existingSubscription = await Subscription.findById(id);

      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Mess boundary check for mess_admin
      if (req.user.role === 'mess_admin' &&
          existingSubscription.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update subscriptions from your own mess'
        });
      }

      // Update subscription
      const subscription = await Subscription.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

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

      // Get subscription first to check mess ownership
      const existingSubscription = await Subscription.findById(id);

      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Mess boundary check for mess_admin
      if (req.user.role === 'mess_admin' &&
          existingSubscription.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel subscriptions from your own mess'
        });
      }

      const subscription = await Subscription.findByIdAndUpdate(
        id,
        { status: 'cancelled' },
        { new: true }
      );

      logger.info(`Subscription ${id} cancelled by ${req.user.role}: ${req.user.user_id}`);

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
      const today = moment.utc().startOf('day').toDate();

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
      const today = moment.utc().startOf('day').toDate();

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
