const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateQRScan, validateManualAttendance } = require('../validators/attendanceValidator');

// Get all attendance records (Admin)
router.get('/', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceRecords);

// QR Scanning
router.post('/scan', authenticate, validateQRScan, attendanceController.scanQR);

// Attendance history
router.get('/history', authenticate, attendanceController.getAttendanceHistory);
router.get('/today', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getTodayAttendance);
router.get('/stats', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceStats);

// Daily attendance
router.get('/daily/:date', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getDailyAttendance);

// Manual attendance (Admin only)
router.post('/mark', authenticate, authorize('super_admin', 'mess_admin'), validateManualAttendance, attendanceController.markManualAttendance);
router.post('/manual', authenticate, authorize('super_admin', 'mess_admin'), validateManualAttendance, attendanceController.markManualAttendance);
router.post('/bulk-mark', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.bulkMarkAttendance);

// Update and delete
router.put('/:id', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.updateAttendance);
router.delete('/:id', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.deleteAttendance);

// Analytics
router.get('/analytics', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceAnalytics);
router.get('/user/:userId/summary', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getUserAttendanceSummary);
router.get('/meal-wise', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getMealWiseAttendance);
router.get('/trends', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getAttendanceTrends);
router.get('/missing-alerts', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.getMissingAttendanceAlerts);

// Reports
router.get('/export', authenticate, authorize('super_admin', 'mess_admin'), attendanceController.exportAttendanceReport);

module.exports = router;