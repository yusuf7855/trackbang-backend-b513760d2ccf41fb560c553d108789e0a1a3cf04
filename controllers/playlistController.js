// controllers/playlistController.js - Clean Code Versiyonu (Cover Image + Platform Links)
const Playlist = require('../models/Playlist');
const Music = require('../models/Music');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// ========== CONSTANTS ==========
const VALID_GENRES = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
const ADMIN_USER_ID = '507f1f77bcf86cd799439011'; // Sabit admin ID

// Genre display names
const GENRE_DISPLAY_NAMES = {
  'afrohouse': 'Afro House',
  'indiedance': 'Indie Dance',
  'organichouse': 'Organic House',
  'downtempo': 'Down Tempo',
  'melodichouse': 'Melodic House'
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
 * MongoDB ID validation
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Genre validation
 */
const isValidGenre = (genre) => {
  return VALID_GENRES.includes(genre?.toLowerCase());
};

/**
 * Müzik datasını formatla
 */
const formatMusicData = (music) => {
  if (!music) return null;

  return {
    _id: music._id,
    title: music.title,
    artist: music.artist,
    imageUrl: music.imageUrl,
    genre: music.genre,
    platformLinks: {
      spotify: music.platformLinks?.spotify || null,
      appleMusic: music.platformLinks?.appleMusic || null,
      youtubeMusic: music.platformLinks?.youtubeMusic || null,
      beatport: music.platformLinks?.beatport || null,
      soundcloud: music.platformLinks?.soundcloud || null
    },
    likes: music.likes || 0,
    views: music.views || 0,
    userLikes: music.userLikes || [],
    isFeatured: music.isFeatured || false
  };
};

/**
 * Playlist datasını formatla
 */
const formatPlaylistData = (playlist, includeMusics = true) => {
  if (!playlist) return null;

  const formatted = {
    _id: playlist._id,
    name: playlist.name,
    description: playlist.description || '',
    genre: playlist.genre,
    genreDisplayName: GENRE_DISPLAY_NAMES[playlist.genre] || playlist.genre,
    isAdminPlaylist: playlist.isAdminPlaylist,
    isPublic: playlist.isPublic,
    coverImage: playlist.coverImage || null,
    musicCount: playlist.musics?.length || 0,
    likes: playlist.likes || 0,
    views: playlist.views || 0,
    followerCount: playlist.followers?.length || 0,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt
  };

  // Admin playlist özellikleri
  if (playlist.isAdminPlaylist) {
    formatted.subCategory = playlist.subCategory;
  }

  // Owner bilgisi
  if (playlist.userId) {
    formatted.owner = {
      _id: playlist.userId._id || playlist.userId,
      username: playlist.userId.username || 'admin',
      displayName: playlist.userId.firstName
        ? `${playlist.userId.firstName} ${playlist.userId.lastName}`
        : 'Admin User',
      profileImage: playlist.userId.profileImage || null
    };
  } else {
    formatted.owner = {
      _id: 'admin',
      username: 'admin',
      displayName: 'Admin User',
      profileImage: null
    };
  }

  // Müzik listesi
  if (includeMusics && playlist.musics && Array.isArray(playlist.musics)) {
    formatted.musics = playlist.musics.map(formatMusicData).filter(Boolean);
  }

  return formatted;
};

/**
 * Müziklerin varlığını kontrol et
 */
const validateMusicIds = async (musicIds) => {
  if (!musicIds || musicIds.length === 0) {
    return { valid: true, existingMusics: [] };
  }

  const existingMusics = await Music.find({
    _id: { $in: musicIds },
    isActive: true
  });

  if (existingMusics.length !== musicIds.length) {
    return {
      valid: false,
      message: 'Bazı şarkılar bulunamadı veya aktif değil'
    };
  }

  return { valid: true, existingMusics };
};

/**
 * SubCategory formatı validate et (AH1, MH1, vb.)
 */
const validateSubCategory = (subCategory) => {
  if (!subCategory) return false;
  return /^[A-Z]{2}\d+$/.test(subCategory.toUpperCase());
};

// ========== ADMIN PLAYLIST OPERATIONS ==========
/**
 * @route   POST /api/playlists/admin
 * @desc    Admin playlist oluştur (Cover Image ile)
 * @access  Admin
 */
exports.createAdminPlaylist = async (req, res) => {
  try {
    const {
      name,
      description,
      genre,
      subCategory,
      musicIds,
      coverImage,
      coverImagePath
    } = req.body;

    console.log('Creating admin playlist:', {
      name,
      genre,
      subCategory,
      coverImage: coverImage ? 'present' : 'none',
      musicCount: musicIds?.length || 0
    });

    // Validations
    if (!name || name.trim().length === 0) {
      return errorResponse(res, 'Playlist ismi zorunludur', 400);
    }

    if (!genre) {
      return errorResponse(res, 'Genre zorunludur', 400);
    }

    if (!isValidGenre(genre)) {
      return errorResponse(res, 'Geçersiz genre', 400);
    }

    if (!subCategory) {
      return errorResponse(res, 'Alt kategori zorunludur', 400);
    }

    if (!validateSubCategory(subCategory)) {
      return errorResponse(res, 'Alt kategori formatı geçersiz (Örn: AH1, MH1)', 400);
    }

    // Müzikleri validate et
    const musicValidation = await validateMusicIds(musicIds);
    if (!musicValidation.valid) {
      return errorResponse(res, musicValidation.message, 400);
    }

    // Playlist oluştur
    const newPlaylist = new Playlist({
      name: name.trim(),
      description: description?.trim() || '',
      userId: ADMIN_USER_ID,
      genre: genre.toLowerCase(),
      subCategory: subCategory.toUpperCase(),
      musics: musicIds || [],
      coverImage: coverImage || null,
      isAdminPlaylist: true,
      isPublic: true,
      isActive: true
    });

    await newPlaylist.save();

    console.log('✅ Admin playlist created:', newPlaylist._id);

    return successResponse(
      res,
      {
        playlist: formatPlaylistData(newPlaylist, false)
      },
      'Admin playlist başarıyla oluşturuldu',
      201
    );

  } catch (err) {
    console.error('❌ Create admin playlist error:', err);

    // Duplicate key error
    if (err.code === 11000) {
      return errorResponse(
        res,
        'Bu genre ve alt kategori kombinasyonu zaten mevcut',
        400,
        err
      );
    }

    // Validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return errorResponse(res, messages.join(', '), 400, err);
    }

    return errorResponse(res, 'Admin playlist oluşturulurken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/admin
 * @desc    Admin playlist'leri listele
 * @access  Public
 */
exports.getAllAdminPlaylists = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { isAdminPlaylist: true, isActive: true };

    // Genre filter
    if (genre && genre !== 'all') {
      if (!isValidGenre(genre)) {
        return errorResponse(res, 'Geçersiz genre', 400);
      }
      filter.genre = genre.toLowerCase();
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views'
        })
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasMore: skip + playlists.length < total
      }
    });

  } catch (err) {
    console.error('❌ Get admin playlists error:', err);
    return errorResponse(res, 'Admin playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/playlists/admin/:id
 * @desc    Admin playlist güncelle
 * @access  Admin
 */
exports.updateAdminPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, musicIds, coverImage } = req.body;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    console.log('Updating admin playlist:', id);

    // Playlist bul
    const playlist = await Playlist.findOne({
      _id: id,
      isAdminPlaylist: true,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Admin playlist bulunamadı', 404);
    }

    // Müzikleri validate et
    if (musicIds) {
      const musicValidation = await validateMusicIds(musicIds);
      if (!musicValidation.valid) {
        return errorResponse(res, musicValidation.message, 400);
      }
    }

    // Update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (musicIds !== undefined) updateData.musics = musicIds;
    if (coverImage !== undefined) updateData.coverImage = coverImage;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    console.log('✅ Admin playlist updated:', id);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, false)
    }, 'Admin playlist başarıyla güncellendi');

  } catch (err) {
    console.error('❌ Update admin playlist error:', err);
    return errorResponse(res, 'Admin playlist güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   DELETE /api/playlists/admin/:id
 * @desc    Admin playlist sil
 * @access  Admin
 */
exports.deleteAdminPlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    console.log('Deleting admin playlist:', id);

    const deletedPlaylist = await Playlist.findOneAndDelete({
      _id: id,
      isAdminPlaylist: true
    });

    if (!deletedPlaylist) {
      return errorResponse(res, 'Admin playlist bulunamadı', 404);
    }

    console.log('✅ Admin playlist deleted:', id);

    return successResponse(res, {}, 'Admin playlist başarıyla silindi');

  } catch (err) {
    console.error('❌ Delete admin playlist error:', err);
    return errorResponse(res, 'Admin playlist silinirken hata oluştu', 500, err);
  }
};

// ========== USER PLAYLIST OPERATIONS ==========
/**
 * @route   POST /api/playlists
 * @desc    User playlist oluştur
 * @access  Private
 */
exports.createUserPlaylist = async (req, res) => {
  try {
    const { name, description, genre, isPublic, musicId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    console.log('Creating user playlist:', { name, genre, isPublic, userId });

    // Validations
    if (!name || name.trim().length === 0) {
      return errorResponse(res, 'Playlist ismi zorunludur', 400);
    }

    if (!genre) {
      return errorResponse(res, 'Genre zorunludur', 400);
    }

    if (!isValidGenre(genre)) {
      return errorResponse(res, 'Geçersiz genre', 400);
    }

    // Müzik listesi
    let musicIds = [];
    if (musicId) {
      musicIds = [musicId];

      const musicValidation = await validateMusicIds(musicIds);
      if (!musicValidation.valid) {
        return errorResponse(res, musicValidation.message, 400);
      }
    }

    // Playlist oluştur
    const newPlaylist = new Playlist({
      name: name.trim(),
      description: description?.trim() || '',
      userId,
      genre: genre.toLowerCase(),
      isPublic: isPublic || false,
      musics: musicIds,
      isAdminPlaylist: false,
      isActive: true
    });

    await newPlaylist.save();

    // User'ın playlist sayısını güncelle
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.updateMusicActivity('create_playlist');
      }
    } catch (userErr) {
      console.warn('⚠️ User activity update failed:', userErr.message);
    }

    console.log('✅ User playlist created:', newPlaylist._id);

    return successResponse(
      res,
      {
        playlist: formatPlaylistData(newPlaylist, false)
      },
      'Playlist başarıyla oluşturuldu',
      201
    );

  } catch (err) {
    console.error('❌ Create user playlist error:', err);
    return errorResponse(res, 'Playlist oluşturulurken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/user/:userId
 * @desc    Kullanıcının playlist'lerini getir
 * @access  Public
 */
exports.getUserPlaylists = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, includePrivate = false } = req.query;

    if (!isValidObjectId(userId)) {
      return errorResponse(res, 'Geçersiz kullanıcı ID', 400);
    }

    const requestUserId = req.userId;
    const isOwnProfile = requestUserId === userId;

    // Filter
    const filter = {
      userId,
      isAdminPlaylist: false,
      isActive: true
    };

    // Private playlist'leri sadece kendi profilinde göster
    if (!isOwnProfile || includePrivate === 'false') {
      filter.isPublic = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views',
          options: { limit: 10 }
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get user playlists error:', err);
    return errorResponse(res, 'Kullanıcı playlist\'leri getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/playlists/user/:id
 * @desc    User playlist güncelle
 * @access  Private
 */
exports.updateUserPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, musicIds, isPublic } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    console.log('Updating user playlist:', id, 'by user:', userId);

    // Playlist'in sahibi mi kontrol et
    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // Müzikleri validate et
    if (musicIds) {
      const musicValidation = await validateMusicIds(musicIds);
      if (!musicValidation.valid) {
        return errorResponse(res, musicValidation.message, 400);
      }
    }

    // Update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (musicIds !== undefined) updateData.musics = musicIds;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    console.log('✅ User playlist updated:', id);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, false)
    }, 'Playlist başarıyla güncellendi');

  } catch (err) {
    console.error('❌ Update user playlist error:', err);
    return errorResponse(res, 'Playlist güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   DELETE /api/playlists/user/:id
 * @desc    User playlist sil
 * @access  Private
 */
exports.deleteUserPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    console.log('Deleting user playlist:', id, 'by user:', userId);

    const deletedPlaylist = await Playlist.findOneAndDelete({
      _id: id,
      userId,
      isAdminPlaylist: false
    });

    if (!deletedPlaylist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // User'ın playlist sayısını güncelle
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.updateMusicActivity('delete_playlist');
      }
    } catch (userErr) {
      console.warn('⚠️ User activity update failed:', userErr.message);
    }

    console.log('✅ User playlist deleted:', id);

    return successResponse(res, {}, 'Playlist başarıyla silindi');

  } catch (err) {
    console.error('❌ Delete user playlist error:', err);
    return errorResponse(res, 'Playlist silinirken hata oluştu', 500, err);
  }
};

// ========== PUBLIC PLAYLISTS ==========
/**
 * @route   GET /api/playlists/public
 * @desc    Public playlist'leri getir (admin + user)
 * @access  Public
 */
exports.getPublicPlaylists = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = 'all',
      genre
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { isPublic: true, isActive: true };

    // Type filter
    if (type === 'user') {
      filter.isAdminPlaylist = false;
    } else if (type === 'admin') {
      filter.isAdminPlaylist = true;
    }

    // Genre filter
    if (genre && genre !== 'all') {
      if (!isValidGenre(genre)) {
        return errorResponse(res, 'Geçersiz genre', 400);
      }
      filter.genre = genre.toLowerCase();
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views',
          options: { limit: 10 }
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasMore: skip + playlists.length < total
      }
    });

  } catch (err) {
    console.error('❌ Get public playlists error:', err);
    return errorResponse(res, 'Public playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/public-world
 * @desc    Tüm public user playlist'leri (world feed)
 * @access  Public
 */
exports.getPublicWorldPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find({
        isPublic: true,
        isAdminPlaylist: false,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views',
          options: { limit: 10 }
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments({
        isPublic: true,
        isAdminPlaylist: false,
        isActive: true
      })
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get public world playlists error:', err);
    return errorResponse(res, 'Public world playlist\'leri getirilirken hata oluştu', 500, err);
  }
};

// ========== CATEGORY/GENRE OPERATIONS ==========
/**
 * @route   GET /api/playlists/category/:category
 * @desc    Genre'ye göre admin playlist'leri getir
 * @access  Public
 */
exports.getPlaylistsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!isValidGenre(category)) {
      return errorResponse(res, 'Geçersiz genre', 400);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const normalizedGenre = category.toLowerCase();

    console.log(`Fetching admin playlists for genre: ${normalizedGenre}`);

    const [playlists, total] = await Promise.all([
      Playlist.find({
        genre: normalizedGenre,
        isAdminPlaylist: true,
        isPublic: true,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views'
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ subCategory: 1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments({
        genre: normalizedGenre,
        isAdminPlaylist: true,
        isPublic: true,
        isActive: true
      })
    ]);

    console.log(`Found ${playlists.length} admin playlists for genre: ${normalizedGenre}`);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      genre: normalizedGenre,
      genreDisplayName: GENRE_DISPLAY_NAMES[normalizedGenre],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasMore: skip + playlists.length < total
      }
    });

  } catch (err) {
    console.error('❌ Get playlists by category error:', err);
    return errorResponse(res, 'Genre playlist\'leri getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/hot/latest
 * @desc    Her genre'den en son admin playlist'i (HOT page)
 * @access  Public
 */
exports.getLatestPlaylistsByCategory = async (req, res) => {
  try {
    const latestPlaylists = [];

    // Her genre için paralel query
    const playlistPromises = VALID_GENRES.map(genre =>
      Playlist.findOne({
        genre,
        isAdminPlaylist: true,
        isPublic: true,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views',
          options: { limit: 10 }
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ createdAt: -1 })
        .lean()
    );

    const results = await Promise.all(playlistPromises);

    results.forEach((playlist, index) => {
      const genre = VALID_GENRES[index];

      if (playlist) {
        latestPlaylists.push(formatPlaylistData(playlist));
      } else {
        latestPlaylists.push({
          genre,
          genreDisplayName: GENRE_DISPLAY_NAMES[genre],
          isEmpty: true,
          message: `${GENRE_DISPLAY_NAMES[genre]} için henüz playlist yok`
        });
      }
    });

    return successResponse(res, {
      hotPlaylists: latestPlaylists
    }, 'Her genre\'den en son playlist\'ler');

  } catch (err) {
    console.error('❌ Get latest playlists error:', err);
    return errorResponse(res, 'En son playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

// ========== FOLLOWING OPERATIONS ==========
/**
 * @route   GET /api/playlists/following/:userId
 * @desc    Takip edilen kullanıcıların playlist'leri
 * @access  Public
 */
exports.getFollowingPlaylists = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!isValidObjectId(userId)) {
      return errorResponse(res, 'Geçersiz kullanıcı ID', 400);
    }

    // User'ın following listesi
    const user = await User.findById(userId).select('following').lean();

    if (!user || !user.following || user.following.length === 0) {
      return successResponse(res, {
        playlists: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find({
        userId: { $in: user.following },
        isAdminPlaylist: false,
        isPublic: true,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views',
          options: { limit: 10 }
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments({
        userId: { $in: user.following },
        isAdminPlaylist: false,
        isPublic: true,
        isActive: true
      })
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get following playlists error:', err);
    return errorResponse(res, 'Takip edilen playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

// ========== SEARCH OPERATIONS ==========
/**
 * @route   GET /api/playlists/search
 * @desc    Public playlist arama
 * @access  Public
 */
exports.searchPlaylists = async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    const searchTerm = query.trim();

    const playlists = await Playlist.find({
      $text: { $search: searchTerm },
      isPublic: true,
      isActive: true
    }, {
      score: { $meta: 'textScore' }
    })
      .populate({
        path: 'userId',
        select: 'username firstName lastName profileImage'
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .lean();

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, false)),
      count: playlists.length,
      searchQuery: searchTerm
    });

  } catch (err) {
    console.error('❌ Search playlists error:', err);
    return errorResponse(res, 'Playlist arama sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/search-private
 * @desc    Private playlist arama (kullanıcıya özel)
 * @access  Private
 */
exports.searchPrivatePlaylists = async (req, res) => {
  try {
    const { query, userId } = req.query;
    const requestUserId = req.userId;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    if (!userId || userId !== requestUserId) {
      return errorResponse(res, 'Yetkisiz erişim', 403);
    }

    const searchTerm = query.trim();

    const playlists = await Playlist.find({
      userId,
      isAdminPlaylist: false,
      isPublic: false,
      isActive: true,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks likes views'
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p)),
      count: playlists.length,
      searchQuery: searchTerm
    });

  } catch (err) {
    console.error('❌ Search private playlists error:', err);
    return errorResponse(res, 'Private playlist arama sırasında hata oluştu', 500, err);
  }
};

// ========== LEGACY/COMPATIBILITY ==========
/**
 * @route   DELETE /api/playlists/:id
 * @desc    Playlist sil (admin/user otomatik tespit)
 * @access  Public/Private
 */
exports.deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    console.log('Deleting playlist:', id);

    // Playlist'i bul
    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı', 404);
    }

    // Admin playlist ise
    if (playlist.isAdminPlaylist) {
      return exports.deleteAdminPlaylist(req, res);
    }

    // User playlist ise
    return exports.deleteUserPlaylist(req, res);

  } catch (err) {
    console.error('❌ Delete playlist error:', err);
    return errorResponse(res, 'Playlist silinirken hata oluştu', 500, err);
  }
};

module.exports = exports;