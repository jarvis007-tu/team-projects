const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { extractMessContext } = require('../middleware/messContext');
const { validateQRScan, validateManualAttendance } = require('../validators/attendanceValidator');

// All routes require authentication and mess context
router.use(authenticate);
router.use(extractMessContext);

// Get all attendance records (Admin)
router.get('/', authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceRecords);

// QR Scanning
router.post('/scan', validateQRScan, attendanceController.scanQR);

// Attendance history
router.get('/history', attendanceController.getAttendanceHistory);
router.get('/today', authorize('super_admin', 'mess_admin'), attendanceController.getTodayAttendance);
router.get('/stats', authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceStats);

// Daily attendance
router.get('/daily/:date', authorize('super_admin', 'mess_admin'), attendanceController.getDailyAttendance);

// Manual attendance (Admin only)
router.post('/mark', authorize('super_admin', 'mess_admin'), validateManualAttendance, attendanceController.markManualAttendance);
router.post('/manual', authorize('super_admin', 'mess_admin'), validateManualAttendance, attendanceController.markManualAttendance);
router.post('/bulk-mark', authorize('super_admin', 'mess_admin'), attendanceController.bulkMarkAttendance);

// Update and delete
router.put('/:id', authorize('super_admin', 'mess_admin'), attendanceController.updateAttendance);
router.delete('/:id', authorize('super_admin', 'mess_admin'), attendanceController.deleteAttendance);

// Analytics
router.get('/analytics', authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceAnalytics);
router.get('/user/:userId/summary', authorize('super_admin', 'mess_admin'), attendanceController.getUserAttendanceSummary);
router.get('/meal-wise', authorize('super_admin', 'mess_admin'), attendanceController.getMealWiseAttendance);
router.get('/trends', authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceTrends);
router.get('/missing-alerts', authorize('super_admin', 'mess_admin'), attendanceController.getMissingAttendanceAlerts);
router.get('/meal-prediction', authorize('super_admin', 'mess_admin'), attendanceController.getMealPrediction);

// Reports
router.get('/export', authorize('super_admin', 'mess_admin'), attendanceController.exportAttendanceReport);

module.exports = router;