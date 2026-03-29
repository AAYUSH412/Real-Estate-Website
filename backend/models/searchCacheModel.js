import mongoose from 'mongoose';

// Cache TTL in seconds (default: 3 hours = 10800 seconds)
// Can be overridden via environment variable CACHE_TTL_SECONDS
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 10800;

const searchCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: CACHE_TTL // TTL index: auto-delete after CACHE_TTL seconds
  }
});

export default mongoose.model('SearchCache', searchCacheSchema);
