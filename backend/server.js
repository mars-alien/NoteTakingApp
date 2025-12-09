import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import authRoutes from './routes/auth.routes.js';
import notesRoutes from './routes/notes.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { sanitizeBody, sanitizeQuery } from './middleware/sanitize.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

const require = createRequire(import.meta.url);
const connectDB = require('./config/db.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Security Middleware
// CORS configuration - restrict to frontend URL only
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing with size limits to prevent DoS attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization - protect against XSS and NoSQL injection
// Note: Upload routes handle multipart/form-data separately, so sanitization is handled there
app.use(sanitizeBody);
app.use(sanitizeQuery);

// Rate limiting - protect against abuse
app.use('/api/', apiRateLimiter);

// Health check endpoint (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/upload', uploadRoutes);

// Global error handler - catches all unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

