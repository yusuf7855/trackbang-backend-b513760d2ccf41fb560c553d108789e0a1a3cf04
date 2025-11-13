// routes/playlistRoutes.js - Clean Code Versiyonu
const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middlewares/authMiddleware');

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/playlists/public
 * @desc    Public playlist'leri getir (admin + user)
 * @access  Public
 */
router.get('/public', playlistController.getPublicPlaylists);

/**
 * @route   GET /api/playlists/public-world
 * @desc    Tüm public user playlist'leri (world feed)
 * @access  Public
 */
router.get('/public-world', playlistController.getPublicWorldPlaylists);

/**
 * @route   GET /api/playlists/category/:category
 * @desc    Genre'ye göre admin playlist'leri getir
 * @access  Public
 */
router.get('/category/:category', playlistController.getPlaylistsByCategory);

/**
 * @route   GET /api/playlists/user/:userId
 * @desc    Kullanıcının playlist'lerini getir
 * @access  Public
 */
router.get('/user/:userId', playlistController.getUserPlaylists);

/**
 * @route   GET /api/playlists/following/:userId
 * @desc    Takip edilen kullanıcıların playlist'leri
 * @access  Public
 */
router.get('/following/:userId', playlistController.getFollowingPlaylists);

// ========== HOT PAGE ROUTES ==========

/**
 * @route   GET /api/playlists/hot/latest
 * @desc    Her genre'den en son admin playlist'i (HOT page)
 * @access  Public
 */
router.get('/hot/latest', playlistController.getLatestPlaylistsByCategory);

// ========== SEARCH ROUTES ==========

/**
 * @route   GET /api/playlists/search
 * @desc    Public playlist arama
 * @access  Public
 */
router.get('/search', playlistController.searchPlaylists);

/**
 * @route   GET /api/playlists/search-private
 * @desc    Private playlist arama (kullanıcıya özel)
 * @access  Private
 */
router.get('/search-private', authMiddleware, playlistController.searchPrivatePlaylists);

// ========== ADMIN PLAYLIST ROUTES ==========

/**
 * @route   POST /api/playlists/admin
 * @desc    Admin playlist oluştur (Cover Image ile)
 * @access  Admin
 */
router.post('/admin', playlistController.createAdminPlaylist);

/**
 * @route   GET /api/playlists/admin
 * @desc    Admin playlist'leri listele
 * @access  Public
 */
router.get('/admin', playlistController.getAllAdminPlaylists);

/**
 * @route   PUT /api/playlists/admin/:id
 * @desc    Admin playlist güncelle
 * @access  Admin
 */
router.put('/admin/:id', playlistController.updateAdminPlaylist);

/**
 * @route   DELETE /api/playlists/admin/:id
 * @desc    Admin playlist sil
 * @access  Admin
 */
router.delete('/admin/:id', playlistController.deleteAdminPlaylist);

// ========== USER PLAYLIST ROUTES ==========

/**
 * @route   POST /api/playlists
 * @desc    User playlist oluştur
 * @access  Private
 */
router.post('/', authMiddleware, playlistController.createUserPlaylist);

/**
 * @route   PUT /api/playlists/user/:id
 * @desc    User playlist güncelle
 * @access  Private
 */
router.put('/user/:id', authMiddleware, playlistController.updateUserPlaylist);

/**
 * @route   DELETE /api/playlists/user/:id
 * @desc    User playlist sil
 * @access  Private
 */
router.delete('/user/:id', authMiddleware, playlistController.deleteUserPlaylist);

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Playlist sil (admin/user otomatik tespit)
 * @access  Public/Private
 */
router.delete('/:id', playlistController.deletePlaylist);

module.exports = router;