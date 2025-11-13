// app.js - Complete Production Ready (Platform Links System)
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

console.log('🚀 TrackBang Server başlatılıyor...');

// ========== MIDDLEWARE CONFIGURATION ==========

// 1. CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 2. Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ========== STATIC FILE SERVING ==========

const uploadsPath = path.join(__dirname, 'uploads');
const assetsPath = path.join(__dirname, 'assets');

console.log('📁 Uploads klasörü:', uploadsPath);
console.log('📁 Assets klasörü:', assetsPath);

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

// ========== HOME PAGE ==========

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
    nodeVersion: process.version,
    port: PORT,
    database: {
      connected: mongoose.connection.readyState === 1,
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      name: mongoose.connection.name || 'Unknown'
    },
    features: {
      platformLinks: ['Spotify', 'Apple Music', 'YouTube Music', 'Beatport', 'SoundCloud'],
      genres: ['Afro House', 'Indie Dance', 'Organic House', 'Down Tempo', 'Melodic House']
    }
  };

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
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #667eea;
            }
            .logo { font-size: 3rem; margin-bottom: 10px; }
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
                margin: 15px 5px;
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
            .info-card:hover { transform: translateY(-5px); }
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
                <div style="margin-top: 15px;">
                    <div class="status-badge">
                        <div class="status-dot"></div>
                        <span>SERVER ACTIVE</span>
                    </div>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>⚡ Server Info</h3>
                    <p><strong>Port:</strong> ${serverInfo.port}</p>
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
    }
  };
  
  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  
  res.status(statusCode).json({
    success: mongoose.connection.readyState === 1,
    ...healthCheck
  });
});

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
app.use('/api', authRoutes);

console.log('✅ API routes loaded');

// ========== MONGODB CONNECTION ==========

let isConnecting = false;
let isShuttingDown = false;

const connectToMongoDB = async () => {
  if (isConnecting || isShuttingDown) {
    console.log('⚠️ Connection already in progress or shutting down');
    return false;
  }

  try {
    isConnecting = true;
    console.log('🔄 Connecting to MongoDB...');

    if (!MONGO_URI) {
      throw new Error('MONGO_URI not found');
    }
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      retryWrites: true,
      heartbeatFrequencyMS: 10000,
      family: 4
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log(`📊 Database: ${mongoose.connection.name || 'default'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// ========== ERROR HANDLING ==========

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, req, res, next) => {
  console.error('💥 Error:', error.message);
  
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// ========== SERVER START ==========

let server;

const startServer = async () => {
  try {
    if (server && server.listening) {
      console.log('⚠️ Server already running');
      return;
    }

    const dbConnected = await connectToMongoDB();
    
    if (!dbConnected) {
      console.log('⚠️ MongoDB connection failed, but starting server...');
    }
    
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🎉 ========================================');
      console.log(`🚀 TRACKBANG API SERVER RUNNING`);
      console.log(`🌐 PORT: ${PORT}`);
      console.log(`📚 URL: http://localhost:${PORT}`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log('🎉 ========================================');
      console.log('');
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error.message);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
};

// ========== GRACEFUL SHUTDOWN ==========

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️ Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  console.log(`\n📱 Received ${signal}, shutting down gracefully...`);
  
  const shutdownTimeout = setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('🔒 HTTP server closed');
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔐 MongoDB connection closed');
    }

    clearTimeout(shutdownTimeout);
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err.message);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ========== START ==========

startServer();

module.exports = app;