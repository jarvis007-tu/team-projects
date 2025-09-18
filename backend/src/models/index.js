// models/index.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import models (ensure these files export mongoose models)
const User = require('./User');
const Subscription = require('./Subscription');
const Attendance = require('./Attendance');
const WeeklyMenu = require('./WeeklyMenu');
const MealConfirmation = require('./MealConfirmation');
const Notification = require('./Notification');

/**
 * Exports
 */
const models = {
  User,
  Subscription,
  Attendance,
  WeeklyMenu,
  MealConfirmation,
  Notification
};

/**
 * initializeIndexes - ensure indexes are created for all models
 * @param {boolean} force - if true AND in development: drops collections before creating indexes (similar to sequelize.sync({ force: true }))
 */
async function initializeIndexes(force = false) {
  try {
    const env = process.env.NODE_ENV || 'development';

    if (force && env === 'development') {
      logger.warn('Dropping collections (force=true) in development mode. THIS WILL REMOVE ALL DATA.');
      // Drop each collection if exists
      for (const name of Object.keys(models)) {
        const model = models[name];
        try {
          if (model.collection && (await mongoose.connection.db.listCollections({ name: model.collection.name }).hasNext())) {
            await model.collection.drop();
            logger.info(`Dropped collection: ${model.collection.name}`);
          }
        } catch (err) {
          // Ignore "ns not found" etc
          logger.debug(`Drop collection error for ${name}: ${err.message}`);
        }
      }
    }

    // Ensure indexes for all models
    for (const name of Object.keys(models)) {
      const model = models[name];
      if (model && typeof model.createIndexes === 'function') {
        await model.createIndexes();
        logger.info(`Indexes created for model ${name}`);
      }
    }

    logger.info('All model indexes ensured/created');
    return true;
  } catch (error) {
    logger.error('Error while initializing indexes:', error);
    throw error;
  }
}

/**
 * gracefulIndexInit - helper to call initializeIndexes safely (use in app start)
 */
async function gracefulIndexInit(force = false) {
  try {
    await initializeIndexes(force);
  } catch (err) {
    logger.error('Index initialization failed:', err);
    // in production you may want to exit process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = {
  ...models,
  initializeIndexes,
  gracefulIndexInit
};




// const { sequelize, Sequelize } = require('../config/database');
// const User = require('./User');
// const Subscription = require('./Subscription');
// const Attendance = require('./Attendance');
// const WeeklyMenu = require('./WeeklyMenu');
// const MealConfirmation = require('./MealConfirmation');
// const Notification = require('./Notification');
// const logger = require('../utils/logger');

// // Define relationships
// const defineRelationships = () => {
//   // User -> Subscriptions (One to Many)
//   User.hasMany(Subscription, {
//     foreignKey: 'user_id',
//     as: 'subscriptions',
//     onDelete: 'CASCADE',
//     onUpdate: 'CASCADE'
//   });
//   Subscription.belongsTo(User, {
//     foreignKey: 'user_id',
//     as: 'user'
//   });

//   // User -> Attendance (One to Many)
//   User.hasMany(Attendance, {
//     foreignKey: 'user_id',
//     as: 'attendances',
//     onDelete: 'CASCADE',
//     onUpdate: 'CASCADE'
//   });
//   Attendance.belongsTo(User, {
//     foreignKey: 'user_id',
//     as: 'user'
//   });

//   // Subscription -> Attendance (One to Many)
//   Subscription.hasMany(Attendance, {
//     foreignKey: 'subscription_id',
//     as: 'attendances',
//     onDelete: 'CASCADE',
//     onUpdate: 'CASCADE'
//   });
//   Attendance.belongsTo(Subscription, {
//     foreignKey: 'subscription_id',
//     as: 'subscription'
//   });

//   // User -> WeeklyMenu (Created By)
//   User.hasMany(WeeklyMenu, {
//     foreignKey: 'created_by',
//     as: 'created_menus',
//     onDelete: 'SET NULL',
//     onUpdate: 'CASCADE'
//   });
//   WeeklyMenu.belongsTo(User, {
//     foreignKey: 'created_by',
//     as: 'creator'
//   });

//   // User -> MealConfirmation (One to Many)
//   User.hasMany(MealConfirmation, {
//     foreignKey: 'user_id',
//     as: 'meal_confirmations',
//     onDelete: 'CASCADE',
//     onUpdate: 'CASCADE'
//   });
//   MealConfirmation.belongsTo(User, {
//     foreignKey: 'user_id',
//     as: 'user'
//   });

//   // User -> Notification (One to Many)
//   User.hasMany(Notification, {
//     foreignKey: 'user_id',
//     as: 'notifications',
//     onDelete: 'CASCADE',
//     onUpdate: 'CASCADE'
//   });
//   Notification.belongsTo(User, {
//     foreignKey: 'user_id',
//     as: 'user'
//   });

//   logger.info('Database relationships defined successfully');
// };

// // Initialize relationships
// defineRelationships();

// // Sync database (only in development)
// const syncDatabase = async (force = false) => {
//   try {
//     if (process.env.NODE_ENV === 'development') {
//       await sequelize.sync({ force, alter: !force });
//       logger.info(`Database synchronized ${force ? 'with force' : 'without force'}`);
//     }
//   } catch (error) {
//     logger.error('Database sync error:', error);
//     throw error;
//   }
// };

// module.exports = {
//   sequelize,
//   Sequelize,
//   User,
//   Subscription,
//   Attendance,
//   WeeklyMenu,
//   MealConfirmation,
//   Notification,
//   syncDatabase
// };