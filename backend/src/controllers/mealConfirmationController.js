const { Op } = require('sequelize');
const moment = require('moment');
const User = require('../models/User');
const MealConfirmation = require('../models/MealConfirmation');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

class MealConfirmationController {
  // Confirm meal attendance
  async confirmMeal(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.id;
      const { meal_date, meal_type } = req.body;

      // Validate meal date (should be today or future)
      const mealMoment = moment(meal_date);
      if (mealMoment.isBefore(moment().startOf('day'))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot confirm meals for past dates'
        });
      }

      // Check active subscription
      const subscription = await Subscription.findOne({
        where: {
          user_id: userId,
          status: 'active',
          start_date: { [Op.lte]: meal_date },
          end_date: { [Op.gte]: meal_date }
        }
      });

      if (!subscription) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'No active subscription for the selected date'
        });
      }

      // Check if already confirmed
      const existingConfirmation = await MealConfirmation.findOne({
        where: {
          user_id: userId,
          meal_date,
          meal_type
        }
      });

      if (existingConfirmation) {
        if (existingConfirmation.status === 'confirmed') {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Meal already confirmed'
          });
        } else if (existingConfirmation.status === 'cancelled') {
          // Reconfirm cancelled meal
          await existingConfirmation.update({
            status: 'confirmed',
            confirmed_at: new Date()
          }, { transaction });

          await transaction.commit();
          return res.json({
            success: true,
            message: 'Meal reconfirmed successfully',
            data: existingConfirmation
          });
        }
      }

      // Create new confirmation
      const confirmation = await MealConfirmation.create({
        user_id: userId,
        meal_date,
        meal_type,
        status: 'confirmed'
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Meal confirmed successfully',
        data: confirmation
      });
    } catch (error) {
      await transaction.rollback();
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
        where: {
          confirmation_id,
          user_id: userId
        }
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

      await confirmation.update({
        status: 'cancelled',
        cancelled_at: new Date()
      });

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

      const whereConditions = { user_id: userId };
      
      if (start_date && end_date) {
        whereConditions.meal_date = {
          [Op.between]: [start_date, end_date]
        };
      } else {
        // Default to next 7 days
        whereConditions.meal_date = {
          [Op.between]: [
            moment().format('YYYY-MM-DD'),
            moment().add(7, 'days').format('YYYY-MM-DD')
          ]
        };
      }

      if (status) whereConditions.status = status;

      const confirmations = await MealConfirmation.findAll({
        where: whereConditions,
        order: [['meal_date', 'ASC'], ['meal_type', 'ASC']]
      });

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

      const whereConditions = {
        meal_date: date || moment().format('YYYY-MM-DD')
      };

      if (meal_type) whereConditions.meal_type = meal_type;

      const confirmations = await MealConfirmation.findAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        }],
        order: [['meal_type', 'ASC'], ['confirmed_at', 'ASC']]
      });

      // Get summary
      const summary = await MealConfirmation.findAll({
        attributes: [
          'meal_type',
          'status',
          [sequelize.fn('COUNT', sequelize.col('confirmation_id')), 'count']
        ],
        where: { meal_date: date || moment().format('YYYY-MM-DD') },
        group: ['meal_type', 'status']
      });

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
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.id;
      const { start_date, end_date, meal_types } = req.body;

      // Validate dates
      if (moment(start_date).isBefore(moment().startOf('day'))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      // Check active subscription for the period
      const subscription = await Subscription.findOne({
        where: {
          user_id: userId,
          status: 'active',
          start_date: { [Op.lte]: end_date },
          end_date: { [Op.gte]: start_date }
        }
      });

      if (!subscription) {
        await transaction.rollback();
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
            where: {
              user_id: userId,
              meal_date: date,
              meal_type
            }
          });

          if (!existing) {
            confirmations.push({
              user_id: userId,
              meal_date: date,
              meal_type,
              status: 'confirmed',
              confirmed_at: new Date()
            });
          }
        }
      }

      if (confirmations.length > 0) {
        await MealConfirmation.bulkCreate(confirmations, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `${confirmations.length} meals confirmed successfully`
      });
    } catch (error) {
      await transaction.rollback();
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
      const { start_date, end_date } = req.query;

      const whereConditions = {};
      if (start_date && end_date) {
        whereConditions.meal_date = {
          [Op.between]: [start_date, end_date]
        };
      } else {
        // Default to current week
        whereConditions.meal_date = {
          [Op.between]: [
            moment().startOf('week').format('YYYY-MM-DD'),
            moment().endOf('week').format('YYYY-MM-DD')
          ]
        };
      }

      // Get stats by meal type
      const byMealType = await MealConfirmation.findAll({
        attributes: [
          'meal_type',
          [sequelize.fn('COUNT', sequelize.col('confirmation_id')), 'total'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END")), 'confirmed'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'attended' THEN 1 ELSE 0 END")), 'attended']
        ],
        where: whereConditions,
        group: ['meal_type']
      });

      // Get daily trend
      const dailyTrend = await MealConfirmation.findAll({
        attributes: [
          'meal_date',
          [sequelize.fn('COUNT', sequelize.col('confirmation_id')), 'count']
        ],
        where: {
          ...whereConditions,
          status: 'confirmed'
        },
        group: ['meal_date'],
        order: [['meal_date', 'ASC']]
      });

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