// controllers/paymentController.js - Clean Code Versiyonu
const Payment = require('../models/Payment');
const User = require('../models/userModel');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

// ========== CONSTANTS ==========
const PERMANENT_ACCESS_DATE = new Date('2099-12-31');
const PRODUCT_TYPES = {
  IN_APP: 'in_app_product',
  SUBSCRIPTION: 'subscription'
};

const PURCHASE_STATES = {
  PURCHASED: 0,
  CANCELED: 1
};

const PAYMENT_STATES = {
  RECEIVED: 1
};

// ========== HELPER FUNCTIONS ==========
/**
 * Standart başarılı response
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

/**
 * Standart hata response
 */
const errorResponse = (res, message, statusCode = 500, error = null) => {
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

/**
 * Google Play Auth Client oluştur
 */
const getGoogleAuthClient = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
  });

  return await auth.getClient();
};

/**
 * Android Publisher instance
 */
const getAndroidPublisher = () => {
  return google.androidpublisher('v3');
};

/**
 * User'ın subscription bilgilerini güncelle
 */
const updateUserSubscription = async (userId, paymentData) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  user.subscription = {
    isActive: true,
    type: 'premium',
    startDate: paymentData.startDate,
    endDate: paymentData.endDate,
    paymentMethod: 'google_play',
    lastPaymentId: paymentData.paymentId
  };

  await user.save();
  
  console.log(`👤 User subscription updated: ${userId}`, {
    startDate: paymentData.startDate,
    endDate: paymentData.endDate,
    isPermanent: paymentData.isPermanent
  });

  return user;
};

/**
 * Duplicate purchase kontrolü
 */
const checkDuplicatePurchase = async (purchaseToken) => {
  const existingPayment = await Payment.findByGooglePlayToken(purchaseToken);
  
  if (existingPayment && existingPayment.status === 'completed') {
    console.warn('⚠️ Duplicate purchase detected:', purchaseToken);
    return existingPayment;
  }
  
  return null;
};

// ========== PURCHASE PROCESSING ==========
/**
 * In-App Product satın alma işleme
 */
const processInAppProductPurchase = async (userId, productId, orderId, purchaseToken, purchaseData) => {
  try {
    console.log('🛒 Processing in-app product purchase...');

    // Payment kaydı oluştur
    const payment = new Payment({
      userId,
      amount: 180,
      currency: 'TRY',
      paymentMethod: 'google_play',
      status: 'completed',
      transactionId: orderId,
      googlePlayToken: purchaseToken,
      productType: PRODUCT_TYPES.IN_APP,
      productId,
      subscriptionType: 'one_time',
      startDate: new Date(parseInt(purchaseData.purchaseTimeMillis)),
      endDate: PERMANENT_ACCESS_DATE,
      isActive: true,
      isPermanent: true,
      googlePlayPurchaseState: purchaseData.purchaseState,
      googlePlayConsumptionState: purchaseData.consumptionState,
      receiptData: purchaseData
    });

    await payment.save();
    console.log('💾 In-app product payment created:', payment._id);

    // User'ı premium yap
    await updateUserSubscription(userId, {
      startDate: new Date(),
      endDate: PERMANENT_ACCESS_DATE,
      isPermanent: true,
      paymentId: payment._id
    });

    return payment;

  } catch (error) {
    console.error('❌ Process in-app product error:', error);
    throw error;
  }
};

/**
 * Subscription satın alma işleme
 */
const processSubscriptionPurchase = async (userId, productId, orderId, purchaseToken, purchaseData) => {
  try {
    console.log('📅 Processing subscription purchase...');

    const startDate = new Date(parseInt(purchaseData.startTimeMillis));
    const endDate = new Date(parseInt(purchaseData.expiryTimeMillis));

    // Payment kaydı oluştur
    const payment = new Payment({
      userId,
      amount: 180,
      currency: 'TRY',
      paymentMethod: 'google_play',
      status: 'completed',
      transactionId: orderId,
      googlePlayToken: purchaseToken,
      productType: PRODUCT_TYPES.SUBSCRIPTION,
      productId,
      subscriptionType: 'monthly',
      startDate,
      endDate,
      isActive: true,
      isPermanent: false,
      autoRenewStatus: purchaseData.autoRenewing,
      renewalDate: endDate,
      receiptData: purchaseData
    });

    await payment.save();
    console.log('💾 Subscription payment created:', payment._id);

    // User subscription güncelle
    await updateUserSubscription(userId, {
      startDate,
      endDate,
      isPermanent: false,
      paymentId: payment._id
    });

    return payment;

  } catch (error) {
    console.error('❌ Process subscription error:', error);
    throw error;
  }
};

/**
 * In-App Product'ı Google Play'den doğrula
 */
const verifyInAppProduct = async (authClient, productId, purchaseToken) => {
  const androidPublisher = getAndroidPublisher();

  const result = await androidPublisher.purchases.products.get({
    auth: authClient,
    packageName: process.env.ANDROID_PACKAGE_NAME,
    productId,
    token: purchaseToken
  });

  const purchase = result.data;

  console.log('📦 In-app product data:', {
    purchaseState: purchase.purchaseState,
    consumptionState: purchase.consumptionState,
    purchaseTimeMillis: purchase.purchaseTimeMillis
  });

  // Purchase state kontrolü
  if (purchase.purchaseState !== PURCHASE_STATES.PURCHASED) {
    throw new Error(`Geçersiz satın alma durumu: ${purchase.purchaseState}`);
  }

  return purchase;
};

/**
 * Subscription'ı Google Play'den doğrula
 */
const verifySubscription = async (authClient, productId, purchaseToken) => {
  const androidPublisher = getAndroidPublisher();

  const result = await androidPublisher.purchases.subscriptions.get({
    auth: authClient,
    packageName: process.env.ANDROID_PACKAGE_NAME,
    subscriptionId: productId,
    token: purchaseToken
  });

  const purchase = result.data;

  console.log('📅 Subscription data:', {
    paymentState: purchase.paymentState,
    autoRenewing: purchase.autoRenewing,
    startTimeMillis: purchase.startTimeMillis,
    expiryTimeMillis: purchase.expiryTimeMillis
  });

  // Payment state kontrolü
  if (purchase.paymentState !== PAYMENT_STATES.RECEIVED) {
    throw new Error(`Geçersiz ödeme durumu: ${purchase.paymentState}`);
  }

  return purchase;
};

// ========== MAIN CONTROLLERS ==========
/**
 * @route   POST /api/payments/verify-google-play
 * @desc    Google Play satın alma doğrulama
 * @access  Private
 */
exports.verifyGooglePlayPurchase = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { purchaseToken, productId, orderId, purchaseType } = req.body;

    console.log('🔔 Google Play verification started:', {
      userId,
      productId,
      orderId,
      purchaseType
    });

    // Validation
    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    if (!purchaseToken || !productId || !orderId) {
      return errorResponse(res, 'Eksik satın alma bilgileri', 400);
    }

    // Duplicate kontrolü
    const duplicatePayment = await checkDuplicatePurchase(purchaseToken);
    if (duplicatePayment) {
      return errorResponse(res, 'Bu satın alma zaten işlenmiş', 400);
    }

    // Google Auth Client
    const authClient = await getGoogleAuthClient();

    // Ürün türüne göre doğrulama
    let purchase;
    let actualProductType;

    if (purchaseType === PRODUCT_TYPES.IN_APP || productId === 'dj_app_premium_access') {
      // In-App Product
      actualProductType = PRODUCT_TYPES.IN_APP;
      purchase = await verifyInAppProduct(authClient, productId, purchaseToken);
      await processInAppProductPurchase(userId, productId, orderId, purchaseToken, purchase);

    } else {
      // Subscription
      actualProductType = PRODUCT_TYPES.SUBSCRIPTION;
      purchase = await verifySubscription(authClient, productId, purchaseToken);
      await processSubscriptionPurchase(userId, productId, orderId, purchaseToken, purchase);
    }

    return successResponse(
      res,
      {
        productType: actualProductType,
        productId
      },
      'Ödeme başarıyla doğrulandı ve işlendi!'
    );

  } catch (error) {
    console.error('❌ Payment verification error:', error);

    // Error mapping
    let message = 'Ödeme doğrulanamadı';
    let statusCode = 400;

    if (error.message.includes('Invalid purchase token')) {
      message = 'Geçersiz satın alma bilgisi';
    } else if (error.message.includes('not found')) {
      message = 'Satın alma kaydı bulunamadı';
    } else if (error.message.includes('geçersiz')) {
      message = error.message;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      message = 'Google Play API bağlantı hatası';
      statusCode = 503;
    }

    return errorResponse(res, message, statusCode, error);
  }
};

/**
 * @route   GET /api/payments/subscription-status
 * @desc    Kullanıcının subscription durumunu getir
 * @access  Private
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    // User bilgisi
    const user = await User.findById(userId)
      .select('subscription')
      .populate('subscription.lastPaymentId');

    if (!user) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    // Aktif ödemeler
    const activePayments = await Payment.findActiveUserPayments(userId);

    // Premium durumu
    const hasPermanentAccess = activePayments.some(p => p.isPermanent);
    const hasActiveSubscription = activePayments.some(p => !p.isPermanent && !p.isExpired);
    const isPremium = hasPermanentAccess || hasActiveSubscription ||
      (user.subscription.isActive && user.subscription.endDate && new Date() < user.subscription.endDate);

    // En son ödeme
    const latestPayment = activePayments.length > 0 ? activePayments[0] : null;

    // Days remaining hesapla
    let daysRemaining = 0;
    if (isPremium && !hasPermanentAccess && user.subscription.endDate) {
      daysRemaining = Math.ceil((user.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
    } else if (hasPermanentAccess) {
      daysRemaining = -1; // -1 = permanent
    }

    const subscription = {
      ...user.subscription.toObject(),
      isPremium,
      hasPermanentAccess,
      hasActiveSubscription,
      activePaymentsCount: activePayments.length,
      latestPayment: latestPayment ? latestPayment.getDisplayInfo() : null,
      daysRemaining
    };

    console.log('👤 Subscription status checked:', {
      userId,
      isPremium,
      hasPermanentAccess,
      hasActiveSubscription
    });

    return successResponse(res, { subscription });

  } catch (error) {
    console.error('❌ Get subscription status error:', error);
    return errorResponse(res, 'Premium durumu alınamadı', 500, error);
  }
};

/**
 * @route   GET /api/payments/quick-check
 * @desc    Hızlı premium kontrolü
 * @access  Private
 */
exports.quickPremiumCheck = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    const activePayments = await Payment.findActiveUserPayments(userId);
    const isPremium = activePayments.length > 0;
    const hasPermanentAccess = activePayments.some(p => p.isPermanent);

    return successResponse(res, {
      isPremium,
      hasPermanentAccess,
      accessType: hasPermanentAccess ? 'permanent' : 'subscription'
    });

  } catch (error) {
    console.error('❌ Quick premium check error:', error);
    return successResponse(res, { isPremium: false });
  }
};

/**
 * @route   GET /api/payments/active
 * @desc    Kullanıcının aktif ödemelerini listele
 * @access  Private
 */
exports.getActivePayments = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    const activePayments = await Payment.findActiveUserPayments(userId);

    return successResponse(res, {
      count: activePayments.length,
      payments: activePayments.map(p => p.getDisplayInfo())
    });

  } catch (error) {
    console.error('❌ Get active payments error:', error);
    return errorResponse(res, 'Aktif ödemeler alınamadı', 500, error);
  }
};

/**
 * @route   GET /api/payments/history
 * @desc    Ödeme geçmişi
 * @access  Private
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { page = 1, limit = 10, status, productType } = req.query;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    const filter = { userId };
    if (status) filter.status = status;
    if (productType) filter.productType = productType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-receiptData -googlePlayToken')
        .lean(),
      Payment.countDocuments(filter)
    ]);

    return successResponse(res, {
      payments: payments.map(p => ({
        _id: p._id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        productType: p.productType,
        productId: p.productId,
        startDate: p.startDate,
        endDate: p.endDate,
        isPermanent: p.isPermanent,
        createdAt: p.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get payment history error:', error);
    return errorResponse(res, 'Ödeme geçmişi alınamadı', 500, error);
  }
};

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Belirli bir ödeme detayı
 * @access  Private
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { paymentId } = req.params;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      userId
    });

    if (!payment) {
      return errorResponse(res, 'Ödeme bulunamadı', 404);
    }

    return successResponse(res, {
      payment: payment.getDisplayInfo()
    });

  } catch (error) {
    console.error('❌ Get payment details error:', error);
    return errorResponse(res, 'Ödeme detayı alınamadı', 500, error);
  }
};

// ========== VERIFICATION HELPERS ==========
/**
 * @route   POST /api/payments/verify-subscription
 * @desc    Google Play subscription durumu sorgulama
 * @access  Private
 */
exports.verifyGooglePlaySubscription = async (req, res) => {
  try {
    const { subscriptionId, purchaseToken } = req.body;

    if (!subscriptionId || !purchaseToken) {
      return errorResponse(res, 'Subscription ID ve purchase token gerekli', 400);
    }

    console.log('📅 Querying Google Play subscription:', { subscriptionId });

    const authClient = await getGoogleAuthClient();
    const androidPublisher = getAndroidPublisher();

    const result = await androidPublisher.purchases.subscriptions.get({
      auth: authClient,
      packageName: process.env.ANDROID_PACKAGE_NAME,
      subscriptionId,
      token: purchaseToken
    });

    const subscription = result.data;

    const subscriptionInfo = {
      isActive: subscription.paymentState === PAYMENT_STATES.RECEIVED,
      autoRenewing: subscription.autoRenewing,
      startTime: new Date(parseInt(subscription.startTimeMillis)),
      expiryTime: new Date(parseInt(subscription.expiryTimeMillis)),
      paymentState: subscription.paymentState,
      cancelReason: subscription.cancelReason || null,
      userCancellationTime: subscription.userCancellationTimeMillis
        ? new Date(parseInt(subscription.userCancellationTimeMillis))
        : null
    };

    console.log('📅 Subscription info:', subscriptionInfo);

    return successResponse(res, { subscription: subscriptionInfo });

  } catch (error) {
    console.error('❌ Verify subscription error:', error);
    return errorResponse(res, 'Abonelik durumu sorgulanamadı', 500, error);
  }
};

/**
 * @route   POST /api/payments/verify-token
 * @desc    Purchase token doğrulama
 * @access  Private
 */
exports.verifyPurchaseToken = async (req, res) => {
  try {
    const { purchaseToken } = req.body;

    if (!purchaseToken) {
      return errorResponse(res, 'Purchase token gerekli', 400);
    }

    console.log('🔍 Verifying purchase token...');

    const existingPayment = await Payment.findByGooglePlayToken(purchaseToken);

    if (existingPayment) {
      console.log('✅ Purchase token found:', {
        paymentId: existingPayment._id,
        status: existingPayment.status,
        isActive: existingPayment.isActive
      });

      return successResponse(res, {
        exists: true,
        payment: existingPayment.getDisplayInfo()
      });
    } else {
      console.log('❌ Purchase token not found');

      return successResponse(res, {
        exists: false,
        message: 'Bu purchase token ile ödeme kaydı bulunamadı'
      });
    }

  } catch (error) {
    console.error('❌ Verify token error:', error);
    return errorResponse(res, 'Token doğrulanamadı', 500, error);
  }
};

// ========== TEST FUNCTIONS ==========
/**
 * @route   POST /api/payments/test/activate-premium
 * @desc    Test premium aktivasyonu
 * @access  Private (Development only)
 */
exports.activateTestPremium = async (req, res) => {
  try {
    // Production'da devre dışı
    if (process.env.NODE_ENV === 'production') {
      return errorResponse(res, 'Bu endpoint production\'da kullanılamaz', 403);
    }

    const userId = req.userId || req.user?.id;
    const { duration = 'permanent', productType = PRODUCT_TYPES.IN_APP } = req.body;

    if (!userId) {
      return errorResponse(res, 'Kullanıcı kimliği gerekli', 401);
    }

    console.log('🧪 Test premium activation:', { userId, duration, productType });

    // End date hesapla
    let endDate;
    let isPermanent = false;

    if (duration === 'permanent') {
      endDate = PERMANENT_ACCESS_DATE;
      isPermanent = true;
    } else if (duration === '1y') {
      endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else {
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Test payment oluştur
    const testPayment = new Payment({
      userId,
      amount: 180,
      currency: 'TRY',
      paymentMethod: 'test',
      status: 'completed',
      transactionId: `test_${productType}_${Date.now()}`,
      productType,
      productId: productType === PRODUCT_TYPES.IN_APP
        ? 'dj_app_premium_access'
        : 'dj_app_monthly_10_euro',
      subscriptionType: isPermanent ? 'one_time' : 'monthly',
      startDate: new Date(),
      endDate,
      isActive: true,
      isPermanent,
      isTestPurchase: true
    });

    await testPayment.save();

    // User güncelle
    const user = await updateUserSubscription(userId, {
      startDate: new Date(),
      endDate,
      isPermanent,
      paymentId: testPayment._id
    });

    console.log('✅ Test premium activated:', {
      userId,
      paymentId: testPayment._id,
      productType,
      isPermanent,
      endDate
    });

    return successResponse(
      res,
      {
        subscription: user.subscription,
        payment: testPayment.getDisplayInfo()
      },
      `Test premium activated (${duration}, ${productType})`
    );

  } catch (error) {
    console.error('❌ Test premium activation error:', error);
    return errorResponse(res, 'Test premium aktivasyonu başarısız', 500, error);
  }
};

// ========== WEBHOOK HANDLERS ==========
/**
 * @route   POST /api/payments/webhook/google-play
 * @desc    Google Play webhook handler
 * @access  Public (Webhook)
 */
exports.handleGooglePlayWebhook = async (req, res) => {
  try {
    console.log('🔔 Google Play webhook received:', req.body);

    // TODO: Webhook signature validation
    // TODO: Real-time subscription updates
    // TODO: Event processing (renewed, canceled, expired, etc.)

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Google Play webhook error:', error);
    return res.status(500).json({ success: false });
  }
};

module.exports = exports;