import express from 'express';
import rateLimit from 'express-rate-limit';
import { searchProperties, getLocationTrends } from '../controller/propertyController.js';
import { transformAISearchRequest } from '../middleware/transformRequest.js';

const router = express.Router();

// ── AI-specific rate limiter (much tighter than the global one) ───────────────
// Each AI call costs real Firecrawl + GitHub Models quota, so cap per IP/hour.
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10,                   // max 10 AI searches per IP per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'AI search limit reached (10 searches per hour). Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
    },
    keyGenerator: (req) => {
        // Respect Render/Vercel proxy header
        const forwarded = req.headers['x-forwarded-for'];
        return forwarded ? forwarded.split(',')[0].trim() : req.ip;
    },
});

// Original route (backend format) — also rate-limited
router.post('/properties/search', aiLimiter, searchProperties);

// Alias route for frontend — transforms format, then rate-limits, then searches
router.post('/ai/search', aiLimiter, transformAISearchRequest, searchProperties);

// Location trends — same rate limit (shares the 10/hr budget)
router.get('/locations/:city/trends', aiLimiter, getLocationTrends);

export default router;