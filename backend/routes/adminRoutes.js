import express from 'express';
import {
  getAdminStats,
  getAllAppointments,
  updateAppointmentStatus,
  getPendingListings,
  approveListing,
  rejectListing,
  // User Management
  getAllUsers,
  getUserDetails,
  suspendUser,
  banUser,
  unbanUser,
  deleteUser,
  // Bulk Operations
  bulkSuspendUsers,
  bulkBanUsers,
  bulkApproveProperties,
  bulkRejectProperties,
  bulkDeleteProperties,
  // Activity Logs
  getActivityLogs,
  exportActivityLogs,
  // Enhanced Stats
  getUserStats,
  getPropertyStats,
  getEnhancedOverview,
} from '../controller/adminController.js';
import { adminProtect } from '../middleware/authMiddleware.js';
import { registry } from '../utils/circuitBreaker.js';

const router = express.Router();

// Apply admin authentication to ALL routes
router.use(adminProtect);

router.get('/stats', getAdminStats);
router.get('/appointments', getAllAppointments);
router.put('/appointments/status', updateAppointmentStatus);

// Listing review queue
router.get('/properties/pending', getPendingListings);
router.put('/properties/:id/approve', approveListing);
router.put('/properties/:id/reject', rejectListing);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.delete('/users/:id', deleteUser);

// Bulk User Operations
router.post('/users/bulk-suspend', bulkSuspendUsers);
router.post('/users/bulk-ban', bulkBanUsers);

// Bulk Property Operations
router.post('/properties/bulk-approve', bulkApproveProperties);
router.post('/properties/bulk-reject', bulkRejectProperties);
router.post('/properties/bulk-delete', bulkDeleteProperties);

// Activity Logs
router.get('/activity-logs', getActivityLogs);
router.get('/activity-logs/export', exportActivityLogs);

// Enhanced Stats
router.get('/stats/users', getUserStats);
router.get('/stats/properties', getPropertyStats);
router.get('/stats/overview', getEnhancedOverview);

// Circuit breaker monitoring endpoint
router.get('/circuit-breakers', (req, res) => {
  try {
    const circuitBreakers = registry.getAll();
    res.json({
      success: true,
      circuitBreakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching circuit breaker status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch circuit breaker status',
      error: error.message
    });
  }
});

export default router;