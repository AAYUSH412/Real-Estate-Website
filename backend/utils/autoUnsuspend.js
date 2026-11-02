import cron from 'node-cron';
import { reconcileSuspensions } from '../services/domain/maintenance.js';
export const checkExpiredSuspensions = reconcileSuspensions;
export function startAutoUnsuspendJob() {
  cron.schedule('10 0 * * *', () => reconcileSuspensions().catch(error => console.error('[AutoUnsuspend]', error.message)));
}
