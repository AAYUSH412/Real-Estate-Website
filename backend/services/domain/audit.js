import AdminActivityLog from '../../models/adminActivityLogModel.js';

export async function audit(req, action, targetType, target, metadata = {}, session) {
  const actor = req.admin || req.user;
  const [record] = await AdminActivityLog.create([{
    adminEmail: actor?.email || 'system',
    actorType: req.admin ? 'admin' : req.user ? 'user' : 'system',
    actorId: actor?._id, sessionId: req.authSession?._id,
    action, targetType, targetId: target?._id || target || null,
    targetName: target?.title || target?.name || '', metadata: { ...metadata, ...(target?.__v !== undefined && { entityVersion: target.__v }) },
    ipAddress: String(req.ip || '').slice(0, 100), userAgent: String(req.headers?.['user-agent'] || '').slice(0, 500),
    requestId: String(req.requestId || '').slice(0, 100),
  }], { session });
  return record;
}
