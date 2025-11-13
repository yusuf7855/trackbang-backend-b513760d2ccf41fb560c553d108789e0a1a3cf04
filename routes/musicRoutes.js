// routes/musicRoutes.js - Clean Code Versiyonu
const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const authMiddleware = require('../middlewares/authMiddleware');

// ========== QUERY ROUTES (Spesifik routes önce) ==========

/**
 * @route   GET /api/music/featured
 * @desc    Öne çıkan müzikler
 * @access  Public
 */
router.get('/featured', musicController.getFeaturedMusic);

/**
 * @route   GET /api/music/popular
 * @desc    Popüler müzikler (likes + views bazlı)
 * @access  Public
 */
router.get('/popular', musicController.getPopularMusic);

/**
 * @route   GET /api/music/new-releases
 * @desc    Yeni çıkan müzikler (son 7 gün)
 * @access  Public
 */
router.get('/new-releases', musicController.getNewReleases);

/**
 * @route   GET /api/music/top10
 * @desc    Kategorilere göre en çok beğenilen 10 şarkı
 * @access  Public
 */
router.get('/top10', musicController.getTop10ByCategory);

// ========== SEARCH ROUTES ==========

/**
 * @route   GET /api/music/search
 * @desc    Müzik ara (text search)
 * @access  Public
 */
router.get('/search', musicController.searchMusic);

/**
 * @route   GET /api/music/search/all
 * @desc    Müzik ve playlist ara (birleşik arama)
 * @access  Public
 */
router.get('/search/all', musicController.searchMusicAndPlaylists);

/**
 * @route   GET /api/music/search/public
 * @desc    Public içerik ara (müzik + playlist)
 * @access  Public
 */
router.get('/search/public', musicController.searchPublicContent);

/**
 * @route   GET /api/music/search/private
 * @desc    Private içerik ara (kullanıcıya özel)
 * @access  Private
 */
router.get('/search/private', authMiddleware, musicController.searchPrivateContent);

/**
 * @route   GET /api/music/search/artist
 * @desc    Sanatçıya göre müzik ara
 * @access  Public
 */
router.get('/search/artist', musicController.searchMusicByArtist);

// Backward compatibility
router.get('/search-by-artist', musicController.searchMusicByArtist);
router.get('/search-private', authMiddleware, musicController.searchPrivateContent);
router.get('/search-public', musicController.searchPublicContent);

// ========== GENRE/CATEGORY ROUTES ==========

/**
 * @route   GET /api/music/genre/:genre
 * @desc    Genre'ye göre müzikler
 * @access  Public
 */
router.get('/genre/:genre', musicController.getMusicByGenre);

/**
 * @route   GET /api/music/category/:category
 * @desc    Kategori'ye göre müzikler (Backward compatibility)
 * @access  Public
 * @deprecated Use /genre/:genre instead
 */
router.get('/category/:category', musicController.getMusicByCategory);

// ========== CRUD OPERATIONS ==========

/**
 * @route   POST /api/music
 * @desc    Yeni müzik ekle (Admin)
 * @access  Admin
 */
router.post('/', musicController.addMusic);

/**
 * @route   GET /api/music
 * @desc    Tüm müzikleri getir (pagination + filtering)
 * @access  Public
 */
router.get('/', musicController.getAllMusic);

/**
 * @route   GET /api/music/:id
 * @desc    ID'ye göre müzik getir
 * @access  Public
 */
router.get('/:id', musicController.getMusicById);

/**
 * @route   PUT /api/music/:id
 * @desc    Müzik güncelle (Admin)
 * @access  Admin
 */
router.put('/:id', musicController.updateMusic);

/**
 * @route   DELETE /api/music/:id
 * @desc    Müzik sil (Admin)
 * @access  Admin
 */
router.delete('/:id', musicController.deleteMusic);

/**
 * @route   PUT /api/music/:id/soft-delete
 * @desc    Müziği pasifleştir (Soft delete)
 * @access  Admin
 */
router.put('/:id/soft-delete', musicController.softDeleteMusic);

// ========== INTERACTION ROUTES ==========

/**
 * @route   POST /api/music/:id/like
 * @desc    Müziği beğen/beğenme
 * @access  Private
 */
router.post('/:id/like', authMiddleware, musicController.likeMusic);

/**
 * @route   POST /api/music/:id/add-to-playlist
 * @desc    Müziği playlist'e ekle
 * @access  Private
 */
router.post('/:id/add-to-playlist', authMiddleware, musicController.addToPlaylist);

// ========== INFO ROUTES ==========

/**
 * @route   GET /api/music/:id/playlist-info
 * @desc    Müziğin bulunduğu admin playlist bilgilerini getir
 * @access  Public
 */
router.get('/:id/playlist-info', musicController.getMusicPlaylistInfo);

module.exports = router;