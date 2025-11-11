const express = require('express');
const router = express.Router();
const messController = require('../controllers/messController');
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth');

// Public routes (for getting active messes during registration)
router.get('/active', messController.getActiveMesses);

// Protected routes - require authentication
router.use(authenticate);

// Get all messes
// - super_admin: sees ALL messes
// - mess_admin: sees only their assigned mess
// - subscriber: sees only their assigned mess
router.get('/', messController.getAllMesses);

// Get single mess by ID
// - super_admin: can view any mess
// - mess_admin: can only view their assigned mess
// - subscriber: can only view their assigned mess
router.get('/:mess_id', messController.getMessById);

// Get mess statistics
// - super_admin: can view stats for any mess
// - mess_admin: can only view stats for their assigned mess
router.get('/:mess_id/stats', messController.getMessStats);

// SUPER ADMIN ONLY ROUTES - Only super_admin can manage messes
router.post('/', requireSuperAdmin, messController.createMess);
router.put('/:mess_id', requireSuperAdmin, messController.updateMess);
router.delete('/:mess_id', requireSuperAdmin, messController.deleteMess);
router.patch('/:mess_id/toggle-status', requireSuperAdmin, messController.toggleMessStatus);

// Mess settings - mess_admin can update settings for their own mess
// super_admin can update settings for any mess
router.patch('/:mess_id/settings', authorize(['super_admin', 'mess_admin']), messController.updateMessSettings);

// QR code routes
// - super_admin: can view QR for any mess
// - mess_admin: can only view/regenerate QR for their assigned mess
router.get('/:mess_id/qr-code', messController.getMessQRCode);
router.post('/:mess_id/regenerate-qr', authorize(['super_admin', 'mess_admin']), messController.regenerateMessQR);

module.exports = router;
