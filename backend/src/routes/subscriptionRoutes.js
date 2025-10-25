const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateSubscriptionCreate, validateSubscriptionUpdate } = require('../validators/subscriptionValidator');

// Admin routes
router.get('/', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.getAllSubscriptions);
router.get('/all', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.getAllSubscriptions);
router.get('/stats', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.getSubscriptionStats);
router.post('/update-expired', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.updateExpiredSubscriptions);

// Plans and analytics (must come before /:id routes)
router.get('/plans', authenticate, subscriptionController.getSubscriptionPlans);
router.get('/analytics', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.getSubscriptionAnalytics);
router.get('/export', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.exportSubscriptions);

// User routes
router.get('/my-subscriptions', authenticate, subscriptionController.getUserSubscriptions);
router.get('/active', authenticate, subscriptionController.getActiveSubscription);
router.get('/user/:userId', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.getUserSubscriptions);
router.get('/:id', authenticate, subscriptionController.getSubscriptionById);

// Subscription management
router.post('/', authenticate, authorize('super_admin', 'mess_admin'), validateSubscriptionCreate, subscriptionController.createSubscription);
router.put('/:id', authenticate, authorize('super_admin', 'mess_admin'), validateSubscriptionUpdate, subscriptionController.updateSubscription);
router.delete('/:id', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.deleteSubscription);
router.post('/:id/cancel', authenticate, subscriptionController.cancelSubscription);
router.post('/:id/renew', authenticate, subscriptionController.renewSubscription);

// Bulk operations
router.patch('/bulk', authenticate, authorize('super_admin', 'mess_admin'), subscriptionController.bulkUpdateSubscriptions);

module.exports = router;