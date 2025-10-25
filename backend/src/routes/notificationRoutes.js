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
router.get('/', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getAllNotifications);
router.get('/all', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getAllNotifications);
router.post('/', authenticate, authorize('super_admin', 'mess_admin'), validateNotification, notificationController.createNotification);
router.post('/bulk', authenticate, authorize('super_admin', 'mess_admin'), validateBulkNotification, notificationController.sendBulkNotifications);
router.delete('/:id', authenticate, authorize('super_admin', 'mess_admin'), notificationController.deleteNotification);
router.get('/stats', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getNotificationStats);

// Additional routes for missing endpoints
router.post('/targeted', authenticate, authorize('super_admin', 'mess_admin'), notificationController.sendTargetedNotification);
router.post('/schedule', authenticate, authorize('super_admin', 'mess_admin'), notificationController.scheduleNotification);
router.delete('/scheduled/:id', authenticate, authorize('super_admin', 'mess_admin'), notificationController.cancelScheduledNotification);
router.patch('/:id/status', authenticate, authorize('super_admin', 'mess_admin'), notificationController.updateNotificationStatus);
router.get('/export', authenticate, authorize('super_admin', 'mess_admin'), notificationController.exportNotificationHistory);
router.get('/templates', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getNotificationTemplates);
router.post('/templates', authenticate, authorize('super_admin', 'mess_admin'), notificationController.createNotificationTemplate);
router.put('/templates/:id', authenticate, authorize('super_admin', 'mess_admin'), notificationController.updateNotificationTemplate);
router.delete('/templates/:id', authenticate, authorize('super_admin', 'mess_admin'), notificationController.deleteNotificationTemplate);
router.get('/history', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getNotificationHistory);
router.get('/analytics', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getNotificationAnalytics);
router.get('/scheduled', authenticate, authorize('super_admin', 'mess_admin'), notificationController.getScheduledNotifications);
router.post('/test', authenticate, authorize('super_admin', 'mess_admin'), notificationController.sendTestNotification);

module.exports = router;