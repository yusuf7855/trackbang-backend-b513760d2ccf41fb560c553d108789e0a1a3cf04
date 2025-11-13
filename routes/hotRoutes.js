// routes/hotRoutes.js - Clean Code Versiyonu (Yeni Endpoints)
const express = require('express');
const router = express.Router();
const hotController = require('../controllers/hotController');

// ========== HOT PLAYLIST ROUTES ==========

/**
 * @route   GET /api/hot
 * @desc    Her genre'den en son admin playlist'i getir (HOT sayfası)
 * @access  Public
 */
router.get('/', hotController.getHotPlaylists);

/**
 * @route   GET /api/hot/genre/:genre/latest
 * @desc    Belirli bir genre'nin en son playlist'ini getir
 * @access  Public
 */
router.get('/genre/:genre/latest', hotController.getLatestPlaylistByGenre);

/**
 * @route   GET /api/hot/category/:category
 * @desc    Genre'ye göre en son playlist (Backward compatibility)
 * @access  Public
 * @deprecated Use /genre/:genre/latest instead
 */
router.get('/category/:category', hotController.getHotPlaylistByCategory);

/**
 * @route   GET /api/hot/stats
 * @desc    HOT playlist istatistikleri
 * @access  Public
 */
router.get('/stats', hotController.getHotStats);

/**
 * @route   GET /api/hot/trending
 * @desc    Trending playlist'ler (likes + views bazlı)
 * @access  Public
 */
router.get('/trending', hotController.getTrendingPlaylists);

/**
 * @route   GET /api/hot/new-releases
 * @desc    Yeni eklenen admin playlist'ler (son 7 gün)
 * @access  Public
 */
router.get('/new-releases', hotController.getNewReleases);

module.exports = router;
