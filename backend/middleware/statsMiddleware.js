import { redactUrl } from '../utils/redactUrl.js';
import Stats from '../models/statsModel.js';

export const trackAPIStats = async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    try {
      // Skip tracking for OPTIONS and HEAD requests
      if (!['OPTIONS', 'HEAD'].includes(req.method) && !req.path.startsWith('/health') && !['/', '/status'].includes(req.path)) {
        const duration = Date.now() - start;
        await Stats.create({
          endpoint: redactUrl(req.originalUrl),
          method: req.method,
          responseTime: duration,
          statusCode: res.statusCode
        });
      }
    } catch (error) {
      // Log error but don't crash the app
      console.error('Error tracking API stats:', error);
    }
  });
  
  next();
};