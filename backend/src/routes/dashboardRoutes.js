const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(authenticate);

// General dashboard stats - available to all authenticated users
router.get('/stats', dashboardController.getStats);
router.get('/menu-today', dashboardController.getMenuToday);

// Admin-only dashboard routes
router.get('/recent-activity', authorize('admin'), dashboardController.getRecentActivity);
router.get('/attendance-stats', authorize('admin'), dashboardController.getAttendanceStats);
router.get('/subscription-stats', authorize('admin'), dashboardController.getSubscriptionStats);
router.get('/today-attendance', authorize('admin'), dashboardController.getTodayAttendance);
router.get('/mealwise-attendance', authorize('admin'), dashboardController.getMealwiseAttendance);
router.get('/expiring-subscriptions', authorize('admin'), dashboardController.getExpiringSubscriptions);
router.get('/revenue-stats', authorize('admin'), dashboardController.getRevenueStats);
router.get('/alerts', authorize('admin'), dashboardController.getSystemAlerts);
router.get('/quick-stats', authorize('admin'), dashboardController.getQuickStats);

module.exports = router;