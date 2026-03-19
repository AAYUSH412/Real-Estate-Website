import AdminActivityLog from '../models/adminActivityLogModel.js';

/**
 * Logs administrative actions for audit trail
 * Non-fatal - errors are logged but don't interrupt the operation
 *
 * @param {string} adminEmail - Email of the admin performing the action
 * @param {string} action - Action type (from AdminActivityLog enum)
 * @param {string} targetType - Type of target (property, user, appointment)
 * @param {ObjectId} targetId - MongoDB ID of the affected document
 * @param {string} targetName - Name/title of the target for quick reference
 * @param {Object} metadata - Additional action-specific data
 * @param {Object} req - Express request object for IP and user agent
 */
export async function logAdminActivity(
  adminEmail,
  action,
  targetType,
  targetId,
  targetName,
  metadata = {},
  req = null
) {
  try {
    await AdminActivityLog.create({
      adminEmail,
      action,
      targetType,
      targetId,
      targetName,
      metadata,
      ipAddress: req?.ip || req?.headers['x-forwarded-for'] || 'unknown',
      userAgent: req?.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ Activity logged: ${action} by ${adminEmail} on ${targetType} ${targetName}`);
  } catch (err) {
    // Non-fatal: log error but don't interrupt the operation
    console.error('⚠️  Failed to log admin activity (non-fatal):', err.message);
  }
}
