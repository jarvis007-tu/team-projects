const { mongoose } = require('../config/mongodb');
const logger = require('../utils/logger');

// Import all models
const User = require('./User');
const Subscription = require('./Subscription');
const Attendance = require('./Attendance');
const WeeklyMenu = require('./WeeklyMenu');
const MealConfirmation = require('./MealConfirmation');
const Notification = require('./Notification');

// Export all models
module.exports = {
  mongoose,
  User,
  Subscription,
  Attendance,
  WeeklyMenu,
  MealConfirmation,
  Notification
};
