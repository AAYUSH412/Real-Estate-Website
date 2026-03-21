/**
 * Distributed Rate Limiter using File System
 *
 * This provides a simple distributed rate limiter that works across multiple
 * server instances by using the filesystem as a shared storage mechanism.
 *
 * Note: For production environments with high concurrency, Redis would be
 * preferred, but this solution works without additional infrastructure.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class DistributedRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 60 * 1000; // 1 hour default
    this.maxRequests = options.max || 100;
    this.keyGenerator = options.keyGenerator || ((req) => req.ip);
    this.storePath = options.storePath || (
      process.env.NODE_ENV === 'production'
        ? '/tmp/.rate-limit-store'
        : path.join(process.cwd(), '.rate-limit-store')
    );
    this.skipWhenCleanupFails = options.skipWhenCleanupFails !== false;

    // Ensure store directory exists
    this.ensureStoreDirectory();

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), Math.min(this.windowMs, 5 * 60 * 1000)); // Every 5 minutes
  }

  async ensureStoreDirectory() {
    try {
      await fs.mkdir(this.storePath, { recursive: true });
    } catch (error) {
      // In containers, cwd may be read-only for non-root users; fallback to /tmp.
      if (this.storePath !== '/tmp/.rate-limit-store') {
        try {
          this.storePath = '/tmp/.rate-limit-store';
          await fs.mkdir(this.storePath, { recursive: true });
          console.warn('[RateLimiter] Primary store path unavailable. Falling back to /tmp/.rate-limit-store');
          return;
        } catch {}
      }

      console.error('Failed to create rate limit store directory:', error);
    }
  }

  /**
   * Generate a safe filename from the key
   */
  getFilePath(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(this.storePath, `${hash}.json`);
  }

  /**
   * Get current count for the key
   */
  async getCount(key) {
    const filePath = this.getFilePath(key);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const { count, resetTime } = JSON.parse(data);

      // Check if window has expired
      if (Date.now() > resetTime) {
        await this.reset(key);
        return { count: 0, resetTime: Date.now() + this.windowMs };
      }

      return { count, resetTime };
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      const resetTime = Date.now() + this.windowMs;
      return { count: 0, resetTime };
    }
  }

  /**
   * Increment count for the key
   */
  async increment(key) {
    const filePath = this.getFilePath(key);
    const { count, resetTime } = await this.getCount(key);

    const newCount = count + 1;
    const newResetTime = count === 0 ? Date.now() + this.windowMs : resetTime;

    try {
      await fs.writeFile(filePath, JSON.stringify({
        count: newCount,
        resetTime: newResetTime,
        key, // Store for debugging
        lastUpdate: Date.now()
      }));

      return { count: newCount, resetTime: newResetTime };
    } catch (error) {
      console.error(`Failed to write rate limit data for key ${key}:`, error);
      // If we can't write, assume the old count to be safe
      return { count, resetTime };
    }
  }

  /**
   * Reset count for the key
   */
  async reset(key) {
    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, which is fine
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.storePath);
      const now = Date.now();
      let cleaned = 0;

      await Promise.all(files.map(async (filename) => {
        if (!filename.endsWith('.json')) return;

        const filePath = path.join(this.storePath, filename);

        try {
          const data = await fs.readFile(filePath, 'utf8');
          const { resetTime } = JSON.parse(data);

          if (now > resetTime) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          // File is corrupted or unreadable, delete it
          try {
            await fs.unlink(filePath);
            cleaned++;
          } catch {}
        }
      }));

      if (cleaned > 0 && process.env.NODE_ENV !== 'production') {
        console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
      }
    } catch (error) {
      if (!this.skipWhenCleanupFails) {
        console.error('Rate limiter cleanup failed:', error);
      }
    }
  }

  /**
   * Express middleware factory
   */
  createMiddleware(options = {}) {
    const mergedOptions = { ...this, ...options };
    const { maxRequests, keyGenerator, windowMs } = mergedOptions;

    return async (req, res, next) => {
      try {
        const key = keyGenerator(req);
        const { count, resetTime } = await this.increment(key);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': Math.max(0, maxRequests - count),
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          'X-RateLimit-Used': count
        });

        if (count > maxRequests) {
          const message = mergedOptions.message || {
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            error: 'RATE_LIMIT_EXCEEDED'
          };

          return res.status(429).json(message);
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);

        // If rate limiting fails, we can either:
        // 1. Allow the request through (fail open)
        // 2. Block the request (fail closed)
        // We'll fail open for better user experience
        next();
      }
    };
  }

  /**
   * Get statistics about the rate limiter
   */
  async getStats() {
    try {
      const files = await fs.readdir(this.storePath);
      const activeKeys = files.filter(f => f.endsWith('.json')).length;

      return {
        activeKeys,
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
        storePath: this.storePath
      };
    } catch (error) {
      return {
        activeKeys: 0,
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
        storePath: this.storePath,
        error: error.message
      };
    }
  }
}

/**
 * Create a distributed rate limiter instance
 */
export function createDistributedRateLimiter(options) {
  return new DistributedRateLimiter(options);
}

export default DistributedRateLimiter;