import cron from 'node-cron';
import Property from '../models/propertyModel.js';

/**
 * Auto-expire active listings whose expiresAt date has passed.
 * Runs once every day at 00:05 (server local time).
 *
 * Only user-submitted listings have a non-null expiresAt.
 * Admin-added properties have expiresAt: null and are never expired by this job.
 */
export function startExpireListingsJob() {
    cron.schedule('5 0 * * *', async () => {
        try {
            const result = await Property.updateMany(
                {
                    status: 'active',
                    expiresAt: { $lt: new Date(), $ne: null },
                },
                { $set: { status: 'expired' } }
            );

            if (result.modifiedCount > 0) {
                console.log(`[ExpireListings] ${result.modifiedCount} listing(s) marked as expired.`);
            }
        } catch (err) {
            console.error('[ExpireListings] Cron job failed:', err.message);
        }
    });

    console.log('[ExpireListings] Cron job scheduled — runs daily at 00:05.');
}
