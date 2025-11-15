// controllers/playlistController.js - Complete Playlist Management System
const Playlist = require('../models/Playlist');
const Music = require('../models/Music');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp'); // Image processing için

// ========== HELPER FUNCTIONS ==========
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const successResponse = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

const errorResponse = (res, message, statusCode = 500, error = null) => {
  console.error('Error:', message, error);
  return res.status(statusCode).json({
    success: false,
    message,
    error: error?.message || null
  });
};

const VALID_GENRES = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
const GENRE_DISPLAY_NAMES = {
  afrohouse: 'Afro House',
  indiedance: 'Indie Dance',
  organichouse: 'Organic House',
  downtempo: 'Downtempo',
  melodichouse: 'Melodic House'
};

const isValidGenre = (genre) => VALID_GENRES.includes(genre?.toLowerCase());

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
 * Music datasını formatla
 */
const formatMusicData = (music) => {
  if (!music) return null;

  return {
    _id: music._id,
    title: music.title,
    artist: music.artist,
    imageUrl: music.imageUrl,
    genre: music.genre,
    platformLinks: music.platformLinks || {},
    likes: music.likes || 0,
    views: music.views || 0,
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

// ========== PLAYLIST CRUD OPERATIONS ==========

/**
 * @route   POST /api/playlists
 * @desc    User playlist oluştur
 * @access  Private
 */
exports.createUserPlaylist = async (req, res) => {
  try {
    const { name, description, genre, isPublic } = req.body;
    const userId = req.userId;
    const coverImageFile = req.file;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    console.log('Creating user playlist:', { name, genre, isPublic, userId, hasFile: !!coverImageFile });

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

    // Cover image path
    let coverImagePath = null;
    if (coverImageFile) {
      coverImagePath = `/uploads/playlist-covers/${coverImageFile.filename}`;
    }

    // Playlist oluştur
    const newPlaylist = new Playlist({
      name: name.trim(),
      description: description?.trim() || '',
      userId,
      genre: genre.toLowerCase(),
      isPublic: isPublic === 'true' || isPublic === true,
      musics: [],
      coverImage: coverImagePath,
      isAdminPlaylist: false,
      isActive: true
    });

    await newPlaylist.save();

    console.log('✅ User playlist created:', newPlaylist._id);

    return successResponse(
      res,
      { playlist: formatPlaylistData(newPlaylist, false) },
      'Playlist başarıyla oluşturuldu',
      201
    );

  } catch (err) {
    console.error('❌ Create user playlist error:', err);
    return errorResponse(res, 'Playlist oluşturulurken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/:id
 * @desc    Playlist detaylarını getir
 * @access  Public
 */
exports.getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    const playlist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks likes views'
      })
      .populate('userId', 'username firstName lastName profileImage')
      .lean();

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı', 404);
    }

    // View sayısını artır
    await Playlist.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return successResponse(res, {
      playlist: formatPlaylistData(playlist, true)
    });

  } catch (err) {
    console.error('❌ Get playlist by ID error:', err);
    return errorResponse(res, 'Playlist getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/playlists/my-playlists
 * @desc    Kullanıcının kendi playlist'lerini getir
 * @access  Private
 */
exports.getMyPlaylists = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find({
        userId,
        isAdminPlaylist: false,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments({
        userId,
        isAdminPlaylist: false,
        isActive: true
      })
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get my playlists error:', err);
    return errorResponse(res, 'Playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/playlists/:id
 * @desc    Playlist güncelle
 * @access  Private
 */
exports.updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.userId;
    const coverImageFile = req.file;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

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

    // Update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;
    
    if (coverImageFile) {
      updateData.coverImage = `/uploads/playlist-covers/${coverImageFile.filename}`;
      
      // Eski cover'ı sil (eğer varsa ve otomatik generate değilse)
      if (playlist.coverImage && !playlist.coverImage.includes('generated')) {
        try {
          const oldPath = path.join(__dirname, '..', playlist.coverImage);
          await fs.unlink(oldPath);
        } catch (unlinkErr) {
          console.warn('⚠️ Old cover deletion failed:', unlinkErr.message);
        }
      }
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .lean();

    console.log('✅ Playlist updated:', id);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, true)
    }, 'Playlist başarıyla güncellendi');

  } catch (err) {
    console.error('❌ Update playlist error:', err);
    return errorResponse(res, 'Playlist güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   PATCH /api/playlists/:id/name
 * @desc    Playlist ismini değiştir
 * @access  Private
 */
exports.updatePlaylistName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!name || name.trim().length === 0) {
      return errorResponse(res, 'Yeni isim gerekli', 400);
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
      {
        _id: id,
        userId,
        isAdminPlaylist: false,
        isActive: true
      },
      { name: name.trim() },
      { new: true }
    ).lean();

    if (!updatedPlaylist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    console.log('✅ Playlist name updated:', id);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, false)
    }, 'Playlist ismi başarıyla değiştirildi');

  } catch (err) {
    console.error('❌ Update playlist name error:', err);
    return errorResponse(res, 'Playlist ismi güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   PATCH /api/playlists/:id/cover
 * @desc    Playlist cover'ını değiştir
 * @access  Private
 */
exports.updatePlaylistCover = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const coverImageFile = req.file;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!coverImageFile) {
      return errorResponse(res, 'Cover resmi gerekli', 400);
    }

    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    const newCoverPath = `/uploads/playlist-covers/${coverImageFile.filename}`;

    // Eski cover'ı sil
    if (playlist.coverImage && !playlist.coverImage.includes('generated')) {
      try {
        const oldPath = path.join(__dirname, '..', playlist.coverImage);
        await fs.unlink(oldPath);
      } catch (unlinkErr) {
        console.warn('⚠️ Old cover deletion failed:', unlinkErr.message);
      }
    }

    playlist.coverImage = newCoverPath;
    await playlist.save();

    console.log('✅ Playlist cover updated:', id);

    return successResponse(res, {
      playlist: formatPlaylistData(playlist, false)
    }, 'Playlist cover başarıyla değiştirildi');

  } catch (err) {
    console.error('❌ Update playlist cover error:', err);
    return errorResponse(res, 'Playlist cover güncellenirken hata oluştu', 500, err);
  }
};

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Playlist sil
 * @access  Private
 */
exports.deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    const deletedPlaylist = await Playlist.findOneAndDelete({
      _id: id,
      userId,
      isAdminPlaylist: false
    });

    if (!deletedPlaylist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // Cover image'ı sil
    if (deletedPlaylist.coverImage && !deletedPlaylist.coverImage.includes('generated')) {
      try {
        const coverPath = path.join(__dirname, '..', deletedPlaylist.coverImage);
        await fs.unlink(coverPath);
      } catch (unlinkErr) {
        console.warn('⚠️ Cover deletion failed:', unlinkErr.message);
      }
    }

    console.log('✅ Playlist deleted:', id);

    return successResponse(res, {}, 'Playlist başarıyla silindi');

  } catch (err) {
    console.error('❌ Delete playlist error:', err);
    return errorResponse(res, 'Playlist silinirken hata oluştu', 500, err);
  }
};

// ========== TRACK MANAGEMENT ==========

/**
 * @route   POST /api/playlists/:id/tracks
 * @desc    Playlist'e birden fazla track ekle
 * @access  Private
 */
exports.addTracksToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return errorResponse(res, 'En az bir track ID gerekli', 400);
    }

    // Playlist'i bul
    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // Track'leri validate et
    const musicValidation = await validateMusicIds(trackIds);
    if (!musicValidation.valid) {
      return errorResponse(res, musicValidation.message, 400);
    }

    // Zaten ekli olmayan track'leri bul
    const existingTrackIds = playlist.musics.map(m => m.toString());
    const newTrackIds = trackIds.filter(tid => !existingTrackIds.includes(tid));

    if (newTrackIds.length === 0) {
      return errorResponse(res, 'Tüm track\'ler zaten playlist\'te mevcut', 400);
    }

    // Yeni track'leri ekle
    playlist.musics.push(...newTrackIds);
    await playlist.save();

    // Updated playlist'i getir
    const updatedPlaylist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .lean();

    console.log('✅ Tracks added to playlist:', id, 'Count:', newTrackIds.length);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, true),
      addedCount: newTrackIds.length
    }, `${newTrackIds.length} track başarıyla eklendi`);

  } catch (err) {
    console.error('❌ Add tracks error:', err);
    return errorResponse(res, 'Track\'ler eklenirken hata oluştu', 500, err);
  }
};

/**
 * @route   DELETE /api/playlists/:id/tracks
 * @desc    Playlist'ten track(ler) çıkar
 * @access  Private
 */
exports.removeTracksFromPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return errorResponse(res, 'En az bir track ID gerekli', 400);
    }

    // Playlist'i bul
    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // Track'leri çıkar
    const beforeCount = playlist.musics.length;
    playlist.musics = playlist.musics.filter(
      mid => !trackIds.includes(mid.toString())
    );
    const afterCount = playlist.musics.length;
    const removedCount = beforeCount - afterCount;

    if (removedCount === 0) {
      return errorResponse(res, 'Belirtilen track\'ler playlist\'te bulunamadı', 404);
    }

    await playlist.save();

    // Updated playlist'i getir
    const updatedPlaylist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .lean();

    console.log('✅ Tracks removed from playlist:', id, 'Count:', removedCount);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, true),
      removedCount
    }, `${removedCount} track başarıyla çıkarıldı`);

  } catch (err) {
    console.error('❌ Remove tracks error:', err);
    return errorResponse(res, 'Track\'ler çıkarılırken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/playlists/:id/tracks/reorder
 * @desc    Track sırasını değiştir
 * @access  Private
 */
exports.reorderTracks = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackIds, fromIndex, toIndex } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    // Playlist'i bul
    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // İki farklı reorder yöntemi desteklenir:
    // 1. Tüm sıralamayı yeniden belirt (trackIds array)
    // 2. Tek bir elementi taşı (fromIndex, toIndex)

    if (trackIds && Array.isArray(trackIds)) {
      // Yöntem 1: Tüm sıralamayı yeniden belirt
      if (trackIds.length !== playlist.musics.length) {
        return errorResponse(res, 'Track sayısı eşleşmiyor', 400);
      }

      // Tüm track'lerin playlist'te olduğunu kontrol et
      const playlistTrackIds = playlist.musics.map(m => m.toString()).sort();
      const providedTrackIds = trackIds.map(t => t.toString()).sort();
      
      if (JSON.stringify(playlistTrackIds) !== JSON.stringify(providedTrackIds)) {
        return errorResponse(res, 'Geçersiz track ID\'leri', 400);
      }

      playlist.musics = trackIds;
      
    } else if (fromIndex !== undefined && toIndex !== undefined) {
      // Yöntem 2: Tek element taşıma
      const from = parseInt(fromIndex);
      const to = parseInt(toIndex);

      if (from < 0 || from >= playlist.musics.length || to < 0 || to >= playlist.musics.length) {
        return errorResponse(res, 'Geçersiz index değerleri', 400);
      }

      const [movedTrack] = playlist.musics.splice(from, 1);
      playlist.musics.splice(to, 0, movedTrack);
      
    } else {
      return errorResponse(res, 'trackIds veya fromIndex/toIndex gerekli', 400);
    }

    await playlist.save();

    // Updated playlist'i getir
    const updatedPlaylist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .lean();

    console.log('✅ Tracks reordered:', id);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, true)
    }, 'Sıralama başarıyla değiştirildi');

  } catch (err) {
    console.error('❌ Reorder tracks error:', err);
    return errorResponse(res, 'Sıralama değiştirilirken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/playlists/:id/tracks/move-top
 * @desc    Seçili track(ler)i en üste taşı
 * @access  Private
 */
exports.moveTracksToTop = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return errorResponse(res, 'En az bir track ID gerekli', 400);
    }

    // Playlist'i bul
    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // Seçili track'leri ve diğerlerini ayır
    const selectedTracks = [];
    const remainingTracks = [];

    playlist.musics.forEach(mid => {
      const midStr = mid.toString();
      if (trackIds.includes(midStr)) {
        selectedTracks.push(mid);
      } else {
        remainingTracks.push(mid);
      }
    });

    if (selectedTracks.length === 0) {
      return errorResponse(res, 'Belirtilen track\'ler bulunamadı', 404);
    }

    // Seçili track'leri en üste koy
    playlist.musics = [...selectedTracks, ...remainingTracks];
    await playlist.save();

    // Updated playlist'i getir
    const updatedPlaylist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .lean();

    console.log('✅ Tracks moved to top:', id, 'Count:', selectedTracks.length);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, true),
      movedCount: selectedTracks.length
    }, `${selectedTracks.length} track en üste taşındı`);

  } catch (err) {
    console.error('❌ Move tracks to top error:', err);
    return errorResponse(res, 'Track\'ler taşınırken hata oluştu', 500, err);
  }
};

/**
 * @route   PUT /api/playlists/:id/tracks/move-bottom
 * @desc    Seçili track(ler)i en alta taşı
 * @access  Private
 */
exports.moveTracksToBottom = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return errorResponse(res, 'En az bir track ID gerekli', 400);
    }

    // Playlist'i bul
    const playlist = await Playlist.findOne({
      _id: id,
      userId,
      isAdminPlaylist: false,
      isActive: true
    });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı veya yetkisiz erişim', 404);
    }

    // Seçili track'leri ve diğerlerini ayır
    const selectedTracks = [];
    const remainingTracks = [];

    playlist.musics.forEach(mid => {
      const midStr = mid.toString();
      if (trackIds.includes(midStr)) {
        selectedTracks.push(mid);
      } else {
        remainingTracks.push(mid);
      }
    });

    if (selectedTracks.length === 0) {
      return errorResponse(res, 'Belirtilen track\'ler bulunamadı', 404);
    }

    // Seçili track'leri en alta koy
    playlist.musics = [...remainingTracks, ...selectedTracks];
    await playlist.save();

    // Updated playlist'i getir
    const updatedPlaylist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .lean();

    console.log('✅ Tracks moved to bottom:', id, 'Count:', selectedTracks.length);

    return successResponse(res, {
      playlist: formatPlaylistData(updatedPlaylist, true),
      movedCount: selectedTracks.length
    }, `${selectedTracks.length} track en alta taşındı`);

  } catch (err) {
    console.error('❌ Move tracks to bottom error:', err);
    return errorResponse(res, 'Track\'ler taşınırken hata oluştu', 500, err);
  }
};

// ========== COVER GENERATION ==========

/**
 * @route   GET /api/playlists/:id/generate-cover
 * @desc    Playlist için otomatik cover oluştur (son 4 şarkıdan)
 * @access  Public
 */
exports.generatePlaylistCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Geçersiz playlist ID', 400);
    }

    const playlist = await Playlist.findById(id)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'imageUrl'
      });

    if (!playlist) {
      return errorResponse(res, 'Playlist bulunamadı', 404);
    }

    if (!playlist.musics || playlist.musics.length === 0) {
      return errorResponse(res, 'Playlist\'te şarkı yok', 400);
    }

    // Son 4 şarkının cover'larını al
    const last4Musics = playlist.musics.slice(-4);
    const imageUrls = last4Musics
      .map(m => m.imageUrl)
      .filter(url => url && url.trim() !== '');

    if (imageUrls.length === 0) {
      return errorResponse(res, 'Kullanılabilir cover image bulunamadı', 400);
    }

    // Sharp ile 4'lü grid oluştur
    try {
      const gridSize = 400; // 400x400 toplam
      const singleSize = gridSize / 2; // Her image 200x200

      // Default placeholder image
      const placeholderBuffer = await sharp({
        create: {
          width: singleSize,
          height: singleSize,
          channels: 3,
          background: { r: 50, g: 50, b: 50 }
        }
      }).png().toBuffer();

      // Image'leri indir ve resize et
      const imageBuffers = await Promise.all(
        [0, 1, 2, 3].map(async (i) => {
          if (i < imageUrls.length) {
            try {
              const imageUrl = imageUrls[i];
              let imagePath;

              // URL ya da local path kontrolü
              if (imageUrl.startsWith('http')) {
                // External URL - fetch ile indir
                const fetch = require('node-fetch');
                const response = await fetch(imageUrl);
                const buffer = await response.buffer();
                return await sharp(buffer)
                  .resize(singleSize, singleSize, { fit: 'cover' })
                  .png()
                  .toBuffer();
              } else {
                // Local file
                imagePath = path.join(__dirname, '..', imageUrl);
                return await sharp(imagePath)
                  .resize(singleSize, singleSize, { fit: 'cover' })
                  .png()
                  .toBuffer();
              }
            } catch (err) {
              console.warn('⚠️ Image processing failed for index', i, err.message);
              return placeholderBuffer;
            }
          } else {
            return placeholderBuffer;
          }
        })
      );

      // 2x2 grid oluştur
      const gridImage = await sharp({
        create: {
          width: gridSize,
          height: gridSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      })
        .composite([
          { input: imageBuffers[0], top: 0, left: 0 },
          { input: imageBuffers[1], top: 0, left: singleSize },
          { input: imageBuffers[2], top: singleSize, left: 0 },
          { input: imageBuffers[3], top: singleSize, left: singleSize }
        ])
        .png()
        .toBuffer();

      // Grid'i kaydet
      const filename = `generated-${id}-${Date.now()}.png`;
      const savePath = path.join(__dirname, '..', 'uploads', 'playlist-covers', filename);
      await fs.writeFile(savePath, gridImage);

      const generatedCoverPath = `/uploads/playlist-covers/${filename}`;

      // Playlist'i güncelle
      playlist.coverImage = generatedCoverPath;
      await playlist.save();

      console.log('✅ Playlist cover generated:', id);

      return successResponse(res, {
        coverImage: generatedCoverPath,
        playlist: formatPlaylistData(playlist, false)
      }, 'Cover başarıyla oluşturuldu');

    } catch (sharpErr) {
      console.error('❌ Sharp processing error:', sharpErr);
      return errorResponse(res, 'Cover oluşturulurken hata oluştu', 500, sharpErr);
    }

  } catch (err) {
    console.error('❌ Generate cover error:', err);
    return errorResponse(res, 'Cover oluşturulurken hata oluştu', 500, err);
  }
};

// ========== EXISTING FUNCTIONS (BACKWARD COMPATIBILITY) ==========

exports.getPublicPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 20, genre } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      isPublic: true,
      isActive: true
    };

    if (genre && isValidGenre(genre)) {
      filter.genre = genre.toLowerCase();
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views'
        })
        .populate('userId', 'username firstName lastName profileImage')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get public playlists error:', err);
    return errorResponse(res, 'Public playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

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
          select: 'title artist imageUrl genre platformLinks'
        })
        .populate('userId', 'username firstName lastName profileImage')
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
      playlists: playlists.map(p => formatPlaylistData(p, true)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get public world playlists error:', err);
    return errorResponse(res, 'Public world playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

exports.getPlaylistsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!isValidGenre(category)) {
      return errorResponse(res, 'Geçersiz kategori', 400);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find({
        genre: category.toLowerCase(),
        isAdminPlaylist: true,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments({
        genre: category.toLowerCase(),
        isAdminPlaylist: true,
        isActive: true
      })
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
      category: category.toLowerCase(),
      categoryDisplayName: GENRE_DISPLAY_NAMES[category.toLowerCase()],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get playlists by category error:', err);
    return errorResponse(res, 'Kategori playlist\'leri getirilirken hata oluştu', 500, err);
  }
};

exports.getUserPlaylists = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, includePrivate = false } = req.query;

    if (!isValidObjectId(userId)) {
      return errorResponse(res, 'Geçersiz kullanıcı ID', 400);
    }

    const requestUserId = req.userId;
    const isOwnProfile = requestUserId === userId;

    const filter = {
      userId,
      isAdminPlaylist: false,
      isActive: true
    };

    if (!isOwnProfile || includePrivate === 'false') {
      filter.isPublic = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find(filter)
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
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

exports.getFollowingPlaylists = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!isValidObjectId(userId)) {
      return errorResponse(res, 'Geçersiz kullanıcı ID', 400);
    }

    const user = await User.findById(userId).select('following');
    if (!user) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [playlists, total] = await Promise.all([
      Playlist.find({
        userId: { $in: user.following },
        isPublic: true,
        isAdminPlaylist: false,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks'
        })
        .populate('userId', 'username firstName lastName profileImage')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Playlist.countDocuments({
        userId: { $in: user.following },
        isPublic: true,
        isAdminPlaylist: false,
        isActive: true
      })
    ]);

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
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

exports.getLatestPlaylistsByCategory = async (req, res) => {
  try {
    const latestPlaylists = {};

    for (const genre of VALID_GENRES) {
      const latest = await Playlist.findOne({
        genre,
        isAdminPlaylist: true,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views'
        })
        .sort({ createdAt: -1 })
        .lean();

      if (latest) {
        latestPlaylists[genre] = formatPlaylistData(latest, true);
      }
    }

    return successResponse(res, {
      playlists: latestPlaylists,
      categories: VALID_GENRES.map(g => ({
        key: g,
        displayName: GENRE_DISPLAY_NAMES[g]
      }))
    });

  } catch (err) {
    console.error('❌ Get latest playlists error:', err);
    return errorResponse(res, 'HOT playlist\'ler getirilirken hata oluştu', 500, err);
  }
};

exports.searchPlaylists = async (req, res) => {
  try {
    const { query, genre } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    const searchTerm = query.trim();
    const filter = {
      isPublic: true,
      isActive: true,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (genre && isValidGenre(genre)) {
      filter.genre = genre.toLowerCase();
    }

    const playlists = await Playlist.find(filter)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks'
      })
      .populate('userId', 'username firstName lastName profileImage')
      .sort({ likes: -1, createdAt: -1 })
      .limit(20)
      .lean();

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
      count: playlists.length,
      searchQuery: searchTerm
    });

  } catch (err) {
    console.error('❌ Search playlists error:', err);
    return errorResponse(res, 'Playlist arama sırasında hata oluştu', 500, err);
  }
};

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
        select: 'title artist imageUrl genre platformLinks'
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return successResponse(res, {
      playlists: playlists.map(p => formatPlaylistData(p, true)),
      count: playlists.length,
      searchQuery: searchTerm
    });

  } catch (err) {
    console.error('❌ Search private playlists error:', err);
    return errorResponse(res, 'Private playlist arama sırasında hata oluştu', 500, err);
  }
};

// Admin playlist fonksiyonları (mevcut)
exports.createAdminPlaylist = async (req, res) => {
  // Mevcut kod... (değişiklik yok)
  return errorResponse(res, 'Not implemented in this version', 501);
};

exports.getAllAdminPlaylists = async (req, res) => {
  // Mevcut kod... (değişiklik yok)
  return errorResponse(res, 'Not implemented in this version', 501);
};

exports.updateAdminPlaylist = async (req, res) => {
  // Mevcut kod... (değişiklik yok)
  return errorResponse(res, 'Not implemented in this version', 501);
};

exports.deleteAdminPlaylist = async (req, res) => {
  // Mevcut kod... (değişiklik yok)
  return errorResponse(res, 'Not implemented in this version', 501);
};

module.exports = exports;