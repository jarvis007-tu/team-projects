const Mess = require('../models/Mess');
const logger = require('../utils/logger');

/**
 * Middleware to extract and validate mess context
 * Automatically adds mess_id to req based on user's mess or query parameter
 */
const extractMessContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    let messId = null;

    // Super admin can work across all messes
    if (req.user.role === 'super_admin') {
      // Check if mess_id is provided in query or body
      messId = req.query.mess_id || req.body.mess_id || req.params.mess_id;

      // If no mess_id provided, don't set context (allows viewing all messes)
      if (messId) {
        req.messContext = {
          mess_id: messId,
          isSuperAdmin: true
        };
      } else {
        req.messContext = {
          mess_id: null,
          isSuperAdmin: true,
          viewAllMesses: true
        };
      }
    } else {
      // Mess admin and subscribers must use their assigned mess
      messId = req.user.mess_id;

      if (!messId) {
        return res.status(403).json({
          success: false,
          message: 'User is not assigned to any mess'
        });
      }

      req.messContext = {
        mess_id: messId,
        isSuperAdmin: false,
        isMessAdmin: req.user.role === 'mess_admin'
      };
    }

    // Validate mess exists if mess_id is set
    if (messId) {
      const mess = await Mess.findOne({ _id: messId, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found or has been deleted'
        });
      }

      if (mess.status !== 'active' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Mess is not active'
        });
      }

      req.messContext.mess = mess;
    }

    logger.debug(`Mess context set for user ${req.user.user_id}: ${JSON.stringify(req.messContext)}`);
    next();
  } catch (error) {
    logger.error('Error extracting mess context:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to extract mess context'
    });
  }
};

/**
 * Middleware to ensure user can only access their own mess data
 * Prevents cross-mess data access
 */
const enforceMessBoundary = (req, res, next) => {
  try {
    if (!req.user || !req.messContext) {
      return res.status(401).json({
        success: false,
        message: 'Authentication and mess context required'
      });
    }

    // Super admin can access any mess
    if (req.messContext.isSuperAdmin) {
      return next();
    }

    // Extract mess_id from params, query, or body
    const requestedMessId = req.params.mess_id || req.query.mess_id || req.body.mess_id;

    // If a specific mess_id is requested, ensure it matches user's mess
    if (requestedMessId && requestedMessId !== req.user.mess_id.toString()) {
      logger.warn(`User ${req.user.user_id} attempted to access mess ${requestedMessId} but belongs to ${req.user.mess_id}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this mess'
      });
    }

    next();
  } catch (error) {
    logger.error('Error enforcing mess boundary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to enforce mess boundary'
    });
  }
};

/**
 * Helper function to add mess filter to database queries
 */
const addMessFilter = (filter, req) => {
  if (!req.messContext) {
    return filter;
  }

  // If super admin viewing all messes, don't add filter
  if (req.messContext.viewAllMesses) {
    return filter;
  }

  // Add mess_id filter
  if (req.messContext.mess_id) {
    filter.mess_id = req.messContext.mess_id;
  }

  return filter;
};

/**
 * Middleware to automatically inject mess_id into create/update operations
 */
const injectMessId = (req, res, next) => {
  try {
    if (!req.messContext || !req.messContext.mess_id) {
      // Skip if no mess context (super admin creating mess, etc.)
      return next();
    }

    // For create operations, inject mess_id into body
    if (req.method === 'POST' && !req.body.mess_id) {
      req.body.mess_id = req.messContext.mess_id;
    }

    next();
  } catch (error) {
    logger.error('Error injecting mess_id:', error);
    next(error);
  }
};

module.exports = {
  extractMessContext,
  enforceMessBoundary,
  addMessFilter,
  injectMessId
};
