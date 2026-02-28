import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import connectdb from './config/mongodb.js';
import { trackAPIStats } from './middleware/statsMiddleware.js';
import propertyrouter from './routes/ProductRouter.js';
import userrouter from './routes/UserRoute.js';
import formrouter from './routes/formrouter.js';
import newsrouter from './routes/newsRoute.js';
import appointmentRouter from './routes/appointmentRoute.js';
import adminRouter from './routes/adminRoute.js';
import propertyRoutes from './routes/propertyRoutes.js';
import getStatusPage from './serverweb.js';


dotenv.config({ path: './.env.local' });  // local dev
dotenv.config();                          // .env fallback / Render uses process-level env vars

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
    // Skip for health checks and in development for successful requests
    if (req.path === '/status' || req.path === '/') return true;
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

app.use(trackAPIStats);


// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:4000',
    'http://localhost:5174',
    'http://localhost:5173',
    'https://buildestate.vercel.app',
    'https://real-estate-website-admin.onrender.com',
    'https://real-estate-website-backend-zfu7.onrender.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'], // Added HEAD
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Github-Key', 'X-Firecrawl-Key']
}));

// Database connection
connectdb().then(() => {
  console.log('Database connected successfully');
}).catch(err => {
  console.error('Database connection error:', err);
});


// API Routes
app.use('/api/products', propertyrouter);
app.use('/api/users', userrouter);
app.use('/api/forms', formrouter);
app.use('/api/news', newsrouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/admin', adminRouter);
app.use('/api', propertyRoutes);


app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});


// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
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
    console.error('Error serving home page:', error);
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
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;