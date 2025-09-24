const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Import database services
const {
  connectDatabase,
  disconnectDatabase,
  userService,
  chatSessionService,
  preferencesService,
  usageStatsService,
  auditService,
  maintenanceService,
} = require('./database.cjs');

// Environment variables
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Initialize Express app
const app = express();
// Configure Winston logger
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'lisa-backend' },
  transports: [
    new winston.transports.File({ filename: process.env.LOG_FILE_ERROR || 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: process.env.LOG_FILE_COMBINED || 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}



// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      logger.warn('Invalid token attempt', { token: token.substring(0, 10) + '...' });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Add user info to request and log the access
    req.user = decoded;
    
    // Log the access for audit purposes
    await auditService.log({
      userId: decoded.userId,
      action: 'api_access',
      resource: req.path,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).catch(err => logger.error('Audit log failed:', err));
    
    next();
  });
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await userService.create({ email, password, name });
    
    // Log successful registration
    await auditService.log({
      userId: user.id,
      action: 'user_registered',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logger.info('New user registered', { email, name, userId: user.id });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user
    });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }
    
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userService.findByEmail(email);
    if (!user) {
      logger.warn('Failed login attempt - user not found', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await userService.validatePassword(password, user.password);
    if (!isValidPassword) {
      logger.warn('Failed login attempt - invalid password', { email });
      await auditService.log({
        userId: user.id,
        action: 'login_failed',
        resource: 'auth',
        metadata: { reason: 'invalid_password' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Record usage statistics
    await usageStatsService.record(user.id, 'login', {
      requestsCount: 1,
      additionalData: { ip: req.ip }
    });

    // Log successful login
    await auditService.log({
      userId: user.id,
      action: 'login_success',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    logger.info('User logged in', { email, userId: user.id });
    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await userService.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    await preferencesService.update(req.user.userId, preferences);
    
    logger.info('User preferences updated', { userId: req.user.userId });
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    logger.error('Preferences update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await preferencesService.get(req.user.userId);
    res.json(preferences);
  } catch (error) {
    logger.error('Preferences fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat sessions management
app.get('/api/chat/sessions', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const sessions = await chatSessionService.findByUserId(
      req.user.userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json(sessions);
  } catch (error) {
    logger.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/chat/sessions', authenticateToken, async (req, res) => {
  try {
    const { title, messages } = req.body;
    
    const session = await chatSessionService.create(req.user.userId, {
      title: title || 'New Chat',
      messages: messages || []
    });

    // Record usage statistics
    await usageStatsService.record(req.user.userId, 'chat', {
      requestsCount: 1,
      additionalData: { sessionCreated: true }
    });

    logger.info('Chat session created', { sessionId: session.id, userId: req.user.userId });
    
    res.status(201).json(session);
  } catch (error) {
    logger.error('Session creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/chat/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await chatSessionService.update(sessionId, req.user.userId, req.body);
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session updated successfully' });
  } catch (error) {
    logger.error('Session update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/chat/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await chatSessionService.delete(sessionId, req.user.userId);
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    logger.info('Chat session deleted', { sessionId, userId: req.user.userId });
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    logger.error('Session deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Usage statistics endpoints
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await usageStatsService.getByUser(
      req.user.userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    res.json(stats);
  } catch (error) {
    logger.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user/stats/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await usageStatsService.getAggregatedStats(req.user.userId);
    res.json(summary);
  } catch (error) {
    logger.error('Stats summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints (require admin role)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0, userId, action, startDate, endDate } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const logs = await auditService.getLogs(filters, parseInt(limit), parseInt(offset));
    res.json(logs);
  } catch (error) {
    logger.error('Audit logs fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/maintenance/cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sessionDays = 30, logDays = 90 } = req.body;
    
    const sessionCleanup = await maintenanceService.cleanupOldSessions(sessionDays);
    const logCleanup = await maintenanceService.cleanupOldLogs(logDays);
    
    res.json({
      message: 'Cleanup completed',
      sessionsDeleted: sessionCleanup.deleted,
      logsDeleted: logCleanup.deleted
    });
  } catch (error) {
    logger.error('Maintenance cleanup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await maintenanceService.healthCheck();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  // In production, serve React app for non-API routes
  if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Lisa backend server running on port ${PORT}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = app;