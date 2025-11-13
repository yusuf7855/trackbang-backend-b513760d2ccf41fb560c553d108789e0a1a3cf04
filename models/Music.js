const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Şarkı adı gereklidir'],
        trim: true,
        maxlength: [200, 'Şarkı adı en fazla 200 karakter olabilir']
    },
    artist: {
        type: String,
        required: [true, 'Sanatçı adı gereklidir'],
        trim: true,
        maxlength: [200, 'Sanatçı adı en fazla 200 karakter olabilir']
    },
    imageUrl: {
        type: String,
        required: [true, 'Şarkı görseli gereklidir']
    },
    imagePath: {
        type: String,
        default: null
    },
    genre: {
        type: String,
        required: [true, 'Tür gereklidir'],
        enum: {
            values: ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'],
            message: '{VALUE} geçerli bir tür değildir'
        },
        lowercase: true
    },
    platformLinks: {
        spotify: {
            type: String,
            default: null,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https:\/\/(open\.spotify\.com)\/(intl-[a-z]{2}\/)?(track|album|playlist)\/[a-zA-Z0-9]+(\?.*)?$/.test(v);
                },
                message: 'Geçerli bir Spotify linki giriniz'
            }
        },
        appleMusic: {
            type: String,
            default: null,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https:\/\/(music\.apple\.com)\/[a-z]{2}\//.test(v);
                },
                message: 'Geçerli bir Apple Music linki giriniz'
            }
        },
        youtubeMusic: {
            type: String,
            default: null,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https:\/\/(music\.youtube\.com|www\.youtube\.com)\/(watch|playlist)/.test(v);
                },
                message: 'Geçerli bir YouTube Music linki giriniz'
            }
        },
        beatport: {
            type: String,
            default: null,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https:\/\/(www\.)?beatport\.com\/(track|release|chart|artist|label)\/[a-zA-Z0-9\-]+\/\d+/.test(v);
                },
                message: 'Geçerli bir Beatport linki giriniz'
            }
        },
        soundcloud: {
            type: String,
            default: null,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^https:\/\/(soundcloud\.com|on\.soundcloud\.com)\//.test(v);
                },
                message: 'Geçerli bir SoundCloud linki giriniz'
            }
        }
    },
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
    metadata: {
        type: Map,
        of: String,
        default: {}
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ========== INDEXES ==========

musicSchema.index({ title: 'text', artist: 'text' });
musicSchema.index({ genre: 1, isActive: 1 });
musicSchema.index({ isFeatured: 1, isActive: 1 });
musicSchema.index({ createdAt: -1 });
musicSchema.index({ likes: -1 });
musicSchema.index({ views: -1 });

// Virtual for platform link count
musicSchema.virtual('platformLinkCount').get(function() {
    if (!this.platformLinks) return 0;
    return Object.values(this.platformLinks).filter(link => link !== null && link !== '').length;
});

// ========== INSTANCE METHODS ==========

musicSchema.methods.toggleLike = async function(userId) {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const hasLiked = this.userLikes.some(id => id.equals(userIdObj));

    if (hasLiked) {
        this.userLikes = this.userLikes.filter(id => !id.equals(userIdObj));
        this.likes = Math.max(0, this.likes - 1);
    } else {
        this.userLikes.push(userIdObj);
        this.likes += 1;
    }

    await this.save();
    return this;
};

// ========== STATIC METHODS ==========

musicSchema.statics.searchMusic = function(query, options = {}) {
    const { limit = 20, skip = 0 } = options;

    return this.find(
        { $text: { $search: query }, isActive: true },
        { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip)
    .lean();
};

musicSchema.statics.findFeatured = function(options = {}) {
    const { limit = 10, genre = null } = options;

    const query = { isFeatured: true, isActive: true };
    if (genre) query.genre = genre;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

musicSchema.statics.findPopular = function(options = {}) {
    const { limit = 10, genre = null } = options;

    const query = { isActive: true };
    if (genre) query.genre = genre;

    return this.find(query)
        .sort({ likes: -1, views: -1 })
        .limit(limit)
        .lean();
};

musicSchema.statics.findNewReleases = function(options = {}) {
    const { limit = 10, genre = null, days = 7 } = options;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const query = { 
        isActive: true,
        createdAt: { $gte: dateThreshold }
    };
    if (genre) query.genre = genre;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

musicSchema.statics.findByPlatform = function(platform, options = {}) {
    const { limit = 20, skip = 0 } = options;

    const validPlatforms = ['spotify', 'appleMusic', 'youtubeMusic', 'beatport', 'soundcloud'];
    if (!validPlatforms.includes(platform)) {
        throw new Error('Invalid platform');
    }

    const query = { 
        isActive: true,
        [`platformLinks.${platform}`]: { $ne: null, $exists: true }
    };

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
};

musicSchema.statics.getPlatformStats = async function() {
    const stats = {
        total: await this.countDocuments({ isActive: true }),
        spotify: await this.countDocuments({ 
            isActive: true, 
            'platformLinks.spotify': { $ne: null, $exists: true } 
        }),
        appleMusic: await this.countDocuments({ 
            isActive: true, 
            'platformLinks.appleMusic': { $ne: null, $exists: true } 
        }),
        youtubeMusic: await this.countDocuments({ 
            isActive: true, 
            'platformLinks.youtubeMusic': { $ne: null, $exists: true } 
        }),
        beatport: await this.countDocuments({ 
            isActive: true, 
            'platformLinks.beatport': { $ne: null, $exists: true } 
        }),
        soundcloud: await this.countDocuments({ 
            isActive: true, 
            'platformLinks.soundcloud': { $ne: null, $exists: true } 
        })
    };

    return stats;
};

// ========== PRE HOOKS ==========

musicSchema.pre('save', function(next) {
    if (this.genre) {
        this.genre = this.genre.toLowerCase();
    }
    next();
});

musicSchema.pre('save', function(next) {
    if (this.platformLinks) {
        Object.keys(this.platformLinks).forEach(key => {
            if (this.platformLinks[key] === '' || this.platformLinks[key] === 'null') {
                this.platformLinks[key] = null;
            }
        });
    }
    next();
});

// ========== POST INIT HOOK - DROP OLD INDEXES ==========

musicSchema.post('init', async function() {
    try {
        const collection = this.collection;
        const indexes = await collection.indexes();
        
        // Check if old spotifyId index exists
        const hasSpotifyIdIndex = indexes.some(idx => idx.name === 'spotifyId_1');
        
        if (hasSpotifyIdIndex) {
            console.log('🔧 Dropping old spotifyId_1 index...');
            await collection.dropIndex('spotifyId_1');
            console.log('✅ Old spotifyId_1 index dropped');
        }
    } catch (error) {
        // Ignore if index doesn't exist
        if (error.code !== 27) {
            console.error('⚠️ Error dropping index:', error.message);
        }
    }
});

const Music = mongoose.model('Music', musicSchema);

// ========== DROP OLD INDEX ON STARTUP ==========

Music.init().then(async () => {
    try {
        const indexes = await Music.collection.indexes();
        console.log('📊 Current indexes:', indexes.map(idx => idx.name).join(', '));
        
        const hasSpotifyIdIndex = indexes.some(idx => idx.name === 'spotifyId_1');
        
        if (hasSpotifyIdIndex) {
            console.log('🔧 Found old spotifyId_1 index, dropping...');
            await Music.collection.dropIndex('spotifyId_1');
            console.log('✅ Successfully dropped spotifyId_1 index');
        }
    } catch (error) {
        if (error.code === 27) {
            console.log('ℹ️ spotifyId_1 index already removed');
        } else {
            console.error('⚠️ Index cleanup error:', error.message);
        }
    }
}).catch(err => {
    console.error('❌ Music model initialization error:', err.message);
});

module.exports = Music;