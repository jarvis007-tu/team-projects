const express = require('express');
const router = express.Router();
const messController = require('../controllers/messController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes (for getting active messes during registration)
router.get('/active', messController.getActiveMesses);

// Protected routes - require authentication
router.use(authenticate);

// Get all messes (all authenticated users can view)
router.get('/', messController.getAllMesses);

// Get single mess by ID
router.get('/:mess_id', messController.getMessById);

// Get mess statistics
router.get('/:mess_id/stats', messController.getMessStats);

// Super admin only routes
router.post('/', authorize(['super_admin']), messController.createMess);
router.put('/:mess_id', authorize(['super_admin', 'mess_admin']), messController.updateMess);
router.delete('/:mess_id', authorize(['super_admin']), messController.deleteMess);
router.patch('/:mess_id/toggle-status', authorize(['super_admin']), messController.toggleMessStatus);

// Super admin and mess admin routes
router.patch('/:mess_id/settings', authorize(['super_admin', 'mess_admin']), messController.updateMessSettings);

// QR code routes
router.get('/:mess_id/qr-code', messController.getMessQRCode);
router.post('/:mess_id/regenerate-qr', authorize(['super_admin', 'mess_admin']), messController.regenerateMessQR);

module.exports = router;
