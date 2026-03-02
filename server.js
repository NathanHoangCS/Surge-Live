const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const marketsRouter = require('./routes/markets');
const picksRouter = require('./routes/picks');
const leaderboardRouter = require('./routes/leaderboard');
const usersRouter = require('./routes/users');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// MIDDLEWARE
// ===========================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:8080',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===========================================
// API ROUTES
// ===========================================

app.use('/api/markets', marketsRouter);
app.use('/api/picks', picksRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/users', usersRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// ===========================================
// SERVE CLIENT APPLICATION
// ===========================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     ⚡ SURGE LIVE SERVER RUNNING     ║
╚═══════════════════════════════════════╝

🚀 Server:      http://localhost:${PORT}
🌐 API:         http://localhost:${PORT}/api
📊 Health:      http://localhost:${PORT}/api/health
🔧 Environment: ${process.env.NODE_ENV || 'development'}

Press Ctrl+C to stop the server
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});