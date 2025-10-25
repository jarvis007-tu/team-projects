const logger = require('./logger');

/**
 * Add mess filter to query based on user role
 * @param {Object} filter - Existing query filter
 * @param {Object} user - User object from req.user
 * @param {String} messIdFromQuery - Optional mess_id from query parameters
 * @returns {Object} Updated filter with mess_id
 */
function addMessFilter(filter, user, messIdFromQuery = null) {
  if (!user) {
    return filter;
  }

  // Super admin can view all messes or filter by specific mess
  if (user.role === 'super_admin') {
    if (messIdFromQuery) {
      filter.mess_id = messIdFromQuery;
    }
    // If no mess_id provided, don't add filter (view all)
  } else {
    // Mess admin and subscribers can only see their own mess data
    filter.mess_id = user.mess_id;
  }

  return filter;
}

/**
 * Validate if user has access to a specific mess
 * @param {Object} user - User object from req.user
 * @param {String} targetMessId - The mess_id to validate access to
 * @returns {Boolean} True if user has access
 */
function canAccessMess(user, targetMessId) {
  if (!user || !targetMessId) {
    return false;
  }

  // Super admin can access any mess
  if (user.role === 'super_admin') {
    return true;
  }

  // Other roles can only access their own mess
  return user.mess_id && user.mess_id.toString() === targetMessId.toString();
}

/**
 * Get mess_id to use for creating new records
 * @param {Object} user - User object from req.user
 * @param {String} requestedMessId - mess_id from request body/params
 * @returns {String} The mess_id to use
 * @throws {Error} If mess_id cannot be determined
 */
function getMessIdForCreation(user, requestedMessId = null) {
  if (!user) {
    throw new Error('User is required');
  }

  // Super admin must specify mess_id
  if (user.role === 'super_admin') {
    if (!requestedMessId) {
      throw new Error('Mess selection is required for super admin');
    }
    return requestedMessId;
  }

  // Mess admin and subscribers use their assigned mess
  if (!user.mess_id) {
    throw new Error('User is not assigned to any mess');
  }

  // Validate that mess_admin isn't trying to create for different mess
  if (user.role === 'mess_admin' && requestedMessId &&
      requestedMessId !== user.mess_id.toString()) {
    throw new Error('You can only create records for your own mess');
  }

  return user.mess_id;
}

/**
 * Build aggregation match stage with mess filtering
 * @param {Object} user - User object from req.user
 * @param {Object} additionalMatch - Additional match conditions
 * @param {String} messIdFromQuery - Optional mess_id from query
 * @returns {Object} MongoDB aggregation $match stage
 */
function buildMessMatchStage(user, additionalMatch = {}, messIdFromQuery = null) {
  const match = { ...additionalMatch };
  return addMessFilter(match, user, messIdFromQuery);
}

/**
 * Validate mess exists and user has access
 * @param {Model} Mess - Mess model
 * @param {String} messId - The mess_id to validate
 * @param {Object} user - User object from req.user
 * @returns {Promise<Object>} The mess document
 * @throws {Error} If mess not found or user doesn't have access
 */
async function validateMessAccess(Mess, messId, user) {
  if (!messId) {
    throw new Error('Mess ID is required');
  }

  const mess = await Mess.findOne({ _id: messId, deleted_at: null });

  if (!mess) {
    throw new Error('Mess not found or has been deleted');
  }

  if (!canAccessMess(user, messId)) {
    throw new Error('You do not have permission to access this mess');
  }

  return mess;
}

/**
 * Get user's mess or validate requested mess
 * @param {Model} Mess - Mess model
 * @param {Object} user - User object from req.user
 * @param {String} requestedMessId - Optional mess_id from request
 * @returns {Promise<Object>} The mess document
 * @throws {Error} If mess not found or user doesn't have access
 */
async function getUserMess(Mess, user, requestedMessId = null) {
  const messId = user.role === 'super_admin' && requestedMessId
    ? requestedMessId
    : user.mess_id;

  if (!messId) {
    throw new Error('Mess ID not available');
  }

  return validateMessAccess(Mess, messId, user);
}

module.exports = {
  addMessFilter,
  canAccessMess,
  getMessIdForCreation,
  buildMessMatchStage,
  validateMessAccess,
  getUserMess
};
