// controllers/musicController.js - Yeni Platform Link Sistemi ile Clean Code Versiyonu
const Music = require('../models/Music');
const Playlist = require('../models/Playlist');
const User = require('../models/userModel');
const mongoose = require('mongoose');

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

/**
 * MongoDB ID validation
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Platform linklerini validate et
 */
const validatePlatformLinks = (platformLinks) => {
  if (!platformLinks) return { isValid: false, message: 'En az bir platform linki gereklidir' };
  
  const { appleMusic, youtubeMusic, beatport, soundcloud } = platformLinks;
  
  if (!appleMusic && !youtubeMusic && !beatport && !soundcloud) {
    return { isValid: false, message: 'En az bir platform linki eklemelisiniz' };
  }
  
  return { isValid: true };
};

// ========== CREATE OPERATIONS ==========
/**
 * @route   POST /api/music
 * @desc    Yeni müzik ekle (Admin)
 * @access  Admin
 */
exports.addMusic = async (req, res) => {
  try {
    const {
      title,
      artist,
      imageUrl,
      imagePath,
      genre,
      platformLinks,
      metadata,
      isFeatured
    } = req.body;

    // Validation
    if (!title || !artist) {
      return errorResponse(res, 'Şarkı ismi ve sanatçı zorunludur', 400);
    }

    if (!imageUrl) {
      return errorResponse(res, 'Şarkı görseli zorunludur', 400);
    }

    if (!genre) {
      return errorResponse(res, 'Müzik türü (genre) zorunludur', 400);
    }

    // Platform linklerini validate et
    const linkValidation = validatePlatformLinks(platformLinks);
    if (!linkValidation.isValid) {
      return errorResponse(res, linkValidation.message, 400);
    }

    // Yeni müzik oluştur
    const newMusic = new Music({
      title: title.trim(),
      artist: artist.trim(),
      imageUrl,
      imagePath: imagePath || null,
      genre: genre.toLowerCase(),
      platformLinks: {
        appleMusic: platformLinks.appleMusic?.trim() || null,
        youtubeMusic: platformLinks.youtubeMusic?.trim() || null,
        beatport: platformLinks.beatport?.trim() || null,
        soundcloud: platformLinks.soundcloud?.trim() || null
      },
      metadata: metadata || {},
      isFeatured: isFeatured || false
    });

    await newMusic.save();

    console.log(`✅ New music added: ${newMusic.title} by ${newMusic.artist}`);

    return successResponse(
      res,
      { music: newMusic },
      'Müzik başarıyla eklendi',
      201
    );

  } catch (err) {
    console.error('❌ Add music error:', err);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return errorResponse(res, messages.join(', '), 400, err);
    }
    
    return errorResponse(res, 'Müzik eklenirken hata oluştu', 500, err);
  }
};

// ========== READ OPERATIONS ==========
/**
 * @route   GET /api/music
 * @desc    Tüm müzikleri getir
 * @access  Public
 */
exports.getAllMusic = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre,
      isFeatured,
      isActive = true,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { isActive };

    // Filters
    if (genre) query.genre = genre.toLowerCase();
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [music, total] = await Promise.all([
      Music.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Music.countDocuments(query)
    ]);

    return successResponse(res, {
      music,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get all music error:', err);
    return errorResponse(res, 'Müzikler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/:id
 * @desc    ID'ye göre müzik getir
 * @access  Public
 */
exports.getMusicById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    const music = await Music.findById(id).lean();

    if (!music) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    // View sayısını artır (fire and forget)
    Music.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();

    return successResponse(res, { music });

  } catch (err) {
    console.error('❌ Get music by ID error:', err);
    return errorResponse(res, 'Müzik getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/genre/:genre
 * @desc    Genre'ye göre müzikler
 * @access  Public
 */
exports.getMusicByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const validGenres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
    const normalizedGenre = genre.toLowerCase();

    if (!validGenres.includes(normalizedGenre)) {
      return errorResponse(res, 'Geçersiz müzik türü', 400);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [music, total] = await Promise.all([
      Music.find({ genre: normalizedGenre, isActive: true })
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Music.countDocuments({ genre: normalizedGenre, isActive: true })
    ]);

    return successResponse(res, {
      music,
      genre: normalizedGenre,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get music by genre error:', err);
    return errorResponse(res, 'Müzikler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/featured
 * @desc    Öne çıkan müzikler
 * @access  Public
 */
exports.getFeaturedMusic = async (req, res) => {
  try {
    const { genre, limit = 10 } = req.query;

    const options = {
      limit: parseInt(limit),
      genre: genre?.toLowerCase() || null
    };

    const music = await Music.findFeatured(options);

    return successResponse(res, {
      music,
      count: music.length
    });

  } catch (err) {
    console.error('❌ Get featured music error:', err);
    return errorResponse(res, 'Öne çıkan müzikler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/popular
 * @desc    Popüler müzikler
 * @access  Public
 */
exports.getPopularMusic = async (req, res) => {
  try {
    const { genre, limit = 10 } = req.query;

    const options = {
      limit: parseInt(limit),
      genre: genre?.toLowerCase() || null
    };

    const music = await Music.findPopular(options);

    return successResponse(res, {
      music,
      count: music.length
    });

  } catch (err) {
    console.error('❌ Get popular music error:', err);
    return errorResponse(res, 'Popüler müzikler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/new-releases
 * @desc    Yeni çıkan müzikler (Son 7 gün)
 * @access  Public
 */
exports.getNewReleases = async (req, res) => {
  try {
    const { genre, limit = 10 } = req.query;

    const options = {
      limit: parseInt(limit),
      genre: genre?.toLowerCase() || null
    };

    const music = await Music.findNewReleases(options);

    return successResponse(res, {
      music,
      count: music.length
    });

  } catch (err) {
    console.error('❌ Get new releases error:', err);
    return errorResponse(res, 'Yeni müzikler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/top10
 * @desc    Kategorilere göre en çok beğenilen 10 şarkı
 * @access  Public
 */
exports.getTop10ByCategory = async (req, res) => {
  try {
    const genres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
    const top10Data = {};

    // Her genre için top 10
    for (const genre of genres) {
      const top10 = await Music.find({ genre, isActive: true })
        .sort({ likes: -1, views: -1 })
        .limit(10)
        .lean();

      top10Data[genre] = top10.map((music, index) => ({
        ...music,
        rank: index + 1
      }));
    }

    // Tüm kategoriler için overall top 10
    const overallTop10 = await Music.find({ isActive: true })
      .sort({ likes: -1, views: -1 })
      .limit(10)
      .lean();

    top10Data.all = overallTop10.map((music, index) => ({
      ...music,
      rank: index + 1
    }));

    return successResponse(res, { top10: top10Data });

  } catch (err) {
    console.error('❌ Get top 10 error:', err);
    return errorResponse(res, 'Top 10 müzikler getirilirken hata oluştu', 500, err);
  }
};

// ========== UPDATE OPERATIONS ==========
/**
 * @route   PUT /api/music/:id
 * @desc    Müzik güncelle (Admin)
 * @access  Admin
 */
exports.updateMusic = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    // Güncellenmemesi gereken alanları kaldır
    delete updates._id;
    delete updates.createdAt;
    delete updates.likes;
    delete updates.userLikes;
    delete updates.views;

    // Genre normalize
    if (updates.genre) {
      updates.genre = updates.genre.toLowerCase();
    }

    // Platform linklerini validate et
    if (updates.platformLinks) {
      const linkValidation = validatePlatformLinks(updates.platformLinks);
      if (!linkValidation.isValid) {
        return errorResponse(res, linkValidation.message, 400);
      }
    }

    const updatedMusic = await Music.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedMusic) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    console.log(`✅ Music updated: ${updatedMusic.title}`);

    return successResponse(res, { music: updatedMusic }, 'Müzik başarıyla güncellendi');

  } catch (err) {
    console.error('❌ Update music error:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return errorResponse(res, messages.join(', '), 400, err);
    }
    
    return errorResponse(res, 'Müzik güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   POST /api/music/:id/like
 * @desc    Müziği beğen/beğenme
 * @access  Private
 */
exports.likeMusic = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    if (!userId || !isValidObjectId(userId)) {
      return errorResponse(res, 'Geçersiz kullanıcı ID', 400);
    }

    // Müziği bul
    const music = await Music.findById(id);
    if (!music) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    // Toggle like
    const result = await music.toggleLike(userId);
    const isLiked = result.userLikes.includes(userId);

    // Kullanıcının müzik aktivitesini güncelle
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.updateMusicActivity(isLiked ? 'like' : 'unlike');
      }
    } catch (userErr) {
      console.warn('⚠️ User activity update failed:', userErr.message);
    }

    return successResponse(res, {
      music: result,
      isLiked,
      totalLikes: result.likes
    }, isLiked ? 'Müzik beğenildi' : 'Beğeni kaldırıldı');

  } catch (err) {
    console.error('❌ Like music error:', err);
    return errorResponse(res, 'Beğeni işlemi sırasında hata oluştu', 500, err);
  }
};

// ========== DELETE OPERATIONS ==========
/**
 * @route   DELETE /api/music/:id
 * @desc    Müzik sil (Admin)
 * @access  Admin
 */
exports.deleteMusic = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    const music = await Music.findById(id);
    if (!music) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    // Playlist'lerden kaldır
    await Playlist.updateMany(
      { musics: id },
      { $pull: { musics: id } }
    );

    // Müziği sil
    await Music.findByIdAndDelete(id);

    console.log(`✅ Music deleted: ${music.title}`);

    return successResponse(res, {}, 'Müzik başarıyla silindi');

  } catch (err) {
    console.error('❌ Delete music error:', err);
    return errorResponse(res, 'Müzik silinirken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/music/:id/soft-delete
 * @desc    Müziği pasifleştir (Soft delete)
 * @access  Admin
 */
exports.softDeleteMusic = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    const music = await Music.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).lean();

    if (!music) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    return successResponse(res, { music }, 'Müzik pasifleştirildi');

  } catch (err) {
    console.error('❌ Soft delete music error:', err);
    return errorResponse(res, 'Müzik pasifleştirilirken hata oluştu', 500, err);
  }
};

// ========== SEARCH OPERATIONS ==========
/**
 * @route   GET /api/music/search
 * @desc    Müzik ara
 * @access  Public
 */
exports.searchMusic = async (req, res) => {
  try {
    const { query, limit = 20, skip = 0 } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip)
    };

    const music = await Music.searchMusic(query.trim(), options);

    return successResponse(res, {
      music,
      count: music.length,
      searchQuery: query.trim()
    });

  } catch (err) {
    console.error('❌ Search music error:', err);
    return errorResponse(res, 'Arama sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/search/artist
 * @desc    Sanatçıya göre ara
 * @access  Public
 */
exports.searchMusicByArtist = async (req, res) => {
  try {
    const { artist } = req.query;

    if (!artist || artist.trim().length === 0) {
      return errorResponse(res, 'Sanatçı adı gerekli', 400);
    }

    const searchTerm = artist.trim();

    const music = await Music.find({
      artist: { $regex: searchTerm, $options: 'i' },
      isActive: true
    })
    .sort({ likes: -1 })
    .limit(50)
    .lean();

    return successResponse(res, {
      music,
      count: music.length,
      artist: searchTerm
    });

  } catch (err) {
    console.error('❌ Search by artist error:', err);
    return errorResponse(res, 'Sanatçı araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/search/all
 * @desc    Müzik ve playlist ara (birleşik)
 * @access  Public
 */
exports.searchMusicAndPlaylists = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    const searchTerm = query.trim();

    const [musicResults, playlistResults] = await Promise.all([
      Music.find(
        { $text: { $search: searchTerm }, isActive: true },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(20).lean(),
      
      Playlist.find(
        { $text: { $search: searchTerm }, isPublic: true, isActive: true },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(20).lean()
    ]);

    return successResponse(res, {
      music: musicResults,
      playlists: playlistResults,
      searchQuery: searchTerm
    });

  } catch (err) {
    console.error('❌ Search all error:', err);
    return errorResponse(res, 'Arama sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/search/public
 * @desc    Public içerik ara
 * @access  Public
 */
exports.searchPublicContent = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    const searchTerm = query.trim();

    const [musicResults, playlistResults] = await Promise.all([
      Music.find(
        { $text: { $search: searchTerm }, isActive: true },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).lean(),
      
      Playlist.find(
        { $text: { $search: searchTerm }, isPublic: true, isActive: true },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).lean()
    ]);

    return successResponse(res, {
      music: musicResults,
      playlists: playlistResults
    });

  } catch (err) {
    console.error('❌ Search public content error:', err);
    return errorResponse(res, 'Arama sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/search/private
 * @desc    Private içerik ara (kullanıcıya özel)
 * @access  Private
 */
exports.searchPrivateContent = async (req, res) => {
  try {
    const { query, userId } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    if (!userId || !isValidObjectId(userId)) {
      return errorResponse(res, 'Geçerli kullanıcı ID gerekli', 400);
    }

    const searchTerm = query.trim();

    const [musicResults, playlistResults] = await Promise.all([
      Music.find(
        { $text: { $search: searchTerm }, isActive: true },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).lean(),
      
      Playlist.find(
        {
          $text: { $search: searchTerm },
          userId,
          isPublic: false,
          isActive: true
        },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).lean()
    ]);

    return successResponse(res, {
      music: musicResults,
      playlists: playlistResults
    });

  } catch (err) {
    console.error('❌ Search private content error:', err);
    return errorResponse(res, 'Arama sırasında hata oluştu', 500, err);
  }
};

// ========== PLAYLIST OPERATIONS ==========
/**
 * @route   POST /api/music/:id/add-to-playlist
 * @desc    Müziği playlist'e ekle
 * @access  Private
 */
exports.addToPlaylist = async (req, res) => {
  try {
    const { id: musicId } = req.params;
    const { playlistId, userId } = req.body;

    if (!isValidObjectId(musicId)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    if (!isValidObjectId(playlistId)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!isValidObjectId(userId)) {
      return errorResponse(res, 'Geçersiz kullanıcı ID', 400);
    }

    // Müzik var mı?
    const music = await Music.findById(musicId);
    if (!music) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    // Playlist var mı ve kullanıcıya ait mi?
    const playlist = await Playlist.findOne({ _id: playlistId, userId });
    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkiniz yok', 403);
    }

    // Zaten ekli mi?
    if (playlist.musics.includes(musicId)) {
      return errorResponse(res, 'Bu şarkı zaten playlist\'te var', 400);
    }

    // Playlist'e ekle
    await playlist.addMusic(musicId);

    return successResponse(res, {
      playlist: {
        id: playlist._id,
        name: playlist.name,
        musicCount: playlist.musics.length
      }
    }, 'Şarkı playlist\'e eklendi');

  } catch (err) {
    console.error('❌ Add to playlist error:', err);
    return errorResponse(res, 'Playlist\'e eklenirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/music/:id/playlist-info
 * @desc    Müziğin bulunduğu admin playlist bilgilerini getir
 * @access  Public
 */
exports.getMusicPlaylistInfo = async (req, res) => {
  try {
    const { id: musicId } = req.params;

    if (!isValidObjectId(musicId)) {
      return errorResponse(res, 'Geçersiz müzik ID', 400);
    }

    // Müzik var mı?
    const music = await Music.findById(musicId).lean();
    if (!music) {
      return errorResponse(res, 'Müzik bulunamadı', 404);
    }

    // Admin playlist'lerde ara
    const adminPlaylists = await Playlist.find({
      musics: musicId,
      isAdminPlaylist: true,
      isPublic: true,
      isActive: true
    })
    .select('name genre subCategory description _id')
    .lean();

    if (adminPlaylists.length === 0) {
      return errorResponse(res, 'Bu müzik herhangi bir admin playlist\'te bulunamadı', 404);
    }

    // Genre title mapping
    const genreTitles = {
      'afrohouse': 'Afro House',
      'indiedance': 'Indie Dance',
      'organichouse': 'Organic House',
      'downtempo': 'Down Tempo',
      'melodichouse': 'Melodic House'
    };

    const primaryPlaylist = adminPlaylists[0];

    return successResponse(res, {
      playlist: {
        ...primaryPlaylist,
        genreTitle: genreTitles[primaryPlaylist.genre] || primaryPlaylist.genre
      },
      allAdminPlaylists: adminPlaylists.map(p => ({
        ...p,
        genreTitle: genreTitles[p.genre] || p.genre
      }))
    });

  } catch (err) {
    console.error('❌ Get music playlist info error:', err);
    return errorResponse(res, 'Playlist bilgisi alınırken hata oluştu', 500, err);
  }
};

// Backward compatibility için eski endpoint
exports.getMusicByCategory = exports.getMusicByGenre;

module.exports = exports;