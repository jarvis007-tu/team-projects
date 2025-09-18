const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./database.config');

// Select environment config
const env = process.env.NODE_ENV || 'development';
const { uri, options } = config[env];

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(uri, options);
    logger.info(`MongoDB connected successfully to ${uri}`);
    return true;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    return false;
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

// Handle process termination gracefully
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};




// const { Sequelize } = require('sequelize');
// const logger = require('../utils/logger');

// // Database configuration
// let sequelize;

// if (process.env.DB_DIALECT === 'sqlite') {
//   // SQLite configuration for development
//   sequelize = new Sequelize({
//     dialect: 'sqlite',
//     storage: process.env.DB_STORAGE || './database.sqlite',
//     logging: process.env.NODE_ENV === 'development' ? 
//       (msg) => logger.debug(msg) : false,
//     define: {
//       timestamps: true,
//       underscored: false,
//       freezeTableName: true,
//       paranoid: true // Soft deletes
//     }
//   });
// } else {
//   // MySQL configuration for production
//   const config = {
//     host: process.env.DB_HOST || 'localhost',
//     port: process.env.DB_PORT || 3306,
//     database: process.env.DB_NAME || 'hostel_mess_db',
//     username: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || '',
//     dialect: process.env.DB_DIALECT || 'mysql',
//     timezone: '+05:30', // IST
//     logging: process.env.NODE_ENV === 'development' ? 
//       (msg) => logger.debug(msg) : false,
//     pool: {
//       max: parseInt(process.env.DB_POOL_MAX) || 10,
//       min: parseInt(process.env.DB_POOL_MIN) || 2,
//       acquire: 30000,
//       idle: 10000
//     },
//     dialectOptions: {
//       connectTimeout: 60000,
//       dateStrings: true,
//       typeCast: (field, next) => {
//         if (field.type === 'DATETIME') {
//           return field.string();
//         }
//         return next();
//       }
//     },
//     define: {
//       timestamps: true,
//       underscored: false,
//       freezeTableName: true,
//       paranoid: true // Soft deletes
//     }
//   };

//   sequelize = new Sequelize(
//     config.database,
//     config.username,
//     config.password,
//     config
//   );
// }

// // Test connection
// const testConnection = async () => {
//   try {
//     await sequelize.authenticate();
//     logger.info('Database connection established successfully');
//     return true;
//   } catch (error) {
//     logger.error('Unable to connect to the database:', error);
//     return false;
//   }
// };

// // Export database connection
// module.exports = {
//   sequelize,
//   Sequelize,
//   testConnection
// };