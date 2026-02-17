/**
 * ClawDashboard Backend Server
 * 
 * REST API for OpenClaw monitoring dashboard
 * Port: 3200
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const agentsRouter = require('./routes/agents');
const healthRouter = require('./routes/health');
const logsRouter = require('./routes/logs');
const sessionsRouter = require('./routes/sessions');
const overviewRouter = require('./routes/overview');

const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/agents', agentsRouter);
app.use('/api/health', healthRouter);
app.use('/api/logs', logsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/overview', overviewRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ClawDashboard API',
    version: '1.0.0',
    endpoints: [
      'GET /api/overview - Combined dashboard data',
      'GET /api/agents - Agent status + tokens',
      'GET /api/agents/:id - Single agent details',
      'GET /api/health - Gateway + channels',
      'GET /api/logs - Recent errors',
      'GET /api/sessions - Session details'
    ]
  });
});

// Health check for load balancers
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint not found: ${req.method} ${req.url}`
    },
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ClawDashboard API running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`⏰ Started at ${new Date().toISOString()}`);
});

module.exports = app;
