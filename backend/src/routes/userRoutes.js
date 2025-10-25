const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { validateUserCreate, validateUserUpdate } = require('../validators/userValidator');

// Admin routes
router.get('/', authenticate, authorize('super_admin', 'mess_admin'), userController.getAllUsers);
router.post('/', authenticate, authorize('super_admin', 'mess_admin'), validateUserCreate, userController.createUser);
router.post('/bulk-upload', authenticate, authorize('super_admin', 'mess_admin'), upload.single('file'), userController.bulkUploadUsers);

// Profile routes (must come before /:id)
router.get('/profile/me', authenticate, userController.getProfile);
router.put('/profile/update', authenticate, userController.updateProfile);
router.post('/profile/change-password', authenticate, userController.changePassword);
router.post('/profile/upload-image', authenticate, upload.single('image'), userController.uploadProfileImage);

// Settings routes (must come before /:id)
router.get('/settings', authenticate, userController.getSettings);
router.put('/settings', authenticate, userController.updateSettings);
router.get('/settings/admin', authenticate, authorize('super_admin', 'mess_admin'), userController.getAdminSettings);
router.put('/settings/admin', authenticate, authorize('super_admin', 'mess_admin'), userController.updateAdminSettings);

// User routes (admin or self) - must come last due to /:id parameter
router.get('/:id', authenticate, userController.getUser);
router.put('/:id', authenticate, validateUserUpdate, userController.updateUser);
router.delete('/:id', authenticate, authorize('super_admin', 'mess_admin'), userController.deleteUser);

module.exports = router;