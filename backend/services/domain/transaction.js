import mongoose from 'mongoose';
// No standalone fallback: policy writes and their audit records commit together.
export const transaction = work => mongoose.connection.transaction(work, { readPreference: 'primary', writeConcern: { w: 'majority' } });
