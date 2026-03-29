/**
 * Winston Structured Logger for BuildEstate Backend
 *
 * Features:
 * - Log levels: error, warn, info, http, debug
 * - JSON format in production, colorized in development
 * - Automatic timestamps
 * - Error stack traces
 * - Service metadata
 */

import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Custom format for development (colorized, readable)
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, service, requestId, ...meta }) => {
    const reqId = requestId ? ` [${requestId.slice(0, 8)}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}${reqId}: ${message}${metaStr}`;
  })
);

// JSON format for production (structured, parseable)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return 'info';
    case 'test':
      return 'error';
    default:
      return 'debug';
  }
};

// Create the logger
const logger = winston.createLogger({
  level: getLogLevel(),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'buildestate-api' },
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
  // Don't exit on uncaught exceptions, let process manager handle it
  exitOnError: false,
});

// Add helper methods for common logging patterns
logger.logRequest = (req, message, meta = {}) => {
  logger.info(message, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ...meta,
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

// Stream for Morgan HTTP logger integration (optional)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export default logger;
