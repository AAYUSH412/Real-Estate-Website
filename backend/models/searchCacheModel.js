import mongoose from 'mongoose';

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
    expires: 600 // TTL index: auto-delete after 10 minutes (600 seconds)
  }
});

export default mongoose.model('SearchCache', searchCacheSchema);
