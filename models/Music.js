// models/Music.js - Güncel Platform Link Sistemi
const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
  // ========== TEMEL BİLGİLER ==========
  title: {
    type: String,
    required: [true, 'Şarkı ismi zorunludur'],
    trim: true,
    maxlength: 200
  },

  artist: {
    type: String,
    required: [true, 'Sanatçı ismi zorunludur'],
    trim: true,
    maxlength: 200
  },

  // ========== GÖRSEL ==========
  imageUrl: {
    type: String,
    required: [true, 'Şarkı görseli zorunludur'],
    trim: true
  },

  imagePath: {
    type: String,
    default: null,
    trim: true
  },

  // ========== GENRE ==========
  genre: {
    type: String,
    required: [true, 'Müzik türü zorunludur'],
    enum: ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'],
    lowercase: true
  },

  // Backward compatibility için
  category: {
    type: String,
    get: function() {
      return this.genre;
    }
  },

  // ========== PLATFORM LİNKLERİ ==========
  platformLinks: {
    appleMusic: {
      type: String,
      trim: true,
      default: null
    },
    youtubeMusic: {
      type: String,
      trim: true,
      default: null
    },
    beatport: {
      type: String,
      trim: true,
      default: null
    },
    soundcloud: {
      type: String,
      trim: true,
      default: null
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

  // ========== METADATA ==========
  metadata: {
    releaseYear: Number,
    duration: Number,
    bpm: Number,
    key: String,
    label: String
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
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// ========== INDEX'LER ==========
musicSchema.index({ title: 'text', artist: 'text' });
musicSchema.index({ genre: 1, createdAt: -1 });
musicSchema.index({ genre: 1, likes: -1 });
musicSchema.index({ isActive: 1, createdAt: -1 });
musicSchema.index({ isFeatured: 1, createdAt: -1 });

// ========== VIRTUAL FIELDS ==========
musicSchema.virtual('isNew').get(function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.createdAt > sevenDaysAgo;
});

musicSchema.virtual('hasAnyLink').get(function() {
  const { appleMusic, youtubeMusic, beatport, soundcloud } = this.platformLinks;
  return !!(appleMusic || youtubeMusic || beatport || soundcloud);
});

// ========== MIDDLEWARE ==========
musicSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// En az bir platform linki kontrolü
musicSchema.pre('save', function(next) {
  const { appleMusic, youtubeMusic, beatport, soundcloud } = this.platformLinks;
  if (!appleMusic && !youtubeMusic && !beatport && !soundcloud) {
    return next(new Error('En az bir platform linki eklemelisiniz'));
  }
  next();
});

// ========== INSTANCE METHODS ==========
musicSchema.methods.toggleLike = async function(userId) {
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

musicSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save();
};

musicSchema.methods.isLikedBy = function(userId) {
  const userIdStr = userId.toString();
  return this.userLikes.some(id => id.toString() === userIdStr);
};

// ========== STATIC METHODS ==========
musicSchema.statics.findByGenre = function(genre, options = {}) {
  const { limit = 20, skip = 0, sort = { createdAt: -1 }, isActive = true } = options;
  return this.find({ genre, isActive }).sort(sort).limit(limit).skip(skip).lean();
};

musicSchema.statics.findPopular = function(options = {}) {
  const { limit = 10, genre = null, isActive = true } = options;
  const query = { isActive };
  if (genre) query.genre = genre;
  return this.find(query).sort({ likes: -1, views: -1 }).limit(limit).lean();
};

musicSchema.statics.findFeatured = function(options = {}) {
  const { limit = 5, genre = null, isActive = true } = options;
  const query = { isFeatured: true, isActive };
  if (genre) query.genre = genre;
  return this.find(query).sort({ createdAt: -1 }).limit(limit).lean();
};

musicSchema.statics.searchMusic = function(searchQuery, options = {}) {
  const { limit = 20, skip = 0, isActive = true } = options;
  return this.find(
    { $text: { $search: searchQuery }, isActive },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .skip(skip)
  .lean();
};

musicSchema.statics.findNewReleases = function(options = {}) {
  const { limit = 10, genre = null, isActive = true } = options;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const query = { createdAt: { $gte: sevenDaysAgo }, isActive };
  if (genre) query.genre = genre;
  return this.find(query).sort({ createdAt: -1 }).limit(limit).lean();
};

module.exports = mongoose.model('Music', musicSchema);