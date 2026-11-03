import mongoose from 'mongoose';
import Property from '../models/propertyModel.js';
import User from '../models/userModel.js';
import Appointment from '../models/appointmentModel.js';
import Stats from '../models/statsModel.js';
import { publicListingQuery, listingStatusQuery } from '../utils/catalogQuery.js';
import { handler } from '../utils/httpErrors.js';

// Counts describe stored inventory (including archived history), public visibility,
// and non-archived accounts respectively. A failed query fails the whole response.
export const currentAccounts = () => ({ status: { $ne: 'deleted' }, deletedAt: null });
const definitions = {
  totalProperties: 'All listings, including archived history',
  activeListings: 'Currently public listings after expiry and moderation rules',
  totalUsers: 'Accounts excluding archived/deleted accounts',
  pendingAppointments: 'All appointments currently awaiting confirmation, including overdue requests',
  viewsData: 'Successful property-detail API requests; not unique people or verified page views',
  approvalRate: 'Published user submissions divided by published plus rejected user submissions',
};
const ready = () => {
  if (mongoose.connection.readyState !== 1) throw Object.assign(new Error('Database unavailable'), { statusCode: 503, code: 'DB_NOT_CONNECTED' });
};
const windowStart = () => { const date = new Date(); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - 29); return date; };
const chart = (rows, label) => {
  const start = windowStart();
  const counts = new Map(rows.map(row => [row._id, row.count]));
  const labels = Array.from({ length: 30 }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
  return { labels, timeZone: 'UTC', datasets: [{ label, data: labels.map(day => counts.get(day) || 0), borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, fill: true }] };
};
const byDay = [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }];
const views = async () => chart(await Stats.aggregate([
  { $match: { endpoint: /^\/api\/products\/single\//, method: 'GET', statusCode: { $gte: 200, $lt: 300 }, timestamp: { $gte: windowStart(), $lte: new Date() } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'UTC' } }, count: { $sum: 1 } } },
]), 'Property detail API requests');

async function recentActivity() {
  const [properties, appointments] = await Promise.all([
    Property.find().sort({ createdAt: -1, _id: -1 }).limit(5).select('title createdAt'),
    Appointment.find().sort({ createdAt: -1, _id: -1 }).limit(5).populate('propertyId', 'title').populate('userId', 'name'),
  ]);
  return [
    ...properties.map(p => ({ type: 'property', description: `New property listed: ${p.title}`, timestamp: p.createdAt })),
    ...appointments.map(a => ({ type: 'appointment', description: `${a.contactSnapshot?.name || a.userId?.name || a.guestInfo?.name || 'Guest'} scheduled viewing for ${a.propertySnapshot?.title || a.propertyId?.title || 'unavailable listing'}`, timestamp: a.createdAt })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
}
async function basic() {
  const [totalProperties, activeListings, totalUsers, pendingAppointments] = await Promise.all([
    Property.countDocuments(), Property.countDocuments(publicListingQuery()), User.countDocuments(currentAccounts()), Appointment.countDocuments({ status: 'pending' }),
  ]);
  return { totalProperties, activeListings, totalUsers, pendingAppointments };
}
export const getAdminStats = handler(async (req, res) => {
  ready();
  const [stats, activity, viewsData] = await Promise.all([basic(), recentActivity(), views()]);
  res.json({ success: true, stats: { ...stats, recentActivity: activity, viewsData }, definitions });
});
export const getEnhancedOverview = handler(async (req, res) => {
  ready();
  const [stats, pendingListings, values, total, completed, viewsData] = await Promise.all([
    basic(), Property.countDocuments({ status: 'pending' }),
    Property.aggregate([{ $match: publicListingQuery() }, { $group: { _id: null, total: { $sum: '$price' }, avg: { $avg: '$price' } } }]),
    Appointment.countDocuments(), Appointment.countDocuments({ status: 'completed' }), views(),
  ]);
  res.json({ success: true, data: { ...stats, pendingListings, totalPlatformValue: values[0]?.total || 0, avgPropertyPrice: values[0]?.avg || 0, appointmentCompletionRate: total ? Number((completed / total * 100).toFixed(1)) : 0, viewsData }, definitions });
});
export const getUserStats = handler(async (req, res) => {
  ready();
  const [total, active, suspended, banned, days, topUsers] = await Promise.all([
    User.countDocuments(currentAccounts()), ...['active', 'suspended', 'banned'].map(status => User.countDocuments({ ...currentAccounts(), status })),
    User.aggregate([{ $match: { ...currentAccounts(), createdAt: { $gte: windowStart(), $lte: new Date() } } }, ...byDay]),
    Property.aggregate([
      { $match: { postedBy: { $ne: null }, status: { $ne: 'archived' } } },
      { $group: { _id: '$postedBy', propertyCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' },
      { $match: { 'user.status': { $ne: 'deleted' }, 'user.deletedAt': null } },
      { $sort: { propertyCount: -1, _id: 1 } }, { $limit: 10 }, { $project: { name: '$user.name', email: '$user.email', propertyCount: 1 } },
    ]),
  ]);
  res.json({ success: true, data: { Total: total, Active: active, Suspended: suspended, Banned: banned, newUsersByDay: days, newUsersChart: chart(days, 'New Users'), topUsers }, definitions });
});
export const getPropertyStats = handler(async (req, res) => {
  ready();
  const [totalProperties, activeProperties, pendingCount, rejectedCount, expiredProperties, propertiesByType, topLocations, price, approved, rejected] = await Promise.all([
    Property.countDocuments(), Property.countDocuments(publicListingQuery()), Property.countDocuments({ status: 'pending' }), Property.countDocuments({ status: 'rejected' }), Property.countDocuments(listingStatusQuery('expired')),
    Property.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Property.aggregate([{ $group: { _id: '$location', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 10 }]),
    Property.aggregate([{ $match: publicListingQuery() }, { $group: { _id: null, avg: { $avg: '$price' } } }]),
    Property.countDocuments({ postedBy: { $ne: null }, publishedAt: { $ne: null } }), Property.countDocuments({ postedBy: { $ne: null }, status: 'rejected', publishedAt: null }),
  ]);
  res.json({ success: true, data: { totalProperties, activeProperties, pendingCount, rejectedCount, approvedCount: activeProperties, expiredProperties, avgPrice: Math.round(price[0]?.avg || 0), approvalRate: approved + rejected ? Number((approved / (approved + rejected) * 100).toFixed(1)) : 0, propertiesByType, topLocations }, definitions });
});
