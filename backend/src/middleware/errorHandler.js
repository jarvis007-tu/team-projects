const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode, message, isOperational } = err;
  
  statusCode = statusCode || 500;
  
  // Log error
  logger.error({
    error: err,
    request: req.url,
    method: req.method,
    ip: req.ip,
    statusCode,
    user: req.user?.user_id
  });

  // Handle specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error: ' + Object.values(err.errors).map(e => e.message).join(', ');
  }

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation Error: ' + err.errors.map(e => e.message).join(', ');
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate entry: ' + err.errors.map(e => e.message).join(', ');
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Foreign key constraint error';
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File size too large';
  }

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message,
        stack: err.stack,
        raw: err
      }
    });
  } else {
    // Production error response
    if (!isOperational) {
      message = 'Internal server error';
    }
    
    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFound
};