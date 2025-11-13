// routes/paymentRoutes.js - Clean Code Versiyonu
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// ========== GOOGLE PLAY VERIFICATION ROUTES ==========

/**
 * @route   POST /api/payments/verify-google-play
 * @desc    Google Play satın alma doğrulama (subscription + in-app product)
 * @access  Private
 */
router.post('/verify-google-play', authMiddleware, paymentController.verifyGooglePlayPurchase);

/**
 * @route   POST /api/payments/verify-subscription
 * @desc    Google Play abonelik durumu sorgulama
 * @access  Private
 */
router.post('/verify-subscription', authMiddleware, paymentController.verifyGooglePlaySubscription);

/**
 * @route   POST /api/payments/verify-token
 * @desc    Purchase token ile doğrulama
 * @access  Private
 */
router.post('/verify-token', authMiddleware, paymentController.verifyPurchaseToken);

// ========== USER STATUS ROUTES ==========

/**
 * @route   GET /api/payments/subscription-status
 * @desc    Kullanıcının subscription durumunu getir
 * @access  Private
 */
router.get('/subscription-status', authMiddleware, paymentController.getSubscriptionStatus);

/**
 * @route   GET /api/payments/premium-check
 * @desc    Hızlı premium kontrolü
 * @access  Private
 */
router.get('/premium-check', authMiddleware, paymentController.quickPremiumCheck);

/**
 * @route   GET /api/payments/active
 * @desc    Kullanıcının aktif ödemelerini listele
 * @access  Private
 */
router.get('/active', authMiddleware, paymentController.getActivePayments);

// Backward compatibility
router.get('/active-payments', authMiddleware, paymentController.getActivePayments);

// ========== PAYMENT HISTORY ROUTES ==========

/**
 * @route   GET /api/payments/history
 * @desc    Ödeme geçmişi (pagination ile)
 * @access  Private
 */
router.get('/history', authMiddleware, paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Belirli bir ödeme detayı
 * @access  Private
 */
router.get('/:paymentId', authMiddleware, paymentController.getPaymentDetails);

// Backward compatibility
router.get('/payment/:paymentId', authMiddleware, paymentController.getPaymentDetails);

// ========== TEST ROUTES (Development Only) ==========

/**
 * @route   POST /api/payments/test/activate-premium
 * @desc    Test premium aktivasyonu
 * @access  Private (Development only)
 */
router.post('/test/activate-premium', authMiddleware, paymentController.activateTestPremium);

// Backward compatibility
router.post('/test-premium', authMiddleware, paymentController.activateTestPremium);

// ========== WEBHOOK ROUTES ==========

/**
 * @route   POST /api/payments/webhook/google-play
 * @desc    Google Play webhook handler
 * @access  Public (Webhook)
 */
router.post('/webhook/google-play', paymentController.handleGooglePlayWebhook);

module.exports = router;