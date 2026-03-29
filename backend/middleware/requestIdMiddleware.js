/**
 * Request ID Middleware for Request Correlation
 *
 * Assigns a unique request ID to each incoming request for tracing.
 * - Uses X-Request-ID header if provided (for distributed tracing)
 * - Generates UUID v4 if not provided
 * - Attaches child logger with request context to req object
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Middleware to add request ID and child logger to each request
 */
export const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID from header or generate new one
  req.requestId = req.headers['x-request-id'] || uuidv4();

  // Set response header for client-side correlation
  res.setHeader('X-Request-ID', req.requestId);

  // Create child logger with request context
  req.logger = logger.child({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  });

  // Only log errors/warnings (4xx/5xx responses)
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      req.logger.warn('Request failed', { statusCode: res.statusCode });
    }
  });

  next();
};

export default requestIdMiddleware;
