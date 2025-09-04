require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { sequelize } = require('./config/database');
const { redisClient } = require('./config/redis-optional');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const routes = require('./routes');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async initialize() {
    try {
      await this.setupDatabase();
      await this.setupRedis();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
      await this.start();
    } catch (error) {
      logger.error('Server initialization failed:', error);
      process.exit(1);
    }
  }

  async setupDatabase() {
    try {
      await sequelize.authenticate();
      logger.info('Database connected successfully');
      
      if (!this.isProduction) {
        // Use force: false to avoid recreating tables
        // This prevents backup table issues with unique constraints
        await sequelize.sync({ force: false });
        logger.info('Database synchronized');
      }
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async setupRedis() {
    try {
      await redisClient.connect();
    } catch (error) {
      logger.warn('Redis setup failed, continuing without Redis:', error.message);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    const corsOptions = {
      origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || !origin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200
    };
    this.app.use(cors(corsOptions));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
      max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.'
        });
      }
    });
    this.app.use('/api/', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http({
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip
        });
      });
      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  setupRoutes() {
    // API versioning
    this.app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);

    // Graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    
    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
  }

  async start() {
    this.server = this.app.listen(this.port, () => {
      logger.info(`Server running on port ${this.port} in ${process.env.NODE_ENV} mode`);
      logger.info(`API URL: ${process.env.SERVER_URL}/api/${process.env.API_VERSION}`);
    });
  }

  async gracefulShutdown() {
    logger.info('Graceful shutdown initiated...');
    
    // Stop accepting new connections
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    // Close database connections
    try {
      await sequelize.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database:', error);
    }

    // Close Redis connection
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis:', error);
    }

    process.exit(0);
  }
}

// Initialize and start server
const server = new Server();
server.initialize();