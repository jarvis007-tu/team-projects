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
router.get('/items', authenticate, authorize('admin'), menuController.getMenuItems);
router.post('/items', authenticate, authorize('admin'), menuController.createMenuItem);
router.put('/items/:id', authenticate, authorize('admin'), menuController.updateMenuItem);
router.delete('/items/:id', authenticate, authorize('admin'), menuController.deleteMenuItem);

// Menu templates endpoints
router.get('/templates', authenticate, authorize('admin'), menuController.getMenuTemplates);
router.post('/templates', authenticate, authorize('admin'), menuController.createMenuTemplate);
router.post('/templates/:id/apply', authenticate, authorize('admin'), menuController.applyMenuTemplate);

// Menu categories endpoints
router.get('/categories', authenticate, authorize('admin'), menuController.getMenuCategories);
router.post('/categories', authenticate, authorize('admin'), menuController.createMenuCategory);

// Nutritional info endpoints
router.get('/items/:id/nutrition', authenticate, menuController.getNutritionalInfo);
router.put('/items/:id/nutrition', authenticate, authorize('admin'), menuController.updateNutritionalInfo);

// Image upload endpoint
router.post('/items/:id/image', authenticate, authorize('admin'), menuController.uploadMenuImage);

// Export/Import endpoints
router.get('/export', authenticate, authorize('admin'), menuController.exportMenu);
router.post('/import', authenticate, authorize('admin'), menuController.importMenu);

// Menu preview endpoint
router.get('/preview/:startDate', authenticate, menuController.getMenuPreview);

// Admin routes (existing)
router.post('/item', authenticate, authorize('admin'), validateMenuItem, menuController.upsertMenuItem);
router.put('/weekly', authenticate, authorize('admin'), validateWeeklyMenu, menuController.updateWeeklyMenu);
router.delete('/item/:id', authenticate, authorize('admin'), menuController.deleteMenuItem);
router.get('/history', authenticate, authorize('admin'), menuController.getMenuHistory);
router.post('/activate', authenticate, authorize('admin'), menuController.activateMenuVersion);

module.exports = router;