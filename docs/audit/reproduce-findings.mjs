// HISTORICAL pre-fix reproducer. Assertions deliberately describe the audit snapshot.
// After Phase 1, use backend/npm test and frontend/npm test for regression verification.
// Isolated audit probes: no server, database connection, or real provider request.
// Run from repository root: node docs/audit/reproduce-findings.mjs
// These assert PRESENT defects, and must be replaced with regression tests after fixes.
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'audit-only-placeholder-secret';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.IMAGEKIT_PUBLIC_KEY = 'audit-placeholder';
process.env.IMAGEKIT_PRIVATE_KEY = 'audit-placeholder';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/audit-placeholder';
const { default: User } = await import('../../backend/models/userModel.js');
const { default: Property } = await import('../../backend/models/propertyModel.js');
const { default: Appointment } = await import('../../backend/models/appointmentModel.js');
const { default: AIModel } = await import('../../backend/models/aiModelModel.js');
const { default: jwt } = await import('../../backend/node_modules/jsonwebtoken/index.js');
const { protect, adminProtect } = await import('../../backend/middleware/authMiddleware.js');
const { cancelAppointment } = await import('../../backend/controller/appointmentController.js');
const { updateproperty } = await import('../../backend/controller/productController.js');
const { getname } = await import('../../backend/controller/userController.js');
const { createModel } = await import('../../backend/controller/aiModelController.js');
const { createCircuitBreaker } = await import('../../backend/utils/circuitBreaker.js');
const { LLMRouter } = await import('../../backend/services/llm/LLMRouter.js');
const { validateAndFixPropertyAnalysis } = await import('../../backend/utils/validateAIResponse.js');
const { default: sitemap } = await import('../../frontend/api/sitemap.js');
const { default: emailService } = await import('../../backend/services/emailService.js');
const { readFileSync } = await import('node:fs');
emailService.sendAppointmentScheduled = async () => {};
emailService.sendAppointmentStatusUpdate = async () => {};
emailService.sendAppointmentNotificationToAdmin = async () => {};
function response() {
  return { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; },
    json(body) { this.body = body; return this; }, setHeader() {}, send(body) { this.body = body; return this; } };
}
let count = 0;
async function probe(label, fn) { await fn(); count++; console.log(`REPRODUCED ${label}`); }
await probe('S01: banned user passes shared authentication', async () => {
  User.findById = () => ({ select: async () => ({ _id: 'user', status: 'banned' }) });
  let allowed = false;
  await protect({ headers: { authorization: `Bearer ${jwt.sign({ id: 'user' }, process.env.JWT_SECRET)}` } }, response(), () => { allowed = true; });
  assert.equal(allowed, true);
});
await probe('S02: guest appointment cancellable by unrelated signed-in user', async () => {
  const appointment = { propertyId: { title: 'Audit' }, status: 'pending', save: async () => {} };
  const query = { populate: () => query, then: (resolve) => Promise.resolve(appointment).then(resolve) };
  Appointment.findById = () => query;
  const res = response();
  await cancelAppointment({ params: { id: 'guest-appointment' }, user: { _id: 'unrelated-user' }, body: {} }, res);
  assert.equal(res.statusCode, 200); assert.equal(appointment.status, 'cancelled');
});
await probe('B01: text-only admin edit erases existing images', async () => {
  const property = { image: ['https://example.com/existing.jpg'], save: async () => {} };
  Property.findById = async () => property;
  const res = response();
  await updateproperty({ body: { id: 'property', title: 'Edited' }, files: {} }, res);
  assert.equal(res.body.success, true); assert.deepEqual(property.image, []);
});
await probe('S05: profile response includes session/token hashes', async () => {
  User.findById = () => ({ select: async () => ({ name: 'Audit', userRefreshTokenHash: 'fake-hash', resetToken: 'fake-reset' }) });
  const res = response(); await getname({ user: { id: 'user' } }, res);
  assert.equal(res.body.userRefreshTokenHash, 'fake-hash'); assert.equal(res.body.resetToken, 'fake-reset');
});
await probe('S04: admin access token requires no current admin DB record', async () => {
  let allowed = false;
  await adminProtect({ headers: { authorization: `Bearer ${jwt.sign({ email: process.env.ADMIN_EMAIL }, process.env.JWT_SECRET)}` } }, response(), () => { allowed = true; });
  assert.equal(allowed, true);
});
await probe('A01: opened LLM circuit is skipped even after recovery time', async () => {
  const circuit = createCircuitBreaker({ failureThreshold: 1, timeout: 1 });
  await assert.rejects(circuit.execute(async () => { throw new Error('temporary failure'); }));
  circuit.nextAttempt = Date.now() - 100;
  let called = false;
  const router = new LLMRouter([{ name: 'audit', isHealthy: () => circuit.isHealthy(), generateText: async () => { called = true; return circuit.execute(async () => 'ok'); } }]);
  await assert.rejects(router.generateText('audit', 'audit'), /exhausted/);
  assert.equal(called, false); assert.equal(circuit.state, 'OPEN');
});
await probe('A02: creating GitHub model drops supplied provider', async () => {
  let created;
  AIModel.create = async (input) => { created = input; return input; };
  const res = response();
  await createModel({ body: { name: 'Audit', slug: 'audit', modelId: 'audit-model', provider: 'github' } }, res);
  assert.equal(res.statusCode, 201); assert.equal(created.provider, undefined);
  assert.equal(new AIModel(created).provider, 'nvidia');
});
await probe('B06: negative dimensions and empty images pass property schema validation', async () => {
  const p = new Property({ title: 'Audit', location: 'Audit', price: -1, beds: -1, baths: -1,
    sqft: -1, type: 'arbitrary', availability: 'arbitrary', description: 'Audit', image: [], amenities: [], phone: 'invalid' });
  assert.equal(p.validateSync(), undefined);
});
await probe('B08: past booking without user or guest identity passes schema', async () => {
  const p = new Appointment({ propertyId: '000000000000000000000001', date: '2000-01-01', time: 'nonsense' });
  assert.equal(p.validateSync(), undefined);
});
await probe('F06: sitemap omits real API property response', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, property: [{ _id: 'audit-listing', status: 'active' }] }) });
    const res = response(); await sitemap({}, res);
    assert.equal(res.body.includes('/property/audit-listing'), false);
  } finally { globalThis.fetch = originalFetch; }
});
await probe('A07: AI validator accepts invented property and out-of-range score', async () => {
  const parsed = validateAndFixPropertyAnalysis({ overview: [{ name: 'Invented', price: '₹9 Cr', match_score: 999 }] }, []);
  assert.equal(parsed.overview[0].name, 'Invented'); assert.equal(parsed.overview[0].match_score, 999);
});
await probe('F02: listing edit link has no application route', async () => {
  const list = readFileSync(new URL('../../frontend/src/pages/MyListingsPage.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../../frontend/src/App.tsx', import.meta.url), 'utf8');
  assert.match(list, /\/edit-property\//); assert.doesNotMatch(app, /path="\/edit-property/);
});
await probe('B02: admin JSON default serializes FormData image to empty object', async () => {
  const { default: axios } = await import('../../admin/node_modules/axios/index.js');
  const client = axios.create({ headers: { 'Content-Type': 'application/json' },
    adapter: async config => ({ data: config.data, status: 200, statusText: 'OK', headers: {}, config }) });
  const form = new FormData();
  form.append('image1', new Blob(['fake-image'], { type: 'image/png' }), 'audit.png');
  const res = await client.post('/audit-no-network', form);
  assert.deepEqual(res.data, { image1: {} });
});
console.log(`${count} isolated probes reproduced current defects. No database/provider requests made.`);
