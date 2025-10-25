const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection configuration
class MongoDBConnection {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db';

      const options = {
        maxPoolSize: parseInt(process.env.DB_POOL_MAX) || 10,
        minPoolSize: parseInt(process.env.DB_POOL_MIN) || 2,
        serverSelectionTimeoutMS: 60000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
        retryWrites: true,
        w: 'majority'
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoURI, options);

      logger.info('MongoDB connected successfully');
      logger.info(`Database: ${this.connection.connection.name}`);

      // Handle connection events
      mongoose.connection.on('connected', () => {
        logger.info('Mongoose connected to MongoDB');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('Mongoose connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Mongoose disconnected from MongoDB');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      if (mongoose.connection.readyState === 1) {
        logger.info('MongoDB connection is active');
        return true;
      } else {
        logger.warn('MongoDB connection is not active');
        return false;
      }
    } catch (error) {
      logger.error('MongoDB connection test failed:', error);
      return false;
    }
  }

  getConnection() {
    return mongoose.connection;
  }
}

// Create singleton instance
const mongoDBConnection = new MongoDBConnection();

// Export
module.exports = {
  connectDB: () => mongoDBConnection.connect(),
  disconnectDB: () => mongoDBConnection.disconnect(),
  testConnection: () => mongoDBConnection.testConnection(),
  getConnection: () => mongoDBConnection.getConnection(),
  mongoose
};
