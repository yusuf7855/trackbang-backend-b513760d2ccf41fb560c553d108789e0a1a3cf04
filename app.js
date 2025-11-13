// app.js - Clean Code Versiyonu (Platform Links System)
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ========== ENVIRONMENT CONFIGURATION ==========
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://221118047:9KY5zsMHQRJyEwGq@cluster0.rz2m5a4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log('🚀 TrackBang Server başlatılıyor...');
console.log(`📦 Environment: ${NODE_ENV}`);

// ========== MIDDLEWARE CONFIGURATION ==========

// 1. CORS (EN ÖNCE)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 2. Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Request logging (Development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ========== STATIC FILE SERVING ==========

const uploadsPath = path.join(__dirname, 'uploads');
const assetsPath = path.join(__dirname, 'assets');

console.log('📁 Uploads klasörü:', uploadsPath);
console.log('📁 Assets klasörü:', assetsPath);

// Klasörleri oluştur
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    console.log(`📁 Klasör oluşturuluyor: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectoryExists(uploadsPath);
ensureDirectoryExists(path.join(uploadsPath, 'store-listings'));
ensureDirectoryExists(path.join(uploadsPath, 'music-covers'));
ensureDirectoryExists(path.join(uploadsPath, 'playlist-covers'));
ensureDirectoryExists(path.join(uploadsPath, 'profile-images'));
ensureDirectoryExists(assetsPath);

// Static file middleware
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

app.use('/assets', express.static(assetsPath, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// ========== HOME PAGE - SERVER STATUS ==========

app.get('/', (req, res) => {
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);

  const serverInfo = {
    status: 'active',
    message: 'TrackBang API Server is running! 🎵',
    version: '2.0.0',
    system: 'Platform Links System',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      formatted: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`
    },
    environment: NODE_ENV,
    nodeVersion: process.version,
    port: PORT,
    database: {
      connected: mongoose.connection.readyState === 1,
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      name: mongoose.connection.name || 'Unknown'
    },
    features: {
      platformLinks: ['Apple Music', 'YouTube Music', 'Beatport', 'SoundCloud'],
      genres: ['Afro House', 'Indie Dance', 'Organic House', 'Down Tempo', 'Melodic House'],
      coverImages: 'Enabled',
      userMusicPreferences: 'Enabled',
      socialFeatures: 'Enabled'
    },
    endpoints: {
      health: '/health',
      api: '/api',
      documentation: '/api/docs',
      music: '/api/music',
      playlists: '/api/playlists',
      hot: '/api/hot',
      search: '/api/search',
      payments: '/api/payments'
    }
  };

  // HTML response
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TrackBang API Server</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 20px;
                padding: 40px;
                max-width: 900px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #667eea;
            }
            .logo {
                font-size: 3rem;
                margin-bottom: 10px;
            }
            h1 { 
                font-size: 2.5rem;
                color: #667eea;
                font-weight: 700;
                margin-bottom: 10px;
            }
            .version {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
            }
            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 25px;
                font-weight: 600;
                margin: 15px 0;
                background: #22c55e;
                color: white;
            }
            .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: white;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .info-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 25px;
                border-radius: 15px;
                color: white;
                transition: transform 0.3s;
            }
            .info-card:hover {
                transform: translateY(-5px);
            }
            .info-card h3 {
                margin-bottom: 15px;
                font-size: 1.2rem;
                font-weight: 600;
                border-bottom: 2px solid rgba(255,255,255,0.3);
                padding-bottom: 10px;
            }
            .info-card p {
                font-size: 0.9rem;
                line-height: 1.6;
                opacity: 0.95;
            }
            .features {
                background: #f8fafc;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .features h3 {
                color: #667eea;
                margin-bottom: 15px;
            }
            .feature-list {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            .feature-tag {
                background: #667eea;
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
            }
            .endpoints {
                background: #1e293b;
                color: white;
                padding: 25px;
                border-radius: 15px;
                margin: 20px 0;
            }
            .endpoints h3 {
                margin-bottom: 15px;
                color: #667eea;
            }
            .endpoint-list {
                display: grid;
                gap: 10px;
            }
            .endpoint-item {
                background: rgba(255,255,255,0.1);
                padding: 12px 16px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                transition: background 0.3s;
            }
            .endpoint-item:hover {
                background: rgba(255,255,255,0.2);
            }
            .timestamp {
                text-align: center;
                color: #64748b;
                font-size: 0.8rem;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎵</div>
                <h1>TrackBang API</h1>
                <span class="version">v${serverInfo.version}</span>
                <div class="status-badge">
                    <div class="status-dot"></div>
                    <span>SERVER ACTIVE</span>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>⚡ Server Info</h3>
                    <p><strong>Port:</strong> ${serverInfo.port}</p>
                    <p><strong>Environment:</strong> ${serverInfo.environment}</p>
                    <p><strong>Node.js:</strong> ${serverInfo.nodeVersion}</p>
                    <p><strong>Uptime:</strong> ${serverInfo.uptime.formatted}</p>
                </div>
                
                <div class="info-card">
                    <h3>🗄️ Database</h3>
                    <p><strong>Status:</strong> ${serverInfo.database.status}</p>
                    <p><strong>Name:</strong> ${serverInfo.database.name}</p>
                    <p><strong>Type:</strong> MongoDB Atlas</p>
                </div>
            </div>
            
            <div class="features">
                <h3>🎯 Features</h3>
                <div class="feature-list">
                    ${serverInfo.features.platformLinks.map(p => `<span class="feature-tag">${p}</span>`).join('')}
                    ${serverInfo.features.genres.map(g => `<span class="feature-tag">${g}</span>`).join('')}
                    <span class="feature-tag">Cover Images</span>
                    <span class="feature-tag">Music Preferences</span>
                    <span class="feature-tag">Social Features</span>
                </div>
            </div>
            
            <div class="endpoints">
                <h3>📡 API Endpoints</h3>
                <div class="endpoint-list">
                    <div class="endpoint-item">GET /health → Health Check</div>
                    <div class="endpoint-item">GET /api/music → Music API</div>
                    <div class="endpoint-item">GET /api/playlists → Playlists API</div>
                    <div class="endpoint-item">GET /api/hot → HOT Page</div>
                    <div class="endpoint-item">GET /api/search → Search API</div>
                    <div class="endpoint-item">POST /api/payments → Payments API</div>
                </div>
            </div>
            
            <div class="timestamp">
                Last updated: ${new Date().toLocaleString('tr-TR')}
            </div>
        </div>
        
        <script>
            setTimeout(() => window.location.reload(), 60000);
        </script>
    </body>
    </html>
    `;
    
    return res.send(html);
  }

  // JSON response
  res.json({
    success: true,
    ...serverInfo
  });
});

// ========== HEALTH CHECK ==========

app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
    },
    database: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
    },
    environment: NODE_ENV
  };
  
  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  
  res.status(statusCode).json({
    success: mongoose.connection.readyState === 1,
    ...healthCheck
  });
});

// ========== API DOCUMENTATION ==========

app.get('/api/docs', (req, res) => {
  const documentation = {
    success: true,
    message: 'TrackBang API Documentation',
    version: '2.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    features: {
      platformLinks: ['Apple Music', 'YouTube Music', 'Beatport', 'SoundCloud'],
      genres: ['afrohouse', 'indiedance', 'organichouse', 'downtempo', 'melodichouse'],
      authentication: 'JWT Bearer Token',
      fileUploads: 'Cover Images, Profile Images'
    },
    endpoints: {
      music: {
        'GET /api/music': 'Get all music (pagination)',
        'GET /api/music/:id': 'Get single music',
        'GET /api/music/featured': 'Featured music',
        'GET /api/music/popular': 'Popular music',
        'GET /api/music/new-releases': 'New releases',
        'GET /api/music/genre/:genre': 'Music by genre',
        'POST /api/music': 'Create music (Admin)',
        'PUT /api/music/:id': 'Update music (Admin)',
        'DELETE /api/music/:id': 'Delete music (Admin)',
        'POST /api/music/:id/like': 'Like/Unlike music (Auth)'
      },
      playlists: {
        'GET /api/playlists/public': 'Public playlists',
        'GET /api/playlists/admin': 'Admin playlists',
        'GET /api/playlists/category/:category': 'Playlists by genre',
        'POST /api/playlists/admin': 'Create admin playlist (Admin)',
        'POST /api/playlists': 'Create user playlist (Auth)',
        'PUT /api/playlists/:id': 'Update playlist (Auth)',
        'DELETE /api/playlists/:id': 'Delete playlist (Auth)'
      },
      hot: {
        'GET /api/hot': 'Latest from each genre',
        'GET /api/hot/genre/:genre/latest': 'Latest by genre',
        'GET /api/hot/trending': 'Trending playlists',
        'GET /api/hot/stats': 'HOT statistics'
      },
      search: {
        'GET /api/search': 'Unified search',
        'GET /api/search/users': 'Search users',
        'GET /api/search/playlists': 'Search playlists',
        'GET /api/search/musics': 'Search music',
        'GET /api/search/by-artist': 'Search by artist',
        'GET /api/search/by-genre': 'Search by genre'
      },
      payments: {
        'POST /api/payments/verify-google-play': 'Verify Google Play purchase (Auth)',
        'GET /api/payments/subscription-status': 'Get subscription status (Auth)',
        'GET /api/payments/premium-check': 'Quick premium check (Auth)'
      }
    }
  };

  res.json(documentation);
});

// ========== DEBUG ENDPOINTS (Development Only) ==========

if (NODE_ENV === 'development') {
  app.get('/debug/uploads', (req, res) => {
    try {
      const checkUploads = (dirPath, relativePath = '') => {
        if (!fs.existsSync(dirPath)) {
          return { exists: false, path: dirPath };
        }
        
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = {
          exists: true,
          path: dirPath,
          relativePath,
          files: [],
          directories: {}
        };
        
        items.forEach(item => {
          if (item.isDirectory()) {
            const subPath = path.join(dirPath, item.name);
            result.directories[item.name] = checkUploads(subPath, path.join(relativePath, item.name));
          } else {
            const stats = fs.statSync(path.join(dirPath, item.name));
            result.files.push({
              name: item.name,
              size: `${(stats.size / 1024).toFixed(2)} KB`,
              url: `${req.protocol}://${req.get('host')}/uploads${path.join(relativePath, item.name).replace(/\\/g, '/')}`
            });
          }
        });
        
        return result;
      };
      
      res.json({
        success: true,
        message: 'Uploads directory structure',
        baseUrl: `${req.protocol}://${req.get('host')}`,
        uploadsPath,
        structure: checkUploads(uploadsPath)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/debug/test-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(uploadsPath, 'store-listings', filename);
    
    if (fs.existsSync(imagePath)) {
      const stats = fs.statSync(imagePath);
      res.json({
        success: true,
        file: {
          name: filename,
          path: imagePath,
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          url: `${req.protocol}://${req.get('host')}/uploads/store-listings/${filename}`
        }
      });
    } else {
      res.json({
        success: false,
        message: 'File not found',
        searchedPath: imagePath
      });
    }
  });
}

// ========== API ROUTES ==========

console.log('📡 Loading API routes...');

const authRoutes = require('./routes/authRoutes');
const musicRoutes = require('./routes/musicRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const hotRoutes = require('./routes/hotRoutes');
const searchRoutes = require('./routes/searchRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const sampleRoutes = require('./routes/sampleRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const storeRoutes = require('./routes/storeRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Mount routes
app.use('/api/payments', paymentRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/hot', hotRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', authRoutes); // Auth routes (register, login, etc.)

console.log('✅ API routes loaded');

// ========== MONGODB CONNECTION ==========

const connectToMongoDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');

    if (!MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    
    const mongooseOptions = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      retryWrites: true,
      heartbeatFrequencyMS: 10000,
      family: 4
    };
    
    await mongoose.connect(MONGO_URI, mongooseOptions);
    
    console.log('✅ MongoDB connected successfully!');
    console.log(`📊 Database: ${mongoose.connection.name || 'default'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      home: '/',
      health: '/health',
      documentation: '/api/docs',
      music: '/api/music',
      playlists: '/api/playlists',
      hot: '/api/hot',
      search: '/api/search'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Global error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    error: NODE_ENV === 'development' ? {
      message: error.message,
      stack: error.stack
    } : undefined
  });
});

// ========== SERVER START ==========

let server;

const startServer = async () => {
  try {
    if (server && server.listening) {
      console.log('⚠️ Server already running!');
      return;
    }

    // Connect to MongoDB
    const dbConnected = await connectToMongoDB();
    
    if (!dbConnected) {
      console.log('⚠️ MongoDB connection failed, but starting server...');
    }
    
    // Start server
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🎉 ========================================');
      console.log(`🚀 TRACKBANG API SERVER RUNNING ON PORT ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log('🎉 ========================================');
      console.log('');
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error('💡 Try a different port: PORT=3001 node app.js');
      } else {
        console.error('❌ Server error:', error.message);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
};

// ========== GRACEFUL SHUTDOWN ==========

const gracefulShutdown = (signal) => {
  console.log(`\n📱 Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('🔒 HTTP server closed');
      
      mongoose.connection.close(false, () => {
        console.log('🔐 MongoDB connection closed');
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ========== START ==========

startServer();

module.exports = app;
