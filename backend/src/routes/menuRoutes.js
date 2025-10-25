const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateMenuItem, validateWeeklyMenu } = require('../validators/menuValidator');

// Public routes (authenticated users can view)
router.get('/weekly', authenticate, menuController.getWeeklyMenu);
router.get('/today', authenticate, menuController.getTodayMenu);
router.get('/special', authenticate, menuController.getSpecialMenu);

// Menu items endpoints
router.get('/items', authenticate, authorize('super_admin', 'mess_admin'), menuController.getMenuItems);
router.post('/items', authenticate, authorize('super_admin', 'mess_admin'), menuController.createMenuItem);
router.put('/items/:id', authenticate, authorize('super_admin', 'mess_admin'), menuController.updateMenuItem);
router.delete('/items/:id', authenticate, authorize('super_admin', 'mess_admin'), menuController.deleteMenuItem);

// Menu templates endpoints
router.get('/templates', authenticate, authorize('super_admin', 'mess_admin'), menuController.getMenuTemplates);
router.post('/templates', authenticate, authorize('super_admin', 'mess_admin'), menuController.createMenuTemplate);
router.post('/templates/:id/apply', authenticate, authorize('super_admin', 'mess_admin'), menuController.applyMenuTemplate);

// Menu categories endpoints
router.get('/categories', authenticate, authorize('super_admin', 'mess_admin'), menuController.getMenuCategories);
router.post('/categories', authenticate, authorize('super_admin', 'mess_admin'), menuController.createMenuCategory);

// Nutritional info endpoints
router.get('/items/:id/nutrition', authenticate, menuController.getNutritionalInfo);
router.put('/items/:id/nutrition', authenticate, authorize('super_admin', 'mess_admin'), menuController.updateNutritionalInfo);

// Image upload endpoint
router.post('/items/:id/image', authenticate, authorize('super_admin', 'mess_admin'), menuController.uploadMenuImage);

// Export/Import endpoints
router.get('/export', authenticate, authorize('super_admin', 'mess_admin'), menuController.exportMenu);
router.post('/import', authenticate, authorize('super_admin', 'mess_admin'), menuController.importMenu);

// Menu preview endpoint
router.get('/preview/:startDate', authenticate, menuController.getMenuPreview);

// Admin routes (existing)
router.post('/item', authenticate, authorize('super_admin', 'mess_admin'), validateMenuItem, menuController.upsertMenuItem);
router.put('/weekly', authenticate, authorize('super_admin', 'mess_admin'), validateWeeklyMenu, menuController.updateWeeklyMenu);
router.delete('/item/:id', authenticate, authorize('super_admin', 'mess_admin'), menuController.deleteMenuItem);
router.get('/history', authenticate, authorize('super_admin', 'mess_admin'), menuController.getMenuHistory);
router.post('/activate', authenticate, authorize('super_admin', 'mess_admin'), menuController.activateMenuVersion);

module.exports = router;