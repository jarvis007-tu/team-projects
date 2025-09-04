const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateQRScan, validateManualAttendance } = require('../validators/attendanceValidator');

// Get all attendance records (Admin)
router.get('/', authenticate, authorize('admin'), attendanceController.getAttendanceRecords);

// QR Scanning
router.post('/scan', authenticate, validateQRScan, attendanceController.scanQR);

// Attendance history
router.get('/history', authenticate, attendanceController.getAttendanceHistory);
router.get('/today', authenticate, authorize('admin'), attendanceController.getTodayAttendance);
router.get('/stats', authenticate, authorize('admin'), attendanceController.getAttendanceStats);

// Daily attendance
router.get('/daily/:date', authenticate, authorize('admin'), attendanceController.getDailyAttendance);

// Manual attendance (Admin only)
router.post('/mark', authenticate, authorize('admin'), validateManualAttendance, attendanceController.markManualAttendance);
router.post('/manual', authenticate, authorize('admin'), validateManualAttendance, attendanceController.markManualAttendance);
router.post('/bulk-mark', authenticate, authorize('admin'), attendanceController.bulkMarkAttendance);

// Update and delete
router.put('/:id', authenticate, authorize('admin'), attendanceController.updateAttendance);
router.delete('/:id', authenticate, authorize('admin'), attendanceController.deleteAttendance);

// Analytics
router.get('/analytics', authenticate, authorize('admin'), attendanceController.getAttendanceAnalytics);
router.get('/user/:userId/summary', authenticate, authorize('admin'), attendanceController.getUserAttendanceSummary);
router.get('/meal-wise', authenticate, authorize('admin'), attendanceController.getMealWiseAttendance);
router.get('/trends', authenticate, authorize('admin'), attendanceController.getAttendanceTrends);
router.get('/missing-alerts', authenticate, authorize('admin'), attendanceController.getMissingAttendanceAlerts);

// Reports
router.get('/export', authenticate, authorize('admin'), attendanceController.exportAttendanceReport);

module.exports = router;