const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { authenticate, authorize } = require('../middleware/auth');

// Generate QR codes
router.post('/generate', authenticate, authorize('admin'), qrController.generateQRCode);
router.get('/daily', authenticate, authorize('admin'), qrController.getDailyQRCode);
router.post('/validate', authenticate, qrController.validateQRCode);

// User QR codes
router.get('/my-qr', authenticate, qrController.getUserQRCode);

module.exports = router;