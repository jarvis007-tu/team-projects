const express = require('express');
const router = express.Router();
const mealConfirmationController = require('../controllers/mealConfirmationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateMealConfirmation, validateBulkConfirmation } = require('../validators/mealConfirmationValidator');

// User routes
router.post('/confirm', authenticate, validateMealConfirmation, mealConfirmationController.confirmMeal);
router.put('/:confirmation_id/cancel', authenticate, mealConfirmationController.cancelMeal);
router.get('/my-confirmations', authenticate, mealConfirmationController.getUserConfirmations);
router.post('/bulk-confirm', authenticate, validateBulkConfirmation, mealConfirmationController.bulkConfirmMeals);

// Admin routes
router.get('/date-confirmations', authenticate, authorize('super_admin', 'mess_admin'), mealConfirmationController.getDateConfirmations);
router.get('/stats', authenticate, authorize('super_admin', 'mess_admin'), mealConfirmationController.getConfirmationStats);

module.exports = router;