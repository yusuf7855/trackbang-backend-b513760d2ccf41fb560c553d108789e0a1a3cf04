// routes/playlistRoutes.js - Complete Playlist Management System
const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// ========== MULTER CONFIGURATION FOR PLAYLIST COVERS ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/playlist-covers/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'playlist-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (jpg, png, gif, webp)'));
    }
  }
});

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
 * @route   GET /api/playlists/:id
 * @desc    Belirli bir playlist'in detaylarını getir
 * @access  Public
 */
router.get('/:id', playlistController.getPlaylistById);

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
 * @desc    User playlist oluştur (Cover image ile veya otomatik)
 * @access  Private
 */
router.post('/', authMiddleware, upload.single('coverImage'), playlistController.createUserPlaylist);

/**
 * @route   GET /api/playlists/my-playlists
 * @desc    Kullanıcının kendi playlist'lerini getir
 * @access  Private
 */
router.get('/my-playlists', authMiddleware, playlistController.getMyPlaylists);

/**
 * @route   PUT /api/playlists/:id
 * @desc    Playlist güncelle (isim, cover, vb.)
 * @access  Private
 */
router.put('/:id', authMiddleware, upload.single('coverImage'), playlistController.updatePlaylist);

/**
 * @route   PATCH /api/playlists/:id/name
 * @desc    Playlist ismini değiştir
 * @access  Private
 */
router.patch('/:id/name', authMiddleware, playlistController.updatePlaylistName);

/**
 * @route   PATCH /api/playlists/:id/cover
 * @desc    Playlist cover'ını değiştir
 * @access  Private
 */
router.patch('/:id/cover', authMiddleware, upload.single('coverImage'), playlistController.updatePlaylistCover);

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Playlist sil
 * @access  Private
 */
router.delete('/:id', authMiddleware, playlistController.deletePlaylist);

// ========== TRACK MANAGEMENT ROUTES ==========

/**
 * @route   POST /api/playlists/:id/tracks
 * @desc    Playlist'e birden fazla track ekle
 * @access  Private
 * @body    { trackIds: [musicId1, musicId2, ...] }
 */
router.post('/:id/tracks', authMiddleware, playlistController.addTracksToPlaylist);

/**
 * @route   DELETE /api/playlists/:id/tracks
 * @desc    Playlist'ten track(ler) çıkar
 * @access  Private
 * @body    { trackIds: [musicId1, musicId2, ...] }
 */
router.delete('/:id/tracks', authMiddleware, playlistController.removeTracksFromPlaylist);

/**
 * @route   PUT /api/playlists/:id/tracks/reorder
 * @desc    Playlist'teki track sırasını değiştir
 * @access  Private
 * @body    { trackIds: [orderedMusicIds] } veya { fromIndex: 0, toIndex: 5 }
 */
router.put('/:id/tracks/reorder', authMiddleware, playlistController.reorderTracks);

/**
 * @route   PUT /api/playlists/:id/tracks/move-top
 * @desc    Seçili track(ler)i en üste taşı
 * @access  Private
 * @body    { trackIds: [musicId1, musicId2, ...] }
 */
router.put('/:id/tracks/move-top', authMiddleware, playlistController.moveTracksToTop);

/**
 * @route   PUT /api/playlists/:id/tracks/move-bottom
 * @desc    Seçili track(ler)i en alta taşı
 * @access  Private
 * @body    { trackIds: [musicId1, musicId2, ...] }
 */
router.put('/:id/tracks/move-bottom', authMiddleware, playlistController.moveTracksToBottom);

// ========== COVER GENERATION ==========

/**
 * @route   GET /api/playlists/:id/generate-cover
 * @desc    Playlist için otomatik cover oluştur (son 4 şarkıdan)
 * @access  Public
 */
router.get('/:id/generate-cover', playlistController.generatePlaylistCover);

// ========== LEGACY/COMPATIBILITY ==========

/**
 * @route   PUT /api/playlists/user/:id
 * @desc    User playlist güncelle (backward compatibility)
 * @access  Private
 */
router.put('/user/:id', authMiddleware, playlistController.updatePlaylist);

/**
 * @route   DELETE /api/playlists/user/:id
 * @desc    User playlist sil (backward compatibility)
 * @access  Private
 */
router.delete('/user/:id', authMiddleware, playlistController.deletePlaylist);

module.exports = router;