/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring server health:
 * - /health      : Lightweight liveness probe (for load balancers)
 * - /health/ready: Detailed readiness probe (checks dependencies)
 */

import express from 'express';
import mongoose from 'mongoose';
import os from 'os';

const router = express.Router();

/**
 * GET /health
 * Lightweight liveness probe for load balancers
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Detailed readiness probe with dependency checks
 */
router.get('/ready', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: {},
  };

  let httpStatus = 200;

  // Check MongoDB connection
  try {
    const dbState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    if (dbState === 1) {
      // Measure DB latency with a simple ping
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const latency = Date.now() - start;

      health.checks.database = {
        status: 'healthy',
        state: stateMap[dbState],
        latency: `${latency}ms`,
      };
    } else {
      health.checks.database = {
        status: 'unhealthy',
        state: stateMap[dbState] || 'unknown',
      };
      health.status = 'degraded';
      httpStatus = 503;
    }
  } catch (err) {
    health.checks.database = {
      status: 'unhealthy',
      error: err.message,
    };
    health.status = 'degraded';
    httpStatus = 503;
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  health.checks.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    systemFree: `${Math.round(freeMem / 1024 / 1024)}MB`,
    systemTotal: `${Math.round(totalMem / 1024 / 1024)}MB`,
  };

  // System info
  health.system = {
    platform: process.platform,
    nodeVersion: process.version,
    cpuCores: os.cpus().length,
    loadAvg: os.loadavg().map((l) => l.toFixed(2)),
  };

  // Environment info
  health.environment = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
  };

  res.status(httpStatus).json(health);
});

export default router;
