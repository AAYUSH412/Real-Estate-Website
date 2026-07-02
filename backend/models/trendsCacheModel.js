import mongoose from 'mongoose';

// Trends cache TTL: 7 days = 604800 seconds
// Can be overridden via TRENDS_CACHE_TTL_SECONDS env var
const TRENDS_TTL = parseInt(process.env.TRENDS_CACHE_TTL_SECONDS, 10) || 604800;

const trendsCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: TRENDS_TTL,
  },
});

export default mongoose.model('TrendsCache', trendsCacheSchema);
