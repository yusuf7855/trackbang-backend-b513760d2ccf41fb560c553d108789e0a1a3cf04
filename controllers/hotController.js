// controllers/hotController.js - Clean Code (Spotify Dahil - 5 Platform)
const Playlist = require('../models/Playlist');
const Music = require('../models/Music');

// ========== HELPER FUNCTIONS ==========
/**
 * Genre display name mapping
 */
const getGenreDisplayName = (genre) => {
  const genreMap = {
    'afrohouse': 'Afro House',
    'indiedance': 'Indie Dance',
    'organichouse': 'Organic House',
    'downtempo': 'Down Tempo',
    'melodichouse': 'Melodic House'
  };
  return genreMap[genre] || genre;
};

/**
 * Müzik datasını formatla (5 Platform)
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
    isFeatured: music.isFeatured || false,
    isNew: music.isNew || false,
    metadata: music.metadata || {}
  };
};

/**
 * Playlist datasını formatla
 */
const formatPlaylistData = (playlist) => {
  if (!playlist) return null;

  return {
    _id: playlist._id,
    name: playlist.name,
    description: playlist.description || '',
    genre: playlist.genre,
    genreDisplayName: getGenreDisplayName(playlist.genre),
    subCategory: playlist.subCategory,
    coverImage: playlist.coverImage || null,
    musicCount: playlist.musics?.length || 0,
    likes: playlist.likes || 0,
    views: playlist.views || 0,
    followerCount: playlist.followers?.length || 0,
    owner: {
      _id: playlist.userId?._id || 'admin',
      username: playlist.userId?.username || 'admin',
      displayName: playlist.userId
        ? `${playlist.userId.firstName} ${playlist.userId.lastName}`
        : 'Admin User',
      profileImage: playlist.userId?.profileImage || null
    },
    musics: playlist.musics?.map(formatMusicData) || [],
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    isNew: playlist.isNew || false
  };
};

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

// ========== MAIN CONTROLLERS ==========

/**
 * @route   GET /api/hot
 * @desc    Her genre'den en son admin playlist'i getir (HOT sayfası)
 * @access  Public
 */
exports.getHotPlaylists = async (req, res) => {
  try {
    const genres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
    const hotPlaylists = [];

    // Her genre için en son playlist'i paralel olarak getir
    const playlistPromises = genres.map(genre =>
      Playlist.findOne({
        genre,
        isAdminPlaylist: true,
        isPublic: true,
        isActive: true
      })
        .populate({
          path: 'musics',
          match: { isActive: true },
          select: 'title artist imageUrl genre platformLinks likes views userLikes isFeatured metadata'
        })
        .populate({
          path: 'userId',
          select: 'username firstName lastName profileImage'
        })
        .sort({ createdAt: -1 })
        .lean()
    );

    const results = await Promise.all(playlistPromises);

    // Sonuçları formatla
    results.forEach((playlist, index) => {
      const genre = genres[index];

      if (playlist && playlist.musics && playlist.musics.length > 0) {
        hotPlaylists.push(formatPlaylistData(playlist));
      } else {
        // Genre için playlist yoksa boş entry ekle
        hotPlaylists.push({
          genre,
          genreDisplayName: getGenreDisplayName(genre),
          name: null,
          isEmpty: true,
          musics: [],
          message: `${getGenreDisplayName(genre)} için henüz playlist yok`
        });
      }
    });

    return successResponse(
      res,
      { hotPlaylists },
      'Her genre\'den en son admin playlist\'ler'
    );

  } catch (err) {
    console.error('❌ Get hot playlists error:', err);
    return errorResponse(
      res,
      'HOT playlist\'ler yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/genre/:genre/latest
 * @desc    Belirli bir genre'nin en son playlist'ini getir
 * @access  Public
 */
exports.getLatestPlaylistByGenre = async (req, res) => {
  try {
    const { genre } = req.params;

    // Genre validation
    const validGenres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
    const normalizedGenre = genre.toLowerCase();

    if (!validGenres.includes(normalizedGenre)) {
      return errorResponse(res, 'Geçersiz müzik türü', 400);
    }

    const latestPlaylist = await Playlist.findOne({
      genre: normalizedGenre,
      isAdminPlaylist: true,
      isPublic: true,
      isActive: true
    })
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks likes views userLikes isFeatured metadata'
      })
      .populate({
        path: 'userId',
        select: 'username firstName lastName profileImage bio'
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestPlaylist) {
      return errorResponse(
        res,
        `${getGenreDisplayName(normalizedGenre)} genre'sinde henüz admin playlist bulunamadı`,
        404
      );
    }

    const formattedPlaylist = formatPlaylistData(latestPlaylist);

    return successResponse(
      res,
      { playlist: formattedPlaylist },
      'En son playlist başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get latest playlist by genre error:', err);
    return errorResponse(
      res,
      'Latest playlist yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/category/:category
 * @desc    Geriye uyumluluk için - category -> genre redirect
 * @access  Public
 * @deprecated Use /genre/:genre/latest instead
 */
exports.getHotPlaylistByCategory = async (req, res) => {
  try {
    // Category parametresini genre olarak kullan
    req.params.genre = req.params.category;
    return exports.getLatestPlaylistByGenre(req, res);

  } catch (err) {
    console.error('❌ Get hot playlist by category error:', err);
    return errorResponse(
      res,
      'HOT playlist yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/stats
 * @desc    HOT playlist istatistikleri
 * @access  Public
 */
exports.getHotStats = async (req, res) => {
  try {
    const genres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
    const stats = {};

    // Her genre için istatistikleri paralel olarak getir
    const statsPromises = genres.map(async (genre) => {
      const [totalPlaylists, latestPlaylist, totalMusics] = await Promise.all([
        // Toplam playlist sayısı
        Playlist.countDocuments({
          genre,
          isAdminPlaylist: true,
          isPublic: true,
          isActive: true
        }),

        // En son playlist
        Playlist.findOne({
          genre,
          isAdminPlaylist: true,
          isPublic: true,
          isActive: true
        })
          .select('name subCategory coverImage createdAt musics likes views')
          .sort({ createdAt: -1 })
          .lean(),

        // Toplam müzik sayısı
        Music.countDocuments({
          genre,
          isActive: true
        })
      ]);

      return {
        genre,
        genreDisplayName: getGenreDisplayName(genre),
        totalPlaylists,
        totalMusics,
        latestPlaylist: latestPlaylist
          ? {
              _id: latestPlaylist._id,
              name: latestPlaylist.name,
              subCategory: latestPlaylist.subCategory,
              coverImage: latestPlaylist.coverImage || null,
              musicCount: latestPlaylist.musics?.length || 0,
              likes: latestPlaylist.likes || 0,
              views: latestPlaylist.views || 0,
              createdAt: latestPlaylist.createdAt
            }
          : null
      };
    });

    const results = await Promise.all(statsPromises);

    // Sonuçları genre key'leriyle organize et
    results.forEach((result) => {
      stats[result.genre] = {
        genreDisplayName: result.genreDisplayName,
        totalPlaylists: result.totalPlaylists,
        totalMusics: result.totalMusics,
        latestPlaylist: result.latestPlaylist
      };
    });

    // Genel istatistikler
    const overallStats = {
      totalGenres: genres.length,
      totalAdminPlaylists: Object.values(stats).reduce(
        (sum, stat) => sum + stat.totalPlaylists,
        0
      ),
      totalMusics: Object.values(stats).reduce(
        (sum, stat) => sum + stat.totalMusics,
        0
      )
    };

    return successResponse(
      res,
      {
        stats,
        overall: overallStats
      },
      'İstatistikler başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get hot stats error:', err);
    return errorResponse(
      res,
      'İstatistikler yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/trending
 * @desc    Trending playlist'ler (likes + views bazlı)
 * @access  Public
 */
exports.getTrendingPlaylists = async (req, res) => {
  try {
    const { limit = 10, genre = null } = req.query;

    const query = {
      isAdminPlaylist: true,
      isPublic: true,
      isActive: true
    };

    // Genre filtresi varsa ekle
    if (genre) {
      const validGenres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
      const normalizedGenre = genre.toLowerCase();
      
      if (validGenres.includes(normalizedGenre)) {
        query.genre = normalizedGenre;
      }
    }

    const trendingPlaylists = await Playlist.find(query)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks likes views isFeatured'
      })
      .populate({
        path: 'userId',
        select: 'username firstName lastName profileImage'
      })
      .sort({ likes: -1, views: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedPlaylists = trendingPlaylists.map(formatPlaylistData);

    return successResponse(
      res,
      {
        playlists: formattedPlaylists,
        count: formattedPlaylists.length
      },
      'Trending playlist\'ler başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get trending playlists error:', err);
    return errorResponse(
      res,
      'Trending playlist\'ler yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/new-releases
 * @desc    Yeni eklenen admin playlist'ler (son 7 gün)
 * @access  Public
 */
exports.getNewReleases = async (req, res) => {
  try {
    const { limit = 10, days = 7, genre = null } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const query = {
      isAdminPlaylist: true,
      isPublic: true,
      isActive: true,
      createdAt: { $gte: daysAgo }
    };

    // Genre filtresi varsa ekle
    if (genre) {
      const validGenres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
      const normalizedGenre = genre.toLowerCase();
      
      if (validGenres.includes(normalizedGenre)) {
        query.genre = normalizedGenre;
      }
    }

    const newPlaylists = await Playlist.find(query)
      .populate({
        path: 'musics',
        match: { isActive: true },
        select: 'title artist imageUrl genre platformLinks likes views isFeatured'
      })
      .populate({
        path: 'userId',
        select: 'username firstName lastName profileImage'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedPlaylists = newPlaylists.map(formatPlaylistData);

    return successResponse(
      res,
      {
        playlists: formattedPlaylists,
        count: formattedPlaylists.length,
        dateRange: {
          from: daysAgo,
          to: new Date()
        }
      },
      'Yeni playlist\'ler başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get new releases error:', err);
    return errorResponse(
      res,
      'Yeni playlist\'ler yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/featured
 * @desc    Öne çıkan müzikler (Featured musics)
 * @access  Public
 */
exports.getFeaturedMusics = async (req, res) => {
  try {
    const { limit = 20, genre = null } = req.query;

    const query = {
      isFeatured: true,
      isActive: true
    };

    // Genre filtresi varsa ekle
    if (genre) {
      const validGenres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
      const normalizedGenre = genre.toLowerCase();
      
      if (validGenres.includes(normalizedGenre)) {
        query.genre = normalizedGenre;
      }
    }

    const featuredMusics = await Music.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedMusics = featuredMusics.map(formatMusicData);

    return successResponse(
      res,
      {
        musics: formattedMusics,
        count: formattedMusics.length
      },
      'Öne çıkan müzikler başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get featured musics error:', err);
    return errorResponse(
      res,
      'Öne çıkan müzikler yüklenirken hata oluştu',
      500,
      err
    );
  }
};

/**
 * @route   GET /api/hot/platform-stats
 * @desc    Platform link istatistikleri
 * @access  Public
 */
exports.getPlatformStats = async (req, res) => {
  try {
    const genres = ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'];
    const platformStats = {};

    for (const genre of genres) {
      const musics = await Music.find({ genre, isActive: true }).lean();
      
      platformStats[genre] = {
        genreDisplayName: getGenreDisplayName(genre),
        total: musics.length,
        spotify: musics.filter(m => m.platformLinks?.spotify).length,
        appleMusic: musics.filter(m => m.platformLinks?.appleMusic).length,
        youtubeMusic: musics.filter(m => m.platformLinks?.youtubeMusic).length,
        beatport: musics.filter(m => m.platformLinks?.beatport).length,
        soundcloud: musics.filter(m => m.platformLinks?.soundcloud).length
      };
    }

    // Genel toplam
    const allMusics = await Music.find({ isActive: true }).lean();
    const overallStats = {
      total: allMusics.length,
      spotify: allMusics.filter(m => m.platformLinks?.spotify).length,
      appleMusic: allMusics.filter(m => m.platformLinks?.appleMusic).length,
      youtubeMusic: allMusics.filter(m => m.platformLinks?.youtubeMusic).length,
      beatport: allMusics.filter(m => m.platformLinks?.beatport).length,
      soundcloud: allMusics.filter(m => m.platformLinks?.soundcloud).length
    };

    return successResponse(
      res,
      {
        byGenre: platformStats,
        overall: overallStats
      },
      'Platform istatistikleri başarıyla getirildi'
    );

  } catch (err) {
    console.error('❌ Get platform stats error:', err);
    return errorResponse(
      res,
      'Platform istatistikleri yüklenirken hata oluştu',
      500,
      err
    );
  }
};

module.exports = exports;