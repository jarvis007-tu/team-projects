const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

// Dashboard statistics
router.get('/dashboard', authenticate, authorize('admin'), reportController.getDashboardStats);

// Report generation
router.get('/attendance', authenticate, authorize('admin'), reportController.generateAttendanceReport);
router.get('/subscriptions', authenticate, authorize('admin'), reportController.generateSubscriptionReport);
router.get('/revenue', authenticate, authorize('admin'), reportController.generateRevenueReport);
router.get('/user-activity', authenticate, authorize('admin'), reportController.generateUserActivityReport);
router.get('/meal-consumption', authenticate, authorize('admin'), reportController.getMealConsumptionReport);
router.get('/financial-summary', authenticate, authorize('admin'), reportController.getFinancialSummary);
router.get('/waste-analysis', authenticate, authorize('admin'), reportController.getWasteAnalysis);
router.get('/comparative', authenticate, authorize('admin'), reportController.getComparativeAnalysis);
router.get('/trends', authenticate, authorize('admin'), reportController.getTrendsAnalysis);

// Custom reports
router.post('/custom', authenticate, authorize('admin'), reportController.getCustomReport);
router.get('/templates', authenticate, authorize('admin'), reportController.getReportTemplates);
router.post('/templates', authenticate, authorize('admin'), reportController.saveCustomReportTemplate);
router.post('/templates/:templateId/generate', authenticate, authorize('admin'), reportController.generateScheduledReport);

// Report history
router.get('/history', authenticate, authorize('admin'), reportController.getReportHistory);

// Export routes
router.get('/:reportType/export/csv', authenticate, authorize('admin'), reportController.exportToCSV);
router.get('/:reportType/export/pdf', authenticate, authorize('admin'), reportController.exportToPDF);

module.exports = router;