const { mongoose } = require('../config/mongodb');
const logger = require('../utils/logger');

// Import all models
const Mess = require('./Mess');
const User = require('./User');
const Subscription = require('./Subscription');
const Attendance = require('./Attendance');
const WeeklyMenu = require('./WeeklyMenu');
const MenuItem = require('./MenuItem');
const MenuCategory = require('./MenuCategory');
const MenuTemplate = require('./MenuTemplate');
const MealConfirmation = require('./MealConfirmation');
const Notification = require('./Notification');
const Biometric = require('./Biometric');

// Export all models
module.exports = {
  mongoose,
  Mess,
  User,
  Subscription,
  Attendance,
  WeeklyMenu,
  MenuItem,
  MenuCategory,
  MenuTemplate,
  MealConfirmation,
  Notification,
  Biometric
};
