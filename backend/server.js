import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import connectdb from './config/mongodb.js';
import { trackAPIStats } from './middleware/statsMiddleware.js';
import { requestIdMiddleware } from './middleware/requestIdMiddleware.js';
import logger from './utils/logger.js';
import propertyrouter from './routes/productRoutes.js';
import userrouter from './routes/userRoutes.js';
import formrouter from './routes/formRoutes.js';
import newsrouter from './routes/newsRoutes.js';
import appointmentRouter from './routes/appointmentRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import healthRouter from './routes/healthRoutes.js';
import getStatusPage from './serverweb.js';
import { startExpireListingsJob } from './utils/expireListings.js';
import { startAutoUnsuspendJob } from './utils/autoUnsuspend.js';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env.local' });
}
dotenv.config(); // .env fallback / Render uses process-level env vars

const app = express();

// Configure trust proxy for different environments
if (process.env.NODE_ENV === 'production') {
  // Trust first proxy (Render, Heroku, etc.)
  app.set('trust proxy', 1);
} else {
  // In development, trust local proxies
  app.set('trust proxy', 'loopback');
}

// Enhanced rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // More lenient in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  // Skip rate limiting for successful requests in development
  skip: (req, res) => {
    // Skip for health checks and status endpoints
    if (req.path === '/status' || req.path === '/' || req.path.startsWith('/health')) return true;
    return process.env.NODE_ENV === 'development' && res.statusCode < 400;
  },
  // Custom key generator to handle proxy scenarios
  keyGenerator: (req) => {
    // Use X-Forwarded-For in production, fallback to IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && process.env.NODE_ENV === 'production') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip;
  }
});

// Security middlewares
app.use(limiter);
app.use(helmet({
  // Configure helmet for proxy environments
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  } : false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Middleware — 500kb is plenty; 50mb was dangerously large
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Request ID middleware for tracing (early in chain)
app.use(requestIdMiddleware);

app.use(trackAPIStats);

// NoSQL injection prevention
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('Sanitized NoSQL injection attempt', {
      key,
      url: req.originalUrl,
      requestId: req.requestId,
    });
  }
}));


// CORS Configuration
const parseCsv = (value = '') =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const envOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.WEBSITE_URL,
  ...parseCsv(process.env.LOCAL_URLS || ''),
  ...parseCsv(process.env.EXTRA_ALLOWED_ORIGINS || ''),
].filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:4000',
  'http://localhost:5173',
  'http://localhost:5174',
];

const allowedOrigins = [
  ...(process.env.NODE_ENV === 'production' ? [] : defaultDevOrigins),
  ...envOrigins,
];

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];
logger.info('Server starting', {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  allowedOrigins: uniqueAllowedOrigins.length ? uniqueAllowedOrigins : ['<none-configured>'],
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin or non-browser requests (curl/postman/server-to-server)
    if (!origin) return callback(null, true);

    if (uniqueAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Github-Key', 'X-Firecrawl-Key']
}));

// Database connection
connectdb().then(() => {
  logger.info('Database connected successfully');
  startExpireListingsJob();
  startAutoUnsuspendJob();
}).catch(err => {
  logger.error('Database connection error', { error: err.message, stack: err.stack });
  // Don't exit immediately - attempt to retry or continue without DB for health checks
  logger.warn('Server will continue running for health checks, but database-dependent features may fail');

  // Optionally retry connection in production
  if (process.env.NODE_ENV === 'production') {
    logger.info('Will retry database connection in 30 seconds...');
    setTimeout(() => {
      connectdb().then(() => {
        logger.info('Database reconnected successfully');
        startExpireListingsJob();
        startAutoUnsuspendJob();
      }).catch((retryErr) => {
        logger.error('Database retry failed', { error: retryErr.message });
      });
    }, 30000);
  }
});


// Health check routes (mounted early for reliability)
app.use('/health', healthRouter);

// API Routes
app.use('/api/products', propertyrouter);
app.use('/api/users', userrouter);
app.use('/api/forms', formrouter);
app.use('/api/news', newsrouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/admin', adminRouter);
app.use('/api', propertyRoutes);


app.use((err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    statusCode,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});


// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION', { error: err?.message || err, stack: err?.stack });
  logger.warn('Attempting to continue operation...');
  // Log the error but don't exit - let the application continue
  // In production, you might want to implement circuit breaker patterns
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION', { error: err.message, stack: err.stack });
  logger.warn('Attempting graceful recovery...');
  // Log the error but attempt to continue
  // For truly critical errors, implement proper error recovery
});

// Graceful shutdown
let server;
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }
  // Give processes time to finish
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Status check endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'OK',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    trustProxy: app.get('trust proxy'),
    clientIP: req.ip,
    forwardedFor: req.headers['x-forwarded-for'] || 'not-set',
    userAgent: req.headers['user-agent'] || 'not-set'
  });
});

// Root endpoint - health check HTML
app.get('/', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(getStatusPage());
  } catch (error) {
    logger.error('Error serving home page', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler - must be after all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
});

const port = process.env.PORT || 4000;

// Start server
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, '0.0.0.0', () => {
    logger.info('Server running', { port, host: '0.0.0.0' });
  });
}

export default app;