// routes/settingsRoutes.js - YENİ DOSYA
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Request logging middleware
router.use((req, res, next) => {
  console.log(`⚙️ Settings Route: ${req.method} ${req.originalUrl}`);
  console.log(`⚙️ User ID:`, req.userId || req.user?.id || 'No auth');
  next();
});

// ============ PLATFORM PREFERENCES ROUTES ============

// Get user's platform preferences
router.get('/platform-preferences', authMiddleware, settingsController.getPlatformPreferences);

// Update user's platform preferences
router.put('/platform-preferences', authMiddleware, settingsController.updatePlatformPreferences);

// ============ APP SETTINGS ROUTES ============

// Get user's app settings
router.get('/app-settings', authMiddleware, settingsController.getAppSettings);

// Update user's app settings
router.put('/app-settings', authMiddleware, settingsController.updateAppSettings);

// ============ ALL SETTINGS ROUTE ============

// Get all user settings
router.get('/all', authMiddleware, settingsController.getAllSettings);

// ============ HEALTH CHECK ============

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Settings service is healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      platformPreferences: '/api/settings/platform-preferences',
      appSettings: '/api/settings/app-settings',
      allSettings: '/api/settings/all'
    }
  });
});

module.exports = router;