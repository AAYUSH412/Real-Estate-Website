import { adminUser } from '../utils/accountPolicy.js';
export { getActivityLogs, exportActivityLogs } from './auditController.js';
export { getAllAppointments, updateAppointmentStatus } from './bookingController.js';
export { approveListing, rejectListing, suspendUser, banUser, unbanUser, deleteUser, bulkSuspendUsers, bulkBanUsers, bulkApproveProperties, bulkRejectProperties, bulkDeleteProperties } from './domainAdminController.js';
import { propertyDTO, appointmentDTO, pageDTO, parsePage, text, choice, id } from '@buildestate/contracts';
import { respondError } from '../utils/httpErrors.js';
import { pagination, escapeRegex } from '../utils/pagination.js';

import Stats from "../models/statsModel.js";
import Property from "../models/propertyModel.js";
import Appointment from "../models/appointmentModel.js";
import User from "../models/userModel.js";

import mongoose from 'mongoose';

const formatRecentProperties = (properties) => {
  return properties.map((property) => ({
    type: "property",
    description: `New property listed: ${property.title}`,
    timestamp: property.createdAt,
  }));
};

const formatRecentAppointments = (appointments) => {
  return appointments.map((appointment) => ({
    type: "appointment",
    description:
      appointment.userId && appointment.propertyId
        ? `${appointment.userId.name} scheduled viewing for ${appointment.propertyId.title}`
        : "Appointment scheduled (details unavailable)",
    timestamp: appointment.createdAt,
  }));
};

// Add these helper functions before the existing exports
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalProperties,
      activeListings,
      totalUsers,
      pendingAppointments,
      recentActivity,
      viewsData,
    ] = await Promise.all([
      Property.countDocuments().catch(() => 0),
      Property.countDocuments({ status: "active" }).catch(() => 0),
      User.countDocuments().catch(() => 0),
      Appointment.countDocuments({ status: "pending" }).catch(() => 0),
      getRecentActivity().catch(() => []),
      getViewsData().catch(() => ({ labels: [], datasets: [] })),
    ]);

    res.json({
      success: true,
      stats: {
        totalProperties,
        activeListings,
        totalUsers,
        pendingAppointments,
        recentActivity,
        viewsData,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin statistics",
    });
  }
};

const getRecentActivity = async () => {
  try {
    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title createdAt");

    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("propertyId", "title")
      .populate("userId", "name");

    // Filter out appointments with missing user or property data
    const validAppointments = recentAppointments.filter(
      (appointment) => appointment.userId && appointment.propertyId
    );

    return [
      ...formatRecentProperties(recentProperties),
      ...formatRecentAppointments(validAppointments),
    ].sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return [];
  }
};

const getViewsData = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Stats.aggregate([
      {
        $match: {
          endpoint: /^\/api\/products\/single\//,
          method: "GET",
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Generate dates for last 30 days
    const labels = [];
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      labels.push(dateString);

      const stat = stats.find((s) => s._id === dateString);
      data.push(stat ? stat.count : 0);
    }

    return {
      labels,
      datasets: [
        {
          label: "Property Views",
          data,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  } catch (error) {
    console.error("Error generating chart data:", error);
    return {
      labels: [],
      datasets: [
        {
          label: "Property Views",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }
};

// Add these new controller functions
// ── Admin listing review ──────────────────────────────────────────────────────

/** GET /api/admin/properties/pending — FIFO queue of user-submitted listings */
export const getPendingListings = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query, 15);
    const query = { status: 'pending' };
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const search = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
      const owners = await User.find({ $or: [{ name: search }, { email: search }] }).select('_id').limit(100);
      query.$or = [{ title: search }, { location: search }, { postedBy: { $in: owners.map(user => user._id) } }];
    }

    // Get total count for pagination metadata
    const totalProperties = await Property.countDocuments(query);
    const totalPages = Math.ceil(totalProperties / limit);

    // Get properties with pagination
    const properties = await Property.find(query)
      .populate("postedBy", "name email")
      .sort({ createdAt: 1 }) // oldest first (FIFO)
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      properties: properties.map(p => propertyDTO(p, true)),
      pagination: {
        currentPage: page,
        totalPages,
        totalProperties,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching pending listings:", error);
    res.status(500).json({ success: false, message: "Error fetching pending listings" });
  }
};

/** PUT /api/admin/properties/:id/approve — approve a pending listing */
// ── USER MANAGEMENT ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Get all users with pagination, search, and filters
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query, 15);
    const status = req.query.status; // active, suspended, banned, or undefined (all)
    const search = req.query.search === undefined ? undefined : text(req.query.search, 'search');
    const sortBy = choice(req.query.sortBy || 'createdAt', ['createdAt', 'lastActive', 'name'], 'sortBy'); // createdAt, lastActive, name
    const sortOrder = choice(req.query.sortOrder || 'desc', ['asc', 'desc'], 'sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query = { status: { $ne: 'deleted' } };
    if (status && choice(status, ['active', 'suspended', 'banned'], 'status')) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    // Get total count and status counts in parallel
    const [totalUsers, activeCount, suspendedCount, bannedCount] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' })
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    // Get users with sorting
    const users = await User.find(query)
      .select('-password -resetToken -resetTokenExpire') // Exclude sensitive fields
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip);

    const counts = await Property.aggregate([{ $match: { postedBy: { $in: users.map(user => user._id) }, status: { $ne: 'archived' } } }, { $group: { _id: '$postedBy', count: { $sum: 1 } } }]);
    const byUser = new Map(counts.map(row => [String(row._id), row.count]));
    const usersWithCounts = users.map(user => ({ ...adminUser(user), propertyCount: byUser.get(String(user._id)) || 0 }));

    res.json({
      success: true,
      users: usersWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit
      },
      statusCounts: {
        active: activeCount,
        suspended: suspendedCount,
        banned: bannedCount,
        total: activeCount + suspendedCount + bannedCount
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return respondError(res, error);
  }
};

/**
 * GET /api/admin/users/:id
 * Get detailed information about a specific user
 */
export const getUserDetails = async (req, res) => {
  try {
    const userId = id(req.params.id);

    const user = await User.findById(userId).select('-password -resetToken -resetTokenExpire');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get user's properties and appointments in parallel
    const propertyPage = parsePage({ page: req.query.propertyPage, limit: 20 });
    const appointmentPage = parsePage({ page: req.query.appointmentPage, limit: 20 });
    const [properties, appointments, propertyCount, appointmentCount] = await Promise.all([
      Property.find({ postedBy: userId }).sort({ createdAt: -1, _id: -1 }).skip(propertyPage.skip).limit(propertyPage.limit),
      Appointment.find({ userId })
        .populate('propertyId', 'title location')
        .sort({ createdAt: -1 })
        .skip(appointmentPage.skip).limit(appointmentPage.limit),
      Property.countDocuments({ postedBy: userId }), Appointment.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      user: {
        ...adminUser(user),
        propertyCount, appointmentCount
      },
      properties: properties.map(p => propertyDTO(p, true)),
      appointments: appointments.map(appointmentDTO),
      propertyPagination: pageDTO(propertyCount, propertyPage.page, propertyPage.limit),
      appointmentPagination: pageDTO(appointmentCount, appointmentPage.page, appointmentPage.limit)
    });
  } catch (error) {
    respondError(res, error);
  }
};

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend a user account temporarily
 */
// ── ACTIVITY LOGS ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/activity-logs
 * Get activity logs with pagination and filters
 */
// ── ENHANCED STATS ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats/users
 * Get user analytics and statistics
 */
export const getUserStats = async (req, res) => {
  try {
    // Check if database is connected
    if (!mongoose.connection.readyState) {
      console.warn('Database not connected for getUserStats');
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
        code: 'DB_NOT_CONNECTED'
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      newUsersLast30Days,
      topUsers
    ] = await Promise.all([
      User.countDocuments().catch(() => 0),
      User.countDocuments({ status: 'active' }).catch(() => 0),
      User.countDocuments({ status: 'suspended' }).catch(() => 0),
      User.countDocuments({ status: 'banned' }).catch(() => 0),
      // New users over time (last 30 days)
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).catch(() => []),
      // Top users by property count
      Property.aggregate([
        {
          $match: { postedBy: { $ne: null } }
        },
        {
          $group: {
            _id: "$postedBy",
            propertyCount: { $sum: 1 }
          }
        },
        { $sort: { propertyCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            name: '$user.name',
            email: '$user.email',
            propertyCount: 1
          }
        }
      ]).catch(() => [])
    ]);

    // Format new users chart data (fill missing days with 0)
    const labels = [];
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      labels.push(dateString);
      
      const stat = newUsersLast30Days.find(s => s._id === dateString);
      data.push(stat ? stat.count : 0);
    }

    res.json({
      success: true,
      data: {
        Total: totalUsers,
        Active: activeUsers,
        Suspended: suspendedUsers,
        Banned: bannedUsers,
        newUsersByDay: newUsersLast30Days,
        newUsersChart: {
          labels,
          datasets: [{
            label: 'New Users',
            data,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        topUsers
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ success: false, message: "Error fetching user stats" });
  }
};

/**
 * GET /api/admin/stats/properties
 * Get property analytics and statistics
 */
export const getPropertyStats = async (req, res) => {
  try {
    // Check if database is connected
    if (!mongoose.connection.readyState) {
      console.warn('Database not connected for getPropertyStats');
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
        code: 'DB_NOT_CONNECTED'
      });
    }

    const [
      totalProperties,
      activeProperties,
      pendingProperties,
      rejectedProperties,
      expiredProperties,
      propertiesByType,
      topLocations,
      approvalRate
    ] = await Promise.all([
      Property.countDocuments().catch(() => 0),
      Property.countDocuments({ status: 'active' }).catch(() => 0),
      Property.countDocuments({ status: 'pending' }).catch(() => 0),
      Property.countDocuments({ status: 'rejected' }).catch(() => 0),
      Property.countDocuments({ status: 'expired' }).catch(() => 0),
      // Properties by type
      Property.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]).catch(() => []),
      // Top locations
      Property.aggregate([
        {
          $group: {
            _id: "$location",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).catch(() => []),
      // Calculate approval rate
      (async () => {
        const approved = await Property.countDocuments({ status: 'active', postedBy: { $ne: null } });
        const rejected = await Property.countDocuments({ status: 'rejected' });
        const total = approved + rejected;
        return total > 0 ? ((approved / total) * 100).toFixed(1) : 0;
      })()
    ]);

    // Calculate average property price
    const priceAgg = await Property.aggregate([
      { $group: { _id: null, avgPrice: { $avg: "$price" } } }
    ]);
    const avgPrice = priceAgg[0]?.avgPrice || 0;

    res.json({
      success: true,
      data: {
        totalProperties,
        activeProperties,
        pendingCount: pendingProperties,
        rejectedCount: rejectedProperties,
        approvedCount: activeProperties,
        expiredProperties,
        avgPrice: Math.round(avgPrice),
        approvalRate: parseFloat(approvalRate),
        propertiesByType,
        topLocations
      }
    });
  } catch (error) {
    console.error("Error fetching property stats:", error);
    res.status(500).json({ success: false, message: "Error fetching property stats" });
  }
};

/**
 * GET /api/admin/stats/overview
 * Get enhanced overview stats for dashboard
 */
export const getEnhancedOverview = async (req, res) => {
  try {
    // Check if database is connected
    if (!mongoose.connection.readyState) {
      console.warn('Database not connected for getEnhancedOverview');
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
        code: 'DB_NOT_CONNECTED'
      });
    }

    // Get basic stats and enhanced metrics
    const [
      totalProperties,
      activeListings,
      pendingListings,
      totalUsers,
      pendingAppointments,
      totalRevenue,
      avgPropertyPrice,
      appointmentCompletionRate,
      viewsData
    ] = await Promise.all([
      Property.countDocuments().catch(() => 0),
      Property.countDocuments({ status: 'active' }).catch(() => 0),
      Property.countDocuments({ status: 'pending' }).catch(() => 0),
      User.countDocuments().catch(() => 0),
      Appointment.countDocuments({ status: 'pending' }).catch(() => 0),

      // Calculate total platform value (sum of all active property prices)
      Property.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]).then(result => result[0]?.total || 0).catch(() => 0),

      // Calculate average property price
      Property.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, avg: { $avg: "$price" } } }
      ]).then(result => result[0]?.avg || 0).catch(() => 0),

      // Appointment completion rate
      (async () => {
        try {
          const total = await Appointment.countDocuments().catch(() => 0);
          const completed = await Appointment.countDocuments({ status: 'completed' }).catch(() => 0);
          return total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
        } catch (error) {
          return 0;
        }
      })(),

      // Get views data for charts
      getViewsData().catch(() => ({ labels: [], datasets: [] }))
    ]);

    res.json({
      success: true,
      data: {
        totalProperties,
        activeListings,
        pendingListings,
        totalUsers,
        pendingAppointments,
        totalPlatformValue: totalRevenue,
        avgPropertyPrice: avgPropertyPrice,
        appointmentCompletionRate: parseFloat(appointmentCompletionRate),
        viewsData
      }
    });
  } catch (error) {
    console.error("Error fetching enhanced overview:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Error fetching enhanced overview" });
    }
  }
};