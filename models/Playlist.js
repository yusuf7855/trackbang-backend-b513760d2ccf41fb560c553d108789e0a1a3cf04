// models/Playlist.js - Güncel ve Clean Code Versiyonu
const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  // ========== TEMEL BİLGİLER ==========
  name: {
    type: String,
    required: [true, 'Playlist ismi zorunludur'],
    trim: true,
    maxlength: [100, 'Playlist ismi maksimum 100 karakter olabilir']
  },

  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Açıklama maksimum 500 karakter olabilir']
  },

  // ========== SAHİPLİK ==========
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isAdminPlaylist;
    }
  },

  // ========== ŞARKILAR ==========
  musics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Music'
  }],

  // ========== GENRE ==========
  genre: {
    type: String,
    required: [true, 'Playlist türü zorunludur'],
    enum: {
      values: ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'],
      message: '{VALUE} geçerli bir tür değil'
    },
    lowercase: true
  },

  // ========== ADMIN PLAYLIST ÖZELLİKLERİ ==========
  isAdminPlaylist: {
    type: Boolean,
    default: false
  },

  subCategory: {
    type: String,
    uppercase: true,
    trim: true,
    required: function() {
      return this.isAdminPlaylist;
    },
    validate: {
      validator: function(v) {
        if (!this.isAdminPlaylist) return true;
        // Admin playlist'ler için format: AH1, MH1, etc.
        return /^[A-Z]{2}\d+$/.test(v);
      },
      message: 'Alt kategori formatı geçersiz (Örn: AH1, MH1)'
    }
  },

  // ========== GÖRÜNÜRLİK ==========
  isPublic: {
    type: Boolean,
    default: function() {
      return this.isAdminPlaylist ? true : false;
    }
  },

  // ========== SOSYAL ÖZELLİKLER ==========
  likes: {
    type: Number,
    default: 0,
    min: 0
  },

  userLikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  views: {
    type: Number,
    default: 0,
    min: 0
  },

  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ========== GÖRSEL ==========
  coverImage: {
    type: String,
    default: null,
    trim: true
  },

  // ========== DURUM ==========
  isActive: {
    type: Boolean,
    default: true
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  // ========== TARİHLER ==========
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== INDEX'LER ==========
// Text search için
playlistSchema.index({
  name: 'text',
  description: 'text'
}, {
  name: 'playlist_search_index',
  weights: {
    name: 3,
    description: 1
  },
  collation: {
    locale: 'en',
    strength: 2
  }
});

// Admin playlist'ler için unique combination
playlistSchema.index({
  genre: 1,
  subCategory: 1
}, {
  unique: true,
  partialFilterExpression: { isAdminPlaylist: true }
});

// Performance için index'ler
playlistSchema.index({ genre: 1, isPublic: 1 });
playlistSchema.index({ isAdminPlaylist: 1, genre: 1 });
playlistSchema.index({ userId: 1, isPublic: 1 });
playlistSchema.index({ isActive: 1, createdAt: -1 });
playlistSchema.index({ isFeatured: 1, createdAt: -1 });

// ========== VIRTUAL FIELDS ==========
// Müzik sayısı
playlistSchema.virtual('musicCount').get(function() {
  return this.musics ? this.musics.length : 0;
});

// Takipçi sayısı
playlistSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Yeni mi? (Son 7 gün)
playlistSchema.virtual('isNew').get(function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.createdAt > sevenDaysAgo;
});

// Boş mu?
playlistSchema.virtual('isEmpty').get(function() {
  return !this.musics || this.musics.length === 0;
});

// ========== MIDDLEWARE ==========
// Pre-save: updatedAt'i güncelle
playlistSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Post-save: Log
playlistSchema.post('save', function(doc) {
  console.log(`✅ Playlist saved: ${doc.name} (${doc.isAdminPlaylist ? 'Admin' : 'User'})`);
});

// ========== INSTANCE METHODS ==========
/**
 * Playlist'e şarkı ekle
 */
playlistSchema.methods.addMusic = async function(musicId) {
  // Zaten var mı kontrol et
  if (this.musics.some(id => id.toString() === musicId.toString())) {
    throw new Error('Bu şarkı zaten playlist\'te var');
  }

  this.musics.push(musicId);
  return await this.save();
};

/**
 * Playlist'ten şarkı çıkar
 */
playlistSchema.methods.removeMusic = async function(musicId) {
  const index = this.musics.findIndex(id => id.toString() === musicId.toString());
  
  if (index === -1) {
    throw new Error('Şarkı playlist\'te bulunamadı');
  }

  this.musics.splice(index, 1);
  return await this.save();
};

/**
 * Like/Unlike toggle
 */
playlistSchema.methods.toggleLike = async function(userId) {
  const userIdStr = userId.toString();
  const index = this.userLikes.findIndex(id => id.toString() === userIdStr);

  if (index === -1) {
    this.userLikes.push(userId);
    this.likes += 1;
  } else {
    this.userLikes.splice(index, 1);
    this.likes = Math.max(0, this.likes - 1);
  }

  return await this.save();
};

/**
 * Follow/Unfollow toggle
 */
playlistSchema.methods.toggleFollow = async function(userId) {
  const userIdStr = userId.toString();
  const index = this.followers.findIndex(id => id.toString() === userIdStr);

  if (index === -1) {
    this.followers.push(userId);
  } else {
    this.followers.splice(index, 1);
  }

  return await this.save();
};

/**
 * View sayısını artır
 */
playlistSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save();
};

/**
 * Kullanıcı bu playlist'i beğendi mi?
 */
playlistSchema.methods.isLikedBy = function(userId) {
  const userIdStr = userId.toString();
  return this.userLikes.some(id => id.toString() === userIdStr);
};

/**
 * Kullanıcı bu playlist'i takip ediyor mu?
 */
playlistSchema.methods.isFollowedBy = function(userId) {
  const userIdStr = userId.toString();
  return this.followers.some(id => id.toString() === userIdStr);
};

// ========== STATIC METHODS ==========
/**
 * Admin playlist'leri getir
 */
playlistSchema.statics.findAdminPlaylists = function(options = {}) {
  const { limit = 20, skip = 0, genre = null, sort = { createdAt: -1 } } = options;
  const query = { isAdminPlaylist: true, isActive: true };
  if (genre) query.genre = genre;
  
  return this.find(query)
    .populate('musics')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * User playlist'leri getir
 */
playlistSchema.statics.findUserPlaylists = function(userId, options = {}) {
  const { limit = 20, skip = 0, includePrivate = true } = options;
  const query = { userId, isActive: true };
  if (!includePrivate) query.isPublic = true;
  
  return this.find(query)
    .populate('musics')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Public playlist'leri getir
 */
playlistSchema.statics.findPublicPlaylists = function(options = {}) {
  const { limit = 20, skip = 0, genre = null, sort = { createdAt: -1 } } = options;
  const query = { isPublic: true, isActive: true };
  if (genre) query.genre = genre;
  
  return this.find(query)
    .populate('musics')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Genre'ye göre getir
 */
playlistSchema.statics.findByGenre = function(genre, options = {}) {
  const { limit = 20, skip = 0, publicOnly = true } = options;
  const query = { genre, isActive: true };
  if (publicOnly) query.isPublic = true;
  
  return this.find(query)
    .populate('musics')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Featured playlist'leri getir
 */
playlistSchema.statics.findFeatured = function(options = {}) {
  const { limit = 5, genre = null } = options;
  const query = { isFeatured: true, isActive: true, isPublic: true };
  if (genre) query.genre = genre;
  
  return this.find(query)
    .populate('musics')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Popüler playlist'leri getir
 */
playlistSchema.statics.findPopular = function(options = {}) {
  const { limit = 10, genre = null } = options;
  const query = { isActive: true, isPublic: true };
  if (genre) query.genre = genre;
  
  return this.find(query)
    .populate('musics')
    .sort({ likes: -1, views: -1 })
    .limit(limit)
    .lean();
};

/**
 * Playlist search
 */
playlistSchema.statics.searchPlaylists = function(searchQuery, options = {}) {
  const { limit = 20, skip = 0, publicOnly = true } = options;
  const query = {
    $text: { $search: searchQuery },
    isActive: true
  };
  if (publicOnly) query.isPublic = true;
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('musics')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip)
    .lean();
};

module.exports = mongoose.model('Playlist', playlistSchema);