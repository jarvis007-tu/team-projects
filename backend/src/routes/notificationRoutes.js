const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateNotification, validateBulkNotification } = require('../validators/notificationValidator');

// User routes
router.get('/my-notifications', authenticate, notificationController.getUserNotifications);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.put('/mark-all-read', authenticate, notificationController.markAllAsRead);

// Admin routes - also make available at root path
router.get('/', authenticate, authorize('admin'), notificationController.getAllNotifications);
router.get('/all', authenticate, authorize('admin'), notificationController.getAllNotifications);
router.post('/', authenticate, authorize('admin'), validateNotification, notificationController.createNotification);
router.post('/bulk', authenticate, authorize('admin'), validateBulkNotification, notificationController.sendBulkNotifications);
router.delete('/:id', authenticate, authorize('admin'), notificationController.deleteNotification);
router.get('/stats', authenticate, authorize('admin'), notificationController.getNotificationStats);

// Additional routes for missing endpoints
router.get('/templates', authenticate, authorize('admin'), notificationController.getNotificationTemplates);
router.post('/templates', authenticate, authorize('admin'), notificationController.createNotificationTemplate);
router.put('/templates/:id', authenticate, authorize('admin'), notificationController.updateNotificationTemplate);
router.delete('/templates/:id', authenticate, authorize('admin'), notificationController.deleteNotificationTemplate);
router.get('/history', authenticate, authorize('admin'), notificationController.getNotificationHistory);
router.get('/analytics', authenticate, authorize('admin'), notificationController.getNotificationAnalytics);
router.get('/scheduled', authenticate, authorize('admin'), notificationController.getScheduledNotifications);
router.post('/test', authenticate, authorize('admin'), notificationController.sendTestNotification);

module.exports = router;