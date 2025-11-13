// controllers/searchController.js - Clean Code Versiyonu (Platform Links + Genre)
const User = require('../models/userModel');
const Playlist = require('../models/Playlist');
const Music = require('../models/Music');

// ========== CONSTANTS ==========
const SEARCH_LIMITS = {
  USERS: 20,
  PLAYLISTS: 20,
  MUSICS: 20,
  QUICK_USERS: 5,
  QUICK_PLAYLISTS: 10,
  QUICK_MUSICS: 10,
  PREVIEW_MUSICS: 3
};

const VALID_SEARCH_TYPES = ['all', 'users', 'playlists', 'musics'];

// ========== HELPER FUNCTIONS ==========
/**
 * Standart başarılı response
 */
const successResponse = (res, data, message = 'Success') => {
  return res.json({
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
  }

  return res.status(statusCode).json(response);
};

/**
 * Search query validation
 */
const validateSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return { valid: false, message: 'Arama terimi gerekli' };
  }

  const trimmedQuery = query.trim();
  
  if (trimmedQuery.length < 2) {
    return { valid: false, message: 'Arama terimi en az 2 karakter olmalıdır' };
  }

  if (trimmedQuery.length > 100) {
    return { valid: false, message: 'Arama terimi en fazla 100 karakter olabilir' };
  }

  return { valid: true, query: trimmedQuery };
};

/**
 * Search type validation
 */
const validateSearchType = (type) => {
  if (!type) return { valid: true, type: 'all' };
  
  const lowerType = type.toLowerCase();
  
  if (!VALID_SEARCH_TYPES.includes(lowerType)) {
    return { valid: false, message: 'Geçersiz arama tipi. Geçerli tipler: all, users, playlists, musics' };
  }

  return { valid: true, type: lowerType };
};

/**
 * User datasını formatla
 */
const formatUserData = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    type: 'user',
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    profileImage: user.profileImage && user.profileImage !== 'image.jpg' 
      ? user.profileImage 
      : null,
    bio: user.bio || null,
    followerCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
    isPremium: user.isPremium || false,
    favoriteGenres: user.musicPreferences?.favoriteGenres || []
  };
};

/**
 * Music datasını formatla
 */
const formatMusicData = (music) => {
  if (!music) return null;

  return {
    _id: music._id,
    type: 'music',
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
    isFeatured: music.isFeatured || false,
    isNew: music.isNew || false
  };
};

/**
 * Playlist datasını formatla
 */
const formatPlaylistData = (playlist) => {
  if (!playlist) return null;

  return {
    _id: playlist._id,
    type: 'playlist',
    name: playlist.name,
    description: playlist.description || '',
    genre: playlist.genre,
    isAdminPlaylist: playlist.isAdminPlaylist,
    isPublic: playlist.isPublic,
    coverImage: playlist.coverImage || null,
    musicCount: playlist.musics?.length || 0,
    likes: playlist.likes || 0,
    views: playlist.views || 0,
    owner: playlist.userId ? {
      _id: playlist.userId._id,
      username: playlist.userId.username,
      firstName: playlist.userId.firstName,
      lastName: playlist.userId.lastName,
      fullName: `${playlist.userId.firstName} ${playlist.userId.lastName}`.trim(),
      profileImage: playlist.userId.profileImage && playlist.userId.profileImage !== 'image.jpg'
        ? playlist.userId.profileImage
        : null
    } : {
      _id: 'admin',
      username: 'admin',
      fullName: 'Admin User',
      profileImage: null
    },
    previewMusics: playlist.musics?.slice(0, SEARCH_LIMITS.PREVIEW_MUSICS).map(formatMusicData) || [],
    createdAt: playlist.createdAt
  };
};

// ========== SEARCH FUNCTIONS ==========
/**
 * Kullanıcı arama
 */
const searchUsers = async (searchTerm, limit = SEARCH_LIMITS.USERS) => {
  try {
    const users = await User.find({
      isActive: true,
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: searchTerm,
              options: 'i'
            }
          }
        }
      ]
    })
      .select('username firstName lastName profileImage bio followers following subscription musicPreferences.favoriteGenres')
      .limit(limit)
      .lean();

    return users.map(formatUserData);

  } catch (error) {
    console.error('❌ Search users error:', error);
    return [];
  }
};

/**
 * Playlist arama
 */
const searchPlaylists = async (searchTerm, limit = SEARCH_LIMITS.PLAYLISTS) => {
  try {
    const playlists = await Playlist.find({
      isActive: true,
      $and: [
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } }
          ]
        },
        {
          $or: [
            { isPublic: true },
            { isAdminPlaylist: true }
          ]
        }
      ]
    })
      .populate({
        path: 'userId',
        select: 'username firstName lastName profileImage'
      })
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks likes views',
        options: { limit: SEARCH_LIMITS.PREVIEW_MUSICS }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return playlists.map(formatPlaylistData);

  } catch (error) {
    console.error('❌ Search playlists error:', error);
    return [];
  }
};

/**
 * Müzik arama
 */
const searchMusics = async (searchTerm, limit = SEARCH_LIMITS.MUSICS) => {
  try {
    const musics = await Music.find({
      isActive: true,
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { artist: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('title artist imageUrl genre platformLinks likes views isFeatured metadata')
      .sort({ likes: -1, views: -1 })
      .limit(limit)
      .lean();

    return musics.map(formatMusicData);

  } catch (error) {
    console.error('❌ Search musics error:', error);
    return [];
  }
};

// ========== MAIN CONTROLLERS ==========
/**
 * @route   GET /api/search
 * @desc    Unified search (users, playlists, musics)
 * @access  Public
 */
exports.searchAll = async (req, res) => {
  try {
    const { query, type } = req.query;

    // Query validation
    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.valid) {
      return errorResponse(res, queryValidation.message, 400);
    }

    // Type validation
    const typeValidation = validateSearchType(type);
    if (!typeValidation.valid) {
      return errorResponse(res, typeValidation.message, 400);
    }

    const searchTerm = queryValidation.query;
    const searchType = typeValidation.type;

    console.log(`🔍 Search request: "${searchTerm}" (type: ${searchType})`);

    let results = {};

    // Type'a göre arama
    if (searchType === 'all') {
      // Tüm tiplerde paralel arama
      const [users, playlists, musics] = await Promise.all([
        searchUsers(searchTerm, SEARCH_LIMITS.QUICK_USERS),
        searchPlaylists(searchTerm, SEARCH_LIMITS.QUICK_PLAYLISTS),
        searchMusics(searchTerm, SEARCH_LIMITS.QUICK_MUSICS)
      ]);

      results = { users, playlists, musics };

    } else if (searchType === 'users') {
      results.users = await searchUsers(searchTerm);

    } else if (searchType === 'playlists') {
      results.playlists = await searchPlaylists(searchTerm);

    } else if (searchType === 'musics') {
      results.musics = await searchMusics(searchTerm);
    }

    // Sonuç sayıları
    const counts = {
      users: results.users?.length || 0,
      playlists: results.playlists?.length || 0,
      musics: results.musics?.length || 0,
      total: (results.users?.length || 0) + 
             (results.playlists?.length || 0) + 
             (results.musics?.length || 0)
    };

    console.log(`✅ Search completed: ${counts.total} results`);

    return successResponse(res, {
      query: searchTerm,
      type: searchType,
      results,
      counts
    }, 'Arama tamamlandı');

  } catch (err) {
    console.error('❌ Search all error:', err);
    return errorResponse(res, 'Arama sırasında bir hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/users
 * @desc    Kullanıcı arama
 * @access  Public
 */
exports.searchUsersOnly = async (req, res) => {
  try {
    const { query, limit } = req.query;

    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.valid) {
      return errorResponse(res, queryValidation.message, 400);
    }

    const searchTerm = queryValidation.query;
    const searchLimit = limit ? parseInt(limit) : SEARCH_LIMITS.USERS;

    console.log(`🔍 User search: "${searchTerm}"`);

    const users = await searchUsers(searchTerm, searchLimit);

    return successResponse(res, {
      query: searchTerm,
      users,
      count: users.length
    }, 'Kullanıcı araması tamamlandı');

  } catch (err) {
    console.error('❌ Search users error:', err);
    return errorResponse(res, 'Kullanıcı araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/playlists
 * @desc    Playlist arama
 * @access  Public
 */
exports.searchPlaylistsOnly = async (req, res) => {
  try {
    const { query, limit } = req.query;

    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.valid) {
      return errorResponse(res, queryValidation.message, 400);
    }

    const searchTerm = queryValidation.query;
    const searchLimit = limit ? parseInt(limit) : SEARCH_LIMITS.PLAYLISTS;

    console.log(`🔍 Playlist search: "${searchTerm}"`);

    const playlists = await searchPlaylists(searchTerm, searchLimit);

    return successResponse(res, {
      query: searchTerm,
      playlists,
      count: playlists.length
    }, 'Playlist araması tamamlandı');

  } catch (err) {
    console.error('❌ Search playlists error:', err);
    return errorResponse(res, 'Playlist araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/musics
 * @desc    Müzik arama
 * @access  Public
 */
exports.searchMusicsOnly = async (req, res) => {
  try {
    const { query, limit, genre } = req.query;

    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.valid) {
      return errorResponse(res, queryValidation.message, 400);
    }

    const searchTerm = queryValidation.query;
    const searchLimit = limit ? parseInt(limit) : SEARCH_LIMITS.MUSICS;

    console.log(`🔍 Music search: "${searchTerm}" (genre: ${genre || 'all'})`);

    // Genre filter varsa
    let musics;
    if (genre) {
      musics = await Music.find({
        isActive: true,
        genre: genre.toLowerCase(),
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { artist: { $regex: searchTerm, $options: 'i' } }
        ]
      })
        .select('title artist imageUrl genre platformLinks likes views isFeatured')
        .sort({ likes: -1, views: -1 })
        .limit(searchLimit)
        .lean()
        .then(results => results.map(formatMusicData));
    } else {
      musics = await searchMusics(searchTerm, searchLimit);
    }

    return successResponse(res, {
      query: searchTerm,
      genre: genre || null,
      musics,
      count: musics.length
    }, 'Müzik araması tamamlandı');

  } catch (err) {
    console.error('❌ Search musics error:', err);
    return errorResponse(res, 'Müzik araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/private-playlists
 * @desc    Kullanıcının private playlist'lerinde arama
 * @access  Private
 */
exports.searchUserPrivatePlaylists = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    if (!userId) {
      return errorResponse(res, 'Kimlik doğrulama gerekli', 401);
    }

    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.valid) {
      return errorResponse(res, queryValidation.message, 400);
    }

    const searchTerm = queryValidation.query;

    console.log(`🔍 Private playlist search: "${searchTerm}" (user: ${userId})`);

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
        select: 'title artist imageUrl genre platformLinks likes views',
        options: { limit: SEARCH_LIMITS.PREVIEW_MUSICS }
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formattedPlaylists = playlists.map(playlist => ({
      ...formatPlaylistData(playlist),
      type: 'private_playlist'
    }));

    return successResponse(res, {
      query: searchTerm,
      privatePlaylists: formattedPlaylists,
      count: formattedPlaylists.length
    }, 'Private playlist araması tamamlandı');

  } catch (err) {
    console.error('❌ Search private playlists error:', err);
    return errorResponse(res, 'Private playlist araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/by-artist
 * @desc    Sanatçıya göre müzik arama
 * @access  Public
 */
exports.searchByArtist = async (req, res) => {
  try {
    const { artist } = req.query;

    if (!artist || artist.trim().length === 0) {
      return errorResponse(res, 'Sanatçı adı gerekli', 400);
    }

    const searchTerm = artist.trim();

    console.log(`🔍 Artist search: "${searchTerm}"`);

    const musics = await Music.find({
      artist: { $regex: searchTerm, $options: 'i' },
      isActive: true
    })
      .select('title artist imageUrl genre platformLinks likes views isFeatured metadata')
      .sort({ likes: -1 })
      .limit(50)
      .lean();

    const formattedMusics = musics.map(formatMusicData);

    return successResponse(res, {
      artist: searchTerm,
      musics: formattedMusics,
      count: formattedMusics.length
    }, 'Sanatçı araması tamamlandı');

  } catch (err) {
    console.error('❌ Search by artist error:', err);
    return errorResponse(res, 'Sanatçı araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/by-genre
 * @desc    Genre'ye göre arama (playlists + musics)
 * @access  Public
 */
exports.searchByGenre = async (req, res) => {
  try {
    const { genre, query } = req.query;

    if (!genre) {
      return errorResponse(res, 'Genre gerekli', 400);
    }

    const normalizedGenre = genre.toLowerCase();
    const validGenres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];

    if (!validGenres.includes(normalizedGenre)) {
      return errorResponse(res, 'Geçersiz genre', 400);
    }

    console.log(`🔍 Genre search: "${normalizedGenre}" (query: ${query || 'none'})`);

    // Genre + optional text search
    const musicFilter = {
      genre: normalizedGenre,
      isActive: true
    };

    const playlistFilter = {
      genre: normalizedGenre,
      isActive: true,
      $or: [{ isPublic: true }, { isAdminPlaylist: true }]
    };

    // Text search varsa
    if (query && query.trim().length >= 2) {
      const searchTerm = query.trim();
      musicFilter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { artist: { $regex: searchTerm, $options: 'i' } }
      ];
      playlistFilter.$and = [
        playlistFilter,
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } }
          ]
        }
      ];
    }

    const [musics, playlists] = await Promise.all([
      Music.find(musicFilter)
        .select('title artist imageUrl genre platformLinks likes views isFeatured')
        .sort({ likes: -1 })
        .limit(20)
        .lean()
        .then(results => results.map(formatMusicData)),

      Playlist.find(playlistFilter)
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl',
          options: { limit: 3 }
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .then(results => results.map(formatPlaylistData))
    ]);

    return successResponse(res, {
      genre: normalizedGenre,
      query: query || null,
      results: {
        musics,
        playlists
      },
      counts: {
        musics: musics.length,
        playlists: playlists.length,
        total: musics.length + playlists.length
      }
    }, 'Genre araması tamamlandı');

  } catch (err) {
    console.error('❌ Search by genre error:', err);
    return errorResponse(res, 'Genre araması sırasında hata oluştu', 500, err);
  }
};

/**
 * @route   GET /api/search/suggestions
 * @desc    Arama önerileri (autocomplete)
 * @access  Public
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.valid) {
      return errorResponse(res, queryValidation.message, 400);
    }

    const searchTerm = queryValidation.query;
    const suggestionLimit = Math.min(parseInt(limit), 20);

    console.log(`🔍 Suggestions: "${searchTerm}"`);

    // Basit öneri listesi (users + musics + playlists'den ilk 3'er)
    const [users, musics, playlists] = await Promise.all([
      User.find({
        isActive: true,
        $or: [
          { username: { $regex: searchTerm, $options: 'i' } },
          { firstName: { $regex: searchTerm, $options: 'i' } }
        ]
      })
        .select('username firstName lastName')
        .limit(3)
        .lean(),

      Music.find({
        isActive: true,
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { artist: { $regex: searchTerm, $options: 'i' } }
        ]
      })
        .select('title artist')
        .limit(3)
        .lean(),

      Playlist.find({
        isActive: true,
        isPublic: true,
        name: { $regex: searchTerm, $options: 'i' }
      })
        .select('name')
        .limit(3)
        .lean()
    ]);

    const suggestions = [
      ...users.map(u => ({ text: u.username, type: 'user' })),
      ...musics.map(m => ({ text: `${m.title} - ${m.artist}`, type: 'music' })),
      ...playlists.map(p => ({ text: p.name, type: 'playlist' }))
    ].slice(0, suggestionLimit);

    return successResponse(res, {
      query: searchTerm,
      suggestions,
      count: suggestions.length
    });

  } catch (err) {
    console.error('❌ Search suggestions error:', err);
    return errorResponse(res, 'Öneri getirme sırasında hata oluştu', 500, err);
  }
};

module.exports = exports;