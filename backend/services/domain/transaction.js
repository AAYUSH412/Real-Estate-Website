import mongoose from 'mongoose';
// No standalone fallback: policy writes and their audit records commit together.
const effects = Symbol('postCommitEffects');
export function afterCommit(session, work) {
  if (!session?.[effects]) throw new Error('Post-commit effect requires a domain transaction');
  session[effects].push(work);
}
export async function transaction(work) {
  let committedEffects = [];
  const result = await mongoose.connection.transaction(async session => {
    // Mongoose may retry the callback. Discard effects belonging to aborted attempts.
    session[effects] = [];
    const value = await work(session);
    committedEffects = session[effects];
    return value;
  }, { readPreference: 'primary', writeConcern: { w: 'majority' } });
  for (const effect of committedEffects) {
    try { await effect(); } catch (error) { console.error('Post-commit notification failed:', error.message); }
  }
  return result;
}
