import { adminUser } from '../utils/accountPolicy.js';
export { getActivityLogs, exportActivityLogs } from './auditController.js';
export { getAllAppointments, updateAppointmentStatus } from './bookingController.js';
export { approveListing, rejectListing, suspendUser, banUser, unbanUser, deleteUser, bulkSuspendUsers, bulkBanUsers, bulkApproveProperties, bulkRejectProperties, bulkDeleteProperties } from './domainAdminController.js';
import { propertyDTO, appointmentDTO, pageDTO, parsePage, text, choice, id } from '@buildestate/contracts';
import { respondError } from '../utils/httpErrors.js';
import { pagination, escapeRegex } from '../utils/pagination.js';

import Property from "../models/propertyModel.js";
import Appointment from "../models/appointmentModel.js";
import User from "../models/userModel.js";


export { getAdminStats, getUserStats, getPropertyStats, getEnhancedOverview } from './dashboardController.js';

// Add these new controller functions
// ── Admin listing review ──────────────────────────────────────────────────────

/** GET /api/admin/properties/pending — FIFO queue of user-submitted listings */
export const getPendingListings = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query, 15);
    const query = { status: 'pending' };
    const searchTerm = req.query.search === undefined ? '' : text(req.query.search, 'search', { min: 0, max: 200 });
    if (searchTerm) {
      const search = { $regex: escapeRegex(searchTerm), $options: 'i' };
      const owners = await User.find({ $or: [{ name: search }, { email: search }] }).select('_id').limit(100);
      query.$or = [{ title: search }, { location: search }, { postedBy: { $in: owners.map(user => user._id) } }];
    }

    // Get total count for pagination metadata
    const totalProperties = await Property.countDocuments(query);
    const totalPages = Math.ceil(totalProperties / limit);

    // Get properties with pagination
    const properties = await Property.find(query)
      .populate("postedBy", "name email")
      .sort({ createdAt: 1, _id: 1 }) // oldest first (FIFO)
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      properties: properties.map(p => propertyDTO(p, true)),
      pagination: {
        total: totalProperties,
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
    return respondError(res, error);
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
    const search = req.query.search === undefined ? undefined : text(req.query.search, 'search', { min: 0 });
    const sortBy = choice(req.query.sortBy || 'createdAt', ['createdAt', 'lastActive', 'name'], 'sortBy'); // createdAt, lastActive, name
    const sortOrder = choice(req.query.sortOrder || 'desc', ['asc', 'desc'], 'sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query = { status: { $ne: 'deleted' }, deletedAt: null };
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
      User.countDocuments({ deletedAt: null, status: 'active' }),
      User.countDocuments({ deletedAt: null, status: 'suspended' }),
      User.countDocuments({ deletedAt: null, status: 'banned' })
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    // Get users with sorting
    const users = await User.find(query)
      .select('-password -resetToken -resetTokenExpire') // Exclude sensitive fields
      .sort({ [sortBy]: sortOrder, _id: sortOrder })
      .limit(limit)
      .skip(skip);

    const counts = await Property.aggregate([{ $match: { postedBy: { $in: users.map(user => user._id) }, status: { $ne: 'archived' } } }, { $group: { _id: '$postedBy', count: { $sum: 1 } } }]);
    const byUser = new Map(counts.map(row => [String(row._id), row.count]));
    const usersWithCounts = users.map(user => ({ ...adminUser(user), propertyCount: byUser.get(String(user._id)) || 0 }));

    res.json({
      success: true,
      users: usersWithCounts,
      pagination: {
        total: totalUsers,
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
        .sort({ createdAt: -1, _id: -1 })
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
