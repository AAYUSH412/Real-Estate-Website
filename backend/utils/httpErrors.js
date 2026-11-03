import { ContractError } from '@buildestate/contracts';
export const conflict = message => new ContractError(message, 'state', 409, 'STATE_CONFLICT');
export const missing = message => new ContractError(message, 'id', 404, 'NOT_FOUND');
export const denied = message => new ContractError(message, 'authorization', 403, 'FORBIDDEN');
export function respondError(res, error) {
  if (res.headersSent) { res.destroy(); return; }
  let status = error.statusCode || error.status;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;
  if (error.code === 11000) { status = 409; code = 'CONFLICT'; message = 'This resource or reservation already exists'; }
  if (error.name === 'VersionError') { status = 409; code = 'STATE_CONFLICT'; message = 'This record changed. Refresh and try again.'; }
  if (['ValidationError', 'CastError', 'MulterError'].includes(error.name)) { status = 400; code = 'INVALID_INPUT'; }
  status ||= 500;
  return res.status(status).json({ success: false, code: String(code), message: status < 500 ? message : 'Service unavailable. Please try again.', ...(status < 500 && error.fields && { fields: error.fields }) });
}
export const handler = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { respondError(res, error); } };
