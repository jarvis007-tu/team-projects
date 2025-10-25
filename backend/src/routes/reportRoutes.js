const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

// Dashboard statistics
router.get('/dashboard', authenticate, authorize('super_admin', 'mess_admin'), reportController.getDashboardStats);

// Report generation
router.get('/attendance', authenticate, authorize('super_admin', 'mess_admin'), reportController.generateAttendanceReport);
router.get('/subscriptions', authenticate, authorize('super_admin', 'mess_admin'), reportController.generateSubscriptionReport);
router.get('/revenue', authenticate, authorize('super_admin', 'mess_admin'), reportController.generateRevenueReport);
router.get('/user-activity', authenticate, authorize('super_admin', 'mess_admin'), reportController.generateUserActivityReport);
router.get('/meal-consumption', authenticate, authorize('super_admin', 'mess_admin'), reportController.getMealConsumptionReport);
router.get('/financial-summary', authenticate, authorize('super_admin', 'mess_admin'), reportController.getFinancialSummary);
router.get('/waste-analysis', authenticate, authorize('super_admin', 'mess_admin'), reportController.getWasteAnalysis);
router.get('/comparative', authenticate, authorize('super_admin', 'mess_admin'), reportController.getComparativeAnalysis);
router.get('/trends', authenticate, authorize('super_admin', 'mess_admin'), reportController.getTrendsAnalysis);

// Custom reports
router.post('/custom', authenticate, authorize('super_admin', 'mess_admin'), reportController.getCustomReport);
router.get('/templates', authenticate, authorize('super_admin', 'mess_admin'), reportController.getReportTemplates);
router.post('/templates', authenticate, authorize('super_admin', 'mess_admin'), reportController.saveCustomReportTemplate);
router.post('/templates/:templateId/generate', authenticate, authorize('super_admin', 'mess_admin'), reportController.generateScheduledReport);

// Report history
router.get('/history', authenticate, authorize('super_admin', 'mess_admin'), reportController.getReportHistory);

// Export routes
router.get('/:reportType/export/csv', authenticate, authorize('super_admin', 'mess_admin'), reportController.exportToCSV);
router.get('/:reportType/export/pdf', authenticate, authorize('super_admin', 'mess_admin'), reportController.exportToPDF);

module.exports = router;