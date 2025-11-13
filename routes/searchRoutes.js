// routes/searchRoutes.js - Clean Code Versiyonu
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const authMiddleware = require('../middlewares/authMiddleware');

// ========== UNIFIED SEARCH ROUTES ==========

/**
 * @route   GET /api/search
 * @desc    Unified search (users, playlists, musics)
 * @access  Public
 */
router.get('/', searchController.searchAll);

/**
 * @route   GET /api/search/all
 * @desc    Tüm tiplerde arama (users, playlists, musics)
 * @access  Public
 */
router.get('/all', searchController.searchAll);

// ========== TYPE-SPECIFIC SEARCH ROUTES ==========

/**
 * @route   GET /api/search/users
 * @desc    Kullanıcı arama
 * @access  Public
 */
router.get('/users', searchController.searchUsersOnly);

/**
 * @route   GET /api/search/playlists
 * @desc    Playlist arama
 * @access  Public
 */
router.get('/playlists', searchController.searchPlaylistsOnly);

/**
 * @route   GET /api/search/musics
 * @desc    Müzik arama
 * @access  Public
 */
router.get('/musics', searchController.searchMusicsOnly);

// ========== SPECIALIZED SEARCH ROUTES ==========

/**
 * @route   GET /api/search/by-artist
 * @desc    Sanatçıya göre müzik arama
 * @access  Public
 */
router.get('/by-artist', searchController.searchByArtist);

/**
 * @route   GET /api/search/by-genre
 * @desc    Genre'ye göre arama (playlists + musics)
 * @access  Public
 */
router.get('/by-genre', searchController.searchByGenre);

/**
 * @route   GET /api/search/suggestions
 * @desc    Arama önerileri (autocomplete)
 * @access  Public
 */
router.get('/suggestions', searchController.getSearchSuggestions);

// ========== PRIVATE SEARCH ROUTES ==========

/**
 * @route   GET /api/search/private-playlists
 * @desc    Kullanıcının private playlist'lerinde arama
 * @access  Private
 */
router.get('/private-playlists', authMiddleware, searchController.searchUserPrivatePlaylists);

/**
 * @route   GET /api/search/my-playlists
 * @desc    Kullanıcının kendi playlist'lerinde arama (Backward compatibility)
 * @access  Private
 */
router.get('/my-playlists', authMiddleware, searchController.searchUserPrivatePlaylists);

module.exports = router;
