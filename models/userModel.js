// models/userModel.js - Music Sistemi ile Güncellenmiş Versiyon

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ========== TEMEL BİLGİLER ==========
  username: { 
    type: String, 
    required: [true, 'Kullanıcı adı zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
    maxlength: [30, 'Kullanıcı adı en fazla 30 karakter olabilir']
  },
  
  email: { 
    type: String, 
    required: [true, 'Email zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Geçerli bir email adresi girin'
    }
  },
  
  password: { 
    type: String, 
    required: [true, 'Şifre zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır']
  },
  
  firstName: { 
    type: String, 
    required: [true, 'İsim zorunludur'],
    trim: true,
    maxlength: [50, 'İsim en fazla 50 karakter olabilir']
  },
  
  lastName: { 
    type: String, 
    required: [true, 'Soyisim zorunludur'],
    trim: true,
    maxlength: [50, 'Soyisim en fazla 50 karakter olabilir']
  },
  
  phone: { 
    type: String, 
    required: false,
    default: '',
    trim: true,
    validate: {
      validator: function(v) {
        if (!v || v.trim() === '') return true;
        return /^[0-9+\-\s()]{10,15}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası girin'
    }
  },
  
  // ========== PROFIL ==========
  profileImage: { 
    type: String, 
    default: 'image.jpg',
    get: (value) => value === 'image.jpg' ? '/assets/default-profile.jpg' : `/uploads/${value}`
  },
  
  bio: { 
    type: String, 
    default: '',
    trim: true,
    maxlength: [300, 'Bio en fazla 300 karakter olabilir']
  },
  
  profileLinks: [{
    title: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [50, 'Link başlığı en fazla 50 karakter olabilir']
    },
    url: { 
      type: String, 
      required: true,
      trim: true
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  
  events: [{
    date: { 
      type: Date, 
      required: true 
    },
    time: { 
      type: String, 
      required: true 
    },
    city: { 
      type: String, 
      required: true,
      trim: true
    },
    venue: { 
      type: String, 
      required: true,
      trim: true
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  
  additionalImages: [{
    filename: { 
      type: String, 
      required: true 
    },
    uploadDate: { 
      type: Date, 
      default: Date.now 
    }
  }],
  
  // ========== SOSYAL ÖZELLİKLER ==========
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  following: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // ========== MÜZİK TERCİHLERİ VE AKTİVİTE ==========
  musicPreferences: {
    favoriteGenres: [{
      type: String,
      enum: ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse']
    }],
    enableNotifications: { 
      type: Boolean, 
      default: true 
    },
    autoFollowAdminPlaylists: { 
      type: Boolean, 
      default: false 
    },
    preferredLanguage: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    }
  },
  
  // Müzik aktivite istatistikleri
  musicActivity: {
    totalLikes: { 
      type: Number, 
      default: 0,
      min: 0
    },
    totalPlaylists: { 
      type: Number, 
      default: 0,
      min: 0
    },
    totalPlaylistFollows: {
      type: Number,
      default: 0,
      min: 0
    },
    lastMusicActivity: { 
      type: Date 
    }
  },
  
  // ========== ŞİFRE SIFIRLAMA ==========
  resetToken: String,
  resetTokenExpire: Date,
  
  // ========== HESAP DURUMU ==========
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  lastLoginAt: { 
    type: Date 
  },
  
  // ========== ABONELİK ==========
  subscription: {
    isActive: { 
      type: Boolean, 
      default: false 
    },
    type: { 
      type: String, 
      enum: ['free', 'premium'], 
      default: 'free' 
    },
    startDate: Date,
    endDate: Date,
    paymentMethod: String,
    lastPaymentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Payment' 
    }
  },
  
  // ========== MAĞAZA AYARLARI ==========
  storeSettings: {
    notifications: {
      newListingComments: { type: Boolean, default: true },
      listingExpiry: { type: Boolean, default: true },
      purchaseConfirmations: { type: Boolean, default: true }
    },
    privacy: {
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: false },
      allowDirectMessages: { type: Boolean, default: true }
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// ========== INDEX'LER ==========
// Arama için compound index
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ username: 'text', firstName: 'text', lastName: 'text' });

// Tarih bazlı sorgular için
userSchema.index({ createdAt: -1 });

// Aktif kullanıcılar için
userSchema.index({ isActive: 1 });

// Music preferences için
userSchema.index({ 'musicPreferences.favoriteGenres': 1 });

// Premium kullanıcılar için
userSchema.index({ 'subscription.isActive': 1, 'subscription.endDate': 1 });

// ========== VIRTUAL FIELDS ==========
// Listing Rights
userSchema.virtual('listingRights', {
  ref: 'ListingRights',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Active Listings
userSchema.virtual('activeListings', {
  ref: 'StoreListing',
  localField: '_id',
  foreignField: 'userId',
  match: { status: 'active', isActive: true }
});

// User Playlists Count
userSchema.virtual('playlistCount', {
  ref: 'Playlist',
  localField: '_id',
  foreignField: 'userId',
  count: true
});

// Liked Music
userSchema.virtual('likedMusic', {
  ref: 'Music',
  localField: '_id',
  foreignField: 'userLikes'
});

// Followed Playlists
userSchema.virtual('followedPlaylists', {
  ref: 'Playlist',
  localField: '_id',
  foreignField: 'followers'
});

// Premium durumu
userSchema.virtual('isPremium').get(function() {
  return this.subscription.isActive && 
         this.subscription.endDate && 
         new Date() < this.subscription.endDate;
});

// Tam isim
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Profil tamamlanma yüzdesi
userSchema.virtual('profileCompleteness').get(function() {
  let completeness = 0;
  const totalFields = 10;
  
  // Zorunlu alanlar (40%)
  completeness += 4;
  
  // Opsiyonel alanlar
  if (this.bio && this.bio.trim().length > 0) completeness += 1;
  if (this.profileLinks && this.profileLinks.length > 0) completeness += 1;
  if (this.profileImage !== 'image.jpg') completeness += 1;
  if (this.events && this.events.length > 0) completeness += 1;
  if (this.additionalImages && this.additionalImages.length > 0) completeness += 1;
  if (this.phone && this.phone.trim().length > 0) completeness += 1;
  
  return Math.round((completeness / totalFields) * 100);
});

// Takipçi/takip sayısı
userSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// ========== MIDDLEWARE ==========
// Maksimum 5 link kontrolü
userSchema.pre('save', function(next) {
  if (this.profileLinks && this.profileLinks.length > 5) {
    const error = new Error('Maksimum 5 link ekleyebilirsiniz');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Favorite genres maksimum 3
userSchema.pre('save', function(next) {
  if (this.musicPreferences.favoriteGenres && 
      this.musicPreferences.favoriteGenres.length > 3) {
    this.musicPreferences.favoriteGenres = this.musicPreferences.favoriteGenres.slice(0, 3);
  }
  next();
});

// ========== INSTANCE METHODS ==========
/**
 * Listing rights kontrolü
 */
userSchema.methods.checkListingRights = async function() {
  const ListingRights = mongoose.model('ListingRights');
  return await ListingRights.findOne({ userId: this._id });
};

/**
 * Genel kullanıcı istatistikleri
 */
userSchema.methods.getStats = async function() {
  const StoreListing = mongoose.model('StoreListing');
  const ListingRights = mongoose.model('ListingRights');
  
  const [activeListings, totalListings, rights] = await Promise.all([
    StoreListing.countDocuments({ userId: this._id, status: 'active', isActive: true }),
    StoreListing.countDocuments({ userId: this._id }),
    ListingRights.findOne({ userId: this._id })
  ]);
  
  return {
    activeListings,
    totalListings,
    availableRights: rights ? rights.availableRights : 0,
    totalRights: rights ? rights.totalRights : 0,
    usedRights: rights ? rights.usedRights : 0,
    followersCount: this.followers ? this.followers.length : 0,
    followingCount: this.following ? this.following.length : 0
  };
};

/**
 * Müzik tercihlerini güncelle
 */
userSchema.methods.updateMusicPreferences = async function(genres) {
  // Maksimum 3 genre
  if (genres.length > 3) {
    genres = genres.slice(0, 3);
  }
  
  this.musicPreferences.favoriteGenres = genres;
  return await this.save();
};

/**
 * Müzik istatistiklerini getir
 */
userSchema.methods.getMusicStats = async function() {
  const Music = mongoose.model('Music');
  const Playlist = mongoose.model('Playlist');
  
  const [likedMusicCount, userPlaylistCount, followedPlaylistCount] = await Promise.all([
    Music.countDocuments({ userLikes: this._id }),
    Playlist.countDocuments({ userId: this._id, isActive: true }),
    Playlist.countDocuments({ followers: this._id, isActive: true })
  ]);
  
  return {
    likedMusicCount,
    userPlaylistCount,
    followedPlaylistCount,
    favoriteGenres: this.musicPreferences?.favoriteGenres || [],
    totalActivity: this.musicActivity.totalLikes + 
                   this.musicActivity.totalPlaylists + 
                   this.musicActivity.totalPlaylistFollows
  };
};

/**
 * Müzik aktivitesini güncelle
 */
userSchema.methods.updateMusicActivity = async function(activityType) {
  this.musicActivity.lastMusicActivity = new Date();
  
  switch(activityType) {
    case 'like':
      this.musicActivity.totalLikes += 1;
      break;
    case 'unlike':
      this.musicActivity.totalLikes = Math.max(0, this.musicActivity.totalLikes - 1);
      break;
    case 'create_playlist':
      this.musicActivity.totalPlaylists += 1;
      break;
    case 'delete_playlist':
      this.musicActivity.totalPlaylists = Math.max(0, this.musicActivity.totalPlaylists - 1);
      break;
    case 'follow_playlist':
      this.musicActivity.totalPlaylistFollows += 1;
      break;
    case 'unfollow_playlist':
      this.musicActivity.totalPlaylistFollows = Math.max(0, this.musicActivity.totalPlaylistFollows - 1);
      break;
  }
  
  return await this.save();
};

/**
 * Follow/Unfollow toggle
 */
userSchema.methods.toggleFollow = async function(targetUserId) {
  const targetUserIdStr = targetUserId.toString();
  const index = this.following.findIndex(id => id.toString() === targetUserIdStr);
  
  if (index === -1) {
    // Follow
    this.following.push(targetUserId);
    
    // Target user'ın followers'ına ekle
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: this._id }
    });
    
    return { action: 'followed', success: true };
  } else {
    // Unfollow
    this.following.splice(index, 1);
    
    // Target user'ın followers'ından çıkar
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: this._id }
    });
    
    return { action: 'unfollowed', success: true };
  }
};

/**
 * Takip ediyor mu?
 */
userSchema.methods.isFollowing = function(userId) {
  const userIdStr = userId.toString();
  return this.following.some(id => id.toString() === userIdStr);
};

/**
 * Public profile data
 */
userSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    profileImage: this.profileImage,
    bio: this.bio,
    profileLinks: this.profileLinks,
    events: this.events,
    additionalImages: this.additionalImages,
    followerCount: this.followerCount,
    followingCount: this.followingCount,
    isPremium: this.isPremium,
    profileCompleteness: this.profileCompleteness,
    musicPreferences: {
      favoriteGenres: this.musicPreferences.favoriteGenres
    },
    createdAt: this.createdAt
  };
};

// ========== STATIC METHODS ==========
/**
 * Listing rights'ı olan kullanıcıları bul
 */
userSchema.statics.findUsersWithRights = async function() {
  const ListingRights = mongoose.model('ListingRights');
  const usersWithRights = await ListingRights.find({ availableRights: { $gt: 0 } })
    .populate('userId', 'username email firstName lastName')
    .lean();
  
  return usersWithRights.map(rights => ({
    ...rights.userId,
    availableRights: rights.availableRights
  }));
};

/**
 * Premium kullanıcıları bul
 */
userSchema.statics.findPremiumUsers = async function() {
  const now = new Date();
  return this.find({
    'subscription.isActive': true,
    'subscription.endDate': { $gt: now },
    isActive: true
  }).select('-password -resetToken -resetTokenExpire').lean();
};

/**
 * Genre'ye göre kullanıcı öner
 */
userSchema.statics.findUsersByGenre = async function(genre, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    'musicPreferences.favoriteGenres': genre,
    isActive: true
  })
  .select('-password -resetToken -resetTokenExpire')
  .limit(limit)
  .skip(skip)
  .lean();
};

/**
 * Aktif kullanıcıları ara
 */
userSchema.statics.searchUsers = async function(searchQuery, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find(
    {
      $text: { $search: searchQuery },
      isActive: true
    },
    { score: { $meta: 'textScore' } }
  )
  .select('-password -resetToken -resetTokenExpire')
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .skip(skip)
  .lean();
};

// ========== JSON TRANSFORMATION ==========
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetToken;
  delete userObject.resetTokenExpire;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);