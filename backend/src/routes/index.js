const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const menuRoutes = require('./menuRoutes');
const notificationRoutes = require('./notificationRoutes');
const mealConfirmationRoutes = require('./mealConfirmationRoutes');
const reportRoutes = require('./reportRoutes');
const qrRoutes = require('./qrRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version info
router.get('/version', (req, res) => {
  res.json({
    success: true,
    version: process.env.API_VERSION || 'v1',
    name: 'Hostel Mess Management System API',
    description: 'Production-ready API for hostel food subscription and attendance management'
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/menu', menuRoutes);
router.use('/notifications', notificationRoutes);
router.use('/meal-confirmations', mealConfirmationRoutes);
router.use('/reports', reportRoutes);
router.use('/qr', qrRoutes);
router.use('/dashboard', dashboardRoutes);

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

module.exports = router;