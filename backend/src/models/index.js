const { sequelize, Sequelize } = require('../config/database');
const User = require('./User');
const Subscription = require('./Subscription');
const Attendance = require('./Attendance');
const WeeklyMenu = require('./WeeklyMenu');
const MealConfirmation = require('./MealConfirmation');
const Notification = require('./Notification');
const logger = require('../utils/logger');

// Define relationships
const defineRelationships = () => {
  // User -> Subscriptions (One to Many)
  User.hasMany(Subscription, {
    foreignKey: 'user_id',
    as: 'subscriptions',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  Subscription.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // User -> Attendance (One to Many)
  User.hasMany(Attendance, {
    foreignKey: 'user_id',
    as: 'attendances',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  Attendance.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // Subscription -> Attendance (One to Many)
  Subscription.hasMany(Attendance, {
    foreignKey: 'subscription_id',
    as: 'attendances',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  Attendance.belongsTo(Subscription, {
    foreignKey: 'subscription_id',
    as: 'subscription'
  });

  // User -> WeeklyMenu (Created By)
  User.hasMany(WeeklyMenu, {
    foreignKey: 'created_by',
    as: 'created_menus',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  WeeklyMenu.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  // User -> MealConfirmation (One to Many)
  User.hasMany(MealConfirmation, {
    foreignKey: 'user_id',
    as: 'meal_confirmations',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  MealConfirmation.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // User -> Notification (One to Many)
  User.hasMany(Notification, {
    foreignKey: 'user_id',
    as: 'notifications',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  Notification.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  logger.info('Database relationships defined successfully');
};

// Initialize relationships
defineRelationships();

// Sync database (only in development)
const syncDatabase = async (force = false) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force, alter: !force });
      logger.info(`Database synchronized ${force ? 'with force' : 'without force'}`);
    }
  } catch (error) {
    logger.error('Database sync error:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  User,
  Subscription,
  Attendance,
  WeeklyMenu,
  MealConfirmation,
  Notification,
  syncDatabase
};