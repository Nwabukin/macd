const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations and middleware
const { initDatabase } = require('./config/database');
const { initBlockchain } = require('./config/blockchain');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const electionsRoutes = require('./routes/elections');
const voteRoutes = require('./routes/vote');
const blockchainAdminRoutes = require('./routes/blockchain-admin');
const adminElectionsRoutes = require('./routes/admin-elections');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// Apply rate limiting
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database and blockchain health
    const { healthCheck: dbHealthCheck } = require('./config/database');
    const { healthCheck: blockchainHealthCheck } = require('./config/blockchain');
    
    const [dbHealth, blockchainHealth] = await Promise.all([
      dbHealthCheck(),
      blockchainHealthCheck()
    ]);
    
    const isHealthy = dbHealth.healthy && blockchainHealth.healthy;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'OK' : 'DEGRADED',
      message: 'RSU E-Voting Backend Health Check',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: dbHealth,
        blockchain: blockchainHealth,
        api: {
          healthy: true,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/elections', electionsRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/admin/blockchain', blockchainAdminRoutes);
app.use('/api/admin', adminElectionsRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'RSU E-Voting System API',
    version: '1.0.0',
    documentation: {
      health: 'GET /health - System health check',
      auth: {
        adminLogin: 'POST /api/auth/admin/login',
        voterLogin: 'POST /api/auth/voter/login',
        voterSetup: 'POST /api/auth/voter/setup',
        logout: 'POST /api/auth/logout'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard',
        voters: 'GET /api/admin/voters',
        admins: 'GET /api/admin/admins',
        systemHealth: 'GET /api/admin/system/health'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${req.requestId}] Error:`, err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      error: 'Maximum file size is 5MB'
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT signal. Shutting down gracefully...');
  
  try {
    // Close database connections
    const { closeDatabase } = require('./config/database');
    await closeDatabase();
    console.log('📊 Database connections closed');
    
    console.log('🎯 Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Starting RSU E-Voting Backend Server...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔢 Node.js version: ${process.version}`);
    
    // Initialize database
    console.log('🔄 Initializing database connection...');
    await initDatabase();
    
    // Initialize blockchain connection
    console.log('🔄 Initializing blockchain connection...');
    const blockchainInitialized = await initBlockchain();
    if (!blockchainInitialized) {
      console.warn('⚠️  Blockchain initialization failed, but server will continue');
    }
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('🎯 Server ready to accept connections!');
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
