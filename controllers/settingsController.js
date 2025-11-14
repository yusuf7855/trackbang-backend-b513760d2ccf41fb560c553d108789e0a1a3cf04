// controllers/settingsController.js - YENİ DOSYA
const User = require('../models/userModel');
const mongoose = require('mongoose');

// ========== HELPER FUNCTIONS ==========
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

const errorResponse = (res, message = 'Error occurred', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };
  
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error.message;
    response.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

// ========== PLATFORM PREFERENCES ==========

/**
 * @route   GET /api/settings/platform-preferences
 * @desc    Kullanıcının platform tercihlerini getir
 * @access  Private
 */
exports.getPlatformPreferences = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği bulunamadı', 401);
    }

    const user = await User.findById(userId).select('platformPreferences');

    if (!user) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    // Default değerler yoksa ekle
    const platformPreferences = user.platformPreferences || {
      spotify: true,
      appleMusic: true,
      youtubeMusic: true,
      beatport: true,
      soundcloud: true
    };

    return successResponse(
      res,
      { platformPreferences },
      'Platform tercihleri başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get platform preferences error:', err);
    return errorResponse(res, 'Platform tercihleri alınırken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/settings/platform-preferences
 * @desc    Kullanıcının platform tercihlerini güncelle
 * @access  Private
 */
exports.updatePlatformPreferences = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    
    const platformPreferences = req.body.platformPreferences || req.body;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği bulunamadı', 401);
    }

    if (!platformPreferences) {
      return errorResponse(res, 'Platform tercihleri gönderilmedi', 400);
    }

    // Validate platform preferences
    const validPlatforms = ['spotify', 'appleMusic', 'youtubeMusic', 'beatport', 'soundcloud'];
    const invalidPlatforms = Object.keys(platformPreferences).filter(
      key => !validPlatforms.includes(key)
    );

    if (invalidPlatforms.length > 0) {
      return errorResponse(
        res,
        `Geçersiz platform: ${invalidPlatforms.join(', ')}`,
        400
      );
    }

    // Check if user exists and initialize platformPreferences if not exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    // If platformPreferences doesn't exist, initialize it first
    if (!existingUser.platformPreferences) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            platformPreferences: {
              spotify: true,
              appleMusic: true,
              youtubeMusic: true,
              beatport: true,
              soundcloud: true
            }
          }
        }
      );
    }

    // Now update with the actual values
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'platformPreferences.spotify': platformPreferences.spotify ?? true,
          'platformPreferences.appleMusic': platformPreferences.appleMusic ?? true,
          'platformPreferences.youtubeMusic': platformPreferences.youtubeMusic ?? true,
          'platformPreferences.beatport': platformPreferences.beatport ?? true,
          'platformPreferences.soundcloud': platformPreferences.soundcloud ?? true
        }
      }
    );

    // Fetch updated user to return the data
    const user = await User.findById(userId).select('platformPreferences');

    const finalPreferences = user.platformPreferences || {
      spotify: platformPreferences.spotify ?? true,
      appleMusic: platformPreferences.appleMusic ?? true,
      youtubeMusic: platformPreferences.youtubeMusic ?? true,
      beatport: platformPreferences.beatport ?? true,
      soundcloud: platformPreferences.soundcloud ?? true
    };

    console.log('✅ Platform preferences updated:', {
      userId,
      preferences: finalPreferences
    });

    return successResponse(
      res,
      { platformPreferences: finalPreferences },
      'Platform tercihleri başarıyla güncellendi'
    );

  } catch (err) {
    console.error('❌ Update platform preferences error:', err);
    return errorResponse(res, 'Platform tercihleri güncellenirken hata oluştu', 500, err);
  }
};

// ========== APP SETTINGS ==========

/**
 * @route   GET /api/settings/app-settings
 * @desc    Kullanıcının uygulama ayarlarını getir
 * @access  Private
 */
exports.getAppSettings = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği bulunamadı', 401);
    }

    const user = await User.findById(userId).select('appSettings');

    if (!user) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    const appSettings = user.appSettings || {
      notificationsEnabled: true,
      autoPlayEnabled: false,
      darkMode: true
    };

    return successResponse(
      res,
      { appSettings },
      'Uygulama ayarları başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get app settings error:', err);
    return errorResponse(res, 'Uygulama ayarları alınırken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/settings/app-settings
 * @desc    Kullanıcının uygulama ayarlarını güncelle
 * @access  Private
 */
exports.updateAppSettings = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    
    const appSettings = req.body.appSettings || req.body;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği bulunamadı', 401);
    }

    if (!appSettings) {
      return errorResponse(res, 'Uygulama ayarları gönderilmedi', 400);
    }

    // Check if user exists and initialize appSettings if not exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    // If appSettings doesn't exist, initialize it first
    if (!existingUser.appSettings) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            appSettings: {
              notificationsEnabled: true,
              autoPlayEnabled: false,
              darkMode: true
            }
          }
        }
      );
    }

    // Build update object
    const updateFields = {};
    if (appSettings.notificationsEnabled !== undefined) {
      updateFields['appSettings.notificationsEnabled'] = appSettings.notificationsEnabled;
    }
    if (appSettings.autoPlayEnabled !== undefined) {
      updateFields['appSettings.autoPlayEnabled'] = appSettings.autoPlayEnabled;
    }
    if (appSettings.darkMode !== undefined) {
      updateFields['appSettings.darkMode'] = appSettings.darkMode;
    }

    // Update using updateOne to bypass full validation
    await User.updateOne(
      { _id: userId },
      { $set: updateFields }
    );

    // Fetch updated user to return the data
    const user = await User.findById(userId).select('appSettings');

    const finalSettings = user.appSettings || {
      notificationsEnabled: appSettings.notificationsEnabled ?? true,
      autoPlayEnabled: appSettings.autoPlayEnabled ?? false,
      darkMode: appSettings.darkMode ?? true
    };

    console.log('✅ App settings updated:', {
      userId,
      settings: finalSettings
    });

    return successResponse(
      res,
      { appSettings: finalSettings },
      'Uygulama ayarları başarıyla güncellendi'
    );

  } catch (err) {
    console.error('❌ Update app settings error:', err);
    return errorResponse(res, 'Uygulama ayarları güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/settings/all
 * @desc    Kullanıcının tüm ayarlarını getir
 * @access  Private
 */
exports.getAllSettings = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği bulunamadı', 401);
    }

    const user = await User.findById(userId).select('platformPreferences appSettings');

    if (!user) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    const settings = {
      platformPreferences: user.platformPreferences || {
        spotify: true,
        appleMusic: true,
        youtubeMusic: true,
        beatport: true,
        soundcloud: true
      },
      appSettings: user.appSettings || {
        notificationsEnabled: true,
        autoPlayEnabled: false,
        darkMode: true
      }
    };

    return successResponse(
      res,
      { settings },
      'Tüm ayarlar başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get all settings error:', err);
    return errorResponse(res, 'Ayarlar alınırken hata oluştu', 500, err);
  }
};

module.exports = exports;