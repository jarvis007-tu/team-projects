const moment = require('moment');
const mongoose = require('mongoose');
const User = require('../models/User');
const MealConfirmation = require('../models/MealConfirmation');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

class MealConfirmationController {
  // Confirm meal attendance
  async confirmMeal(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user.id;
      const { meal_date, meal_type } = req.body;
      const userMessId = req.user.mess_id; // Get user's mess_id

      // Validate meal date (should be today or future)
      const mealMoment = moment(meal_date);
      if (mealMoment.isBefore(moment().startOf('day'))) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Cannot confirm meals for past dates'
        });
      }

      // Check active subscription for user's mess
      const subscription = await Subscription.findOne({
        user_id: userId,
        mess_id: userMessId, // Filter by user's mess
        status: 'active',
        start_date: { $lte: meal_date },
        end_date: { $gte: meal_date }
      });

      if (!subscription) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: 'No active subscription for the selected date'
        });
      }

      // Check if already confirmed (with mess_id)
      const existingConfirmation = await MealConfirmation.findOne({
        user_id: userId,
        mess_id: userMessId,
        meal_date,
        meal_type
      });

      if (existingConfirmation) {
        if (existingConfirmation.status === 'confirmed') {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Meal already confirmed'
          });
        } else if (existingConfirmation.status === 'cancelled') {
          // Reconfirm cancelled meal
          existingConfirmation.status = 'confirmed';
          existingConfirmation.confirmed_at = new Date();
          await existingConfirmation.save({ session });

          await session.commitTransaction();
          session.endSession();
          return res.json({
            success: true,
            message: 'Meal reconfirmed successfully',
            data: existingConfirmation
          });
        }
      }

      // Create new confirmation with mess_id
      const confirmation = await MealConfirmation.create([{
        user_id: userId,
        mess_id: userMessId, // Add mess_id
        meal_date,
        meal_type,
        status: 'confirmed'
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`Meal confirmed for user ${userId}, mess ${userMessId}, date ${meal_date}, type ${meal_type}`);

      res.status(201).json({
        success: true,
        message: 'Meal confirmed successfully',
        data: confirmation[0]
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error confirming meal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm meal'
      });
    }
  }

  // Cancel meal confirmation
  async cancelMeal(req, res) {
    try {
      const userId = req.user.id;
      const { confirmation_id } = req.params;

      const confirmation = await MealConfirmation.findOne({
        _id: confirmation_id,
        user_id: userId
      });

      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: 'Confirmation not found'
        });
      }

      // Check if meal time has passed
      const mealDateTime = moment(`${confirmation.meal_date} ${getMealTime(confirmation.meal_type)}`);
      if (mealDateTime.isBefore(moment())) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel past meals'
        });
      }

      // Check cancellation window (e.g., 2 hours before meal)
      const cancellationDeadline = mealDateTime.clone().subtract(2, 'hours');
      if (moment().isAfter(cancellationDeadline)) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation deadline has passed (2 hours before meal)'
        });
      }

      confirmation.status = 'cancelled';
      confirmation.cancelled_at = new Date();
      await confirmation.save();

      res.json({
        success: true,
        message: 'Meal cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling meal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel meal'
      });
    }
  }

  // Get user's meal confirmations
  async getUserConfirmations(req, res) {
    try {
      const userId = req.user.id;
      const { start_date, end_date, status } = req.query;

      const queryConditions = { user_id: userId };

      if (start_date && end_date) {
        queryConditions.meal_date = {
          $gte: start_date,
          $lte: end_date
        };
      } else {
        // Default to next 7 days
        queryConditions.meal_date = {
          $gte: moment().format('YYYY-MM-DD'),
          $lte: moment().add(7, 'days').format('YYYY-MM-DD')
        };
      }

      if (status) queryConditions.status = status;

      const confirmations = await MealConfirmation.find(queryConditions)
        .sort({ meal_date: 1, meal_type: 1 });

      res.json({
        success: true,
        data: confirmations
      });
    } catch (error) {
      logger.error('Error fetching user confirmations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meal confirmations'
      });
    }
  }

  // Get all confirmations for a date (Admin)
  async getDateConfirmations(req, res) {
    try {
      const { date, meal_type } = req.query;

      const queryConditions = {
        meal_date: date || moment().format('YYYY-MM-DD')
      };

      // Mess filtering for mess_admin
      if (req.user.role === 'mess_admin') {
        queryConditions.mess_id = req.user.mess_id;
      }

      if (meal_type) queryConditions.meal_type = meal_type;

      const confirmations = await MealConfirmation.find(queryConditions)
        .populate('user_id', 'full_name email phone')
        .sort({ meal_type: 1, confirmed_at: 1 });

      // Get summary with mess filtering
      const summaryMatch = { meal_date: date || moment().format('YYYY-MM-DD') };
      if (req.user.role === 'mess_admin') {
        summaryMatch.mess_id = req.user.mess_id;
      }

      const summary = await MealConfirmation.aggregate([
        { $match: summaryMatch },
        { $group: { _id: { meal_type: '$meal_type', status: '$status' }, count: { $sum: 1 } } },
        { $project: { meal_type: '$_id.meal_type', status: '$_id.status', count: 1, _id: 0 } }
      ]);

      res.json({
        success: true,
        data: {
          date: date || moment().format('YYYY-MM-DD'),
          confirmations,
          summary
        }
      });
    } catch (error) {
      logger.error('Error fetching date confirmations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch confirmations'
      });
    }
  }

  // Bulk confirm meals for week
  async bulkConfirmMeals(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user.id;
      const userMessId = req.user.mess_id;
      const { start_date, end_date, meal_types } = req.body;

      // Validate dates
      if (moment(start_date).isBefore(moment().startOf('day'))) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      // Check active subscription for the period
      const subscription = await Subscription.findOne({
        user_id: userId,
        status: 'active',
        start_date: { $lte: end_date },
        end_date: { $gte: start_date }
      });

      if (!subscription) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: 'No active subscription for the selected period'
        });
      }

      // Generate dates between start and end
      const dates = [];
      const currentDate = moment(start_date);
      const endMoment = moment(end_date);

      while (currentDate.isSameOrBefore(endMoment)) {
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate.add(1, 'day');
      }

      // Create confirmations
      const confirmations = [];
      for (const date of dates) {
        for (const meal_type of meal_types) {
          // Check if already exists
          const existing = await MealConfirmation.findOne({
            user_id: userId,
            meal_date: date,
            meal_type
          });

          if (!existing) {
            confirmations.push({
              user_id: userId,
              mess_id: userMessId,
              meal_date: date,
              meal_type,
              status: 'confirmed',
              confirmed_at: new Date()
            });
          }
        }
      }

      if (confirmations.length > 0) {
        await MealConfirmation.insertMany(confirmations, { session });
      }

      await session.commitTransaction();
      session.endSession();

      logger.info(`Bulk meal confirmations created: ${confirmations.length} for user ${userId} in mess ${userMessId}`);

      res.json({
        success: true,
        message: `${confirmations.length} meals confirmed successfully`
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error bulk confirming meals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk confirm meals'
      });
    }
  }

  // Get confirmation statistics
  async getConfirmationStats(req, res) {
    try {
      const { start_date, end_date, mess_id } = req.query;

      const queryConditions = {};
      if (start_date && end_date) {
        queryConditions.meal_date = {
          $gte: start_date,
          $lte: end_date
        };
      } else {
        // Default to current week
        queryConditions.meal_date = {
          $gte: moment().startOf('week').format('YYYY-MM-DD'),
          $lte: moment().endOf('week').format('YYYY-MM-DD')
        };
      }

      // Add mess filtering based on user role
      if (req.user.role === 'super_admin') {
        // Super admin can view all messes or filter by specific mess
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        // Mess admin and subscribers can only view their own mess stats
        queryConditions.mess_id = req.user.mess_id;
      }

      // Get stats by meal type
      const byMealType = await MealConfirmation.aggregate([
        { $match: queryConditions },
        {
          $group: {
            _id: '$meal_type',
            total: { $sum: 1 },
            confirmed: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            attended: {
              $sum: { $cond: [{ $eq: ['$status', 'attended'] }, 1, 0] }
            }
          }
        },
        { $project: { meal_type: '$_id', total: 1, confirmed: 1, cancelled: 1, attended: 1, _id: 0 } }
      ]);

      // Get daily trend
      const dailyTrend = await MealConfirmation.aggregate([
        { $match: { ...queryConditions, status: 'confirmed' } },
        { $group: { _id: '$meal_date', count: { $sum: 1 } } },
        { $project: { meal_date: '$_id', count: 1, _id: 0 } },
        { $sort: { meal_date: 1 } }
      ]);

      res.json({
        success: true,
        data: {
          byMealType,
          dailyTrend
        }
      });
    } catch (error) {
      logger.error('Error fetching confirmation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch confirmation statistics'
      });
    }
  }
}

// Helper function to get meal times
function getMealTime(mealType) {
  const mealTimes = {
    breakfast: '08:00:00',
    lunch: '13:00:00',
    dinner: '20:00:00'
  };
  return mealTimes[mealType] || '12:00:00';
}

module.exports = new MealConfirmationController();
