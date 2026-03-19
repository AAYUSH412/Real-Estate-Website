import cron from 'node-cron';
import User from '../models/userModel.js';

/**
 * Auto-unsuspend cron job
 * Runs daily at 00:10 to check for expired suspensions
 * Automatically reactivates users whose suspension period has ended
 */
export function startAutoUnsuspendJob() {
  // Run daily at 00:10 (10 minutes after midnight)
  cron.schedule('10 0 * * *', async () => {
    try {
      console.log('[AutoUnsuspend] Starting daily auto-unsuspend check...');

      // Find users whose suspension has expired
      const result = await User.updateMany(
        {
          status: 'suspended',
          suspendedUntil: { $lt: new Date(), $ne: null }
        },
        {
          $set: { status: 'active' },
          $unset: {
            suspendedUntil: '',
            suspendReason: '',
            suspendedAt: '',
            suspendedBy: ''
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ [AutoUnsuspend] ${result.modifiedCount} user(s) automatically unsuspended.`);
      } else {
        console.log('ℹ️  [AutoUnsuspend] No users to unsuspend today.');
      }
    } catch (error) {
      console.error('❌ [AutoUnsuspend] Error during auto-unsuspend:', error);
    }
  });

  console.log('✅ Auto-unsuspend cron job scheduled (daily at 00:10)');
}

/**
 * Manual function to check for expired suspensions
 * Can be called directly for testing or manual runs
 */
export async function checkExpiredSuspensions() {
  try {
    const result = await User.updateMany(
      {
        status: 'suspended',
        suspendedUntil: { $lt: new Date(), $ne: null }
      },
      {
        $set: { status: 'active' },
        $unset: {
          suspendedUntil: '',
          suspendReason: '',
          suspendedAt: '',
          suspendedBy: ''
        }
      }
    );

    console.log(`Manual unsuspend check: ${result.modifiedCount} user(s) reactivated`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error in manual unsuspend check:', error);
    throw error;
  }
}