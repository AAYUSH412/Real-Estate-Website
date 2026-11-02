import cron from 'node-cron';
import { reconcileExpiredListings } from '../services/domain/maintenance.js';
export function startExpireListingsJob() {
  cron.schedule('5 0 * * *', () => reconcileExpiredListings().catch(error => console.error('[ExpireListings]', error.message)));
}
