import express from 'express';
import rateLimit from 'express-rate-limit';
import { searchProperties, getLocationTrends, getLocalitySuggestions, createUserListing, getUserListings, updateUserListing, deleteUserListing, validateApiKeys, getCacheStats } from '../controller/propertyController.js';
import { transformAISearchRequest } from '../middleware/transformRequest.js';
import { protect, adminProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';
import { createDistributedRateLimiter } from '../utils/distributedRateLimiter.js';

const router = express.Router();

// ── AI-specific distributed rate limiter (works across multiple instances) ────
// Each AI call costs real Firecrawl + GitHub Models quota, so cap per IP/hour.
// Uses filesystem-based storage to work across multiple server instances.
const distributedLimiter = createDistributedRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: process.env.NODE_ENV === 'production' ? 10 : 200, // dev: 200/hr, prod: 10/hr
    // req.ip resolves the real client IP via Express trust-proxy;
    // parsing X-Forwarded-For directly is client-spoofable
    keyGenerator: (req) => req.ip,
    message: {
        success: false,
        message: 'AI search limit reached (10 searches per hour). Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
    },
    storePath: process.env.RATE_LIMIT_STORE_PATH || './.rate-limit-store'
});

const aiLimiter = distributedLimiter.createMiddleware();

// Original route (backend format) — also rate-limited
router.post('/properties/search', aiLimiter, searchProperties);

// Alias route for frontend — transforms format, then rate-limits, then searches
router.post('/ai/search', aiLimiter, transformAISearchRequest, searchProperties);

// Validate user-provided API keys before save/use
router.post('/ai/validate-keys', validateApiKeys);

// Locality autocomplete — harvested from cached scraped data, no AI keys needed
router.get('/ai/localities', getLocalitySuggestions);

// Location trends — same rate limit (shares the 10/hr budget)
router.get('/locations/:city/trends', aiLimiter, getLocationTrends);

// ── User listing routes (auth required) ──────────────────────────────────────
router.post('/user/properties', protect, upload.array('images', 4), createUserListing);
router.get('/user/properties', protect, getUserListings);
router.put('/user/properties/:id', protect, upload.array('images', 4), updateUserListing);
router.delete('/user/properties/:id', protect, deleteUserListing);

// ── Rate limiter stats (for monitoring) ──────────────────────────────────────
router.get('/rate-limit/stats', adminProtect, async (req, res) => {
    try {
        const stats = await distributedLimiter.getStats();
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching rate limit stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rate limit statistics',
            error: error.message
        });
    }
});

// ── Cache stats (for monitoring MongoDB cache) ──────────────────────────────
router.get('/cache/stats', adminProtect, async (req, res) => {
    try {
        const stats = await getCacheStats();
        res.json({
            success: true,
            ...stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cache statistics',
            error: error.message
        });
    }
});

export default router;