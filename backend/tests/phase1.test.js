import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';

// Never load server.js or connectdb: this suite owns an ephemeral database.
process.env.NODE_ENV = 'test';
process.env.NVIDIA_API_KEY = 'isolated-nvidia-test-key';
process.env.JWT_SECRET = 'phase1-isolated-test-secret';
process.env.ADMIN_EMAIL = 'admin@phase1.test';
process.env.IMAGEKIT_PUBLIC_KEY = 'test-placeholder';
process.env.IMAGEKIT_PRIVATE_KEY = 'test-placeholder';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
process.env.RATE_LIMIT_STORE_PATH = path.join(tmpdir(), `buildestate-tests-${process.pid}`);
process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(tmpdir(), 'buildestate-mongo-binaries');

const { MongoMemoryReplSet } = await import('mongodb-memory-server');
const { default: mongoose } = await import('mongoose');
const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { corsOptions } = await import('../config/corsPolicy.js');
const { default: cookieParser } = await import('cookie-parser');
const { default: request } = await import('supertest');
const { default: jwt } = await import('jsonwebtoken');
const { default: bcrypt } = await import('bcryptjs');
const { default: User, Admin } = await import('../models/userModel.js');
const { loginLimiter, registrationLimiter, passwordResetLimiter, passwordResetVerifyLimiter, emailResendLimiter } = await import('../middleware/rateLimitMiddleware.js');
const { createSession } = await import('../services/sessionService.js');
const { AuthSession, RefreshCredential } = await import('../models/authSessionModel.js');
const { default: AuditLog } = await import('../models/adminActivityLogModel.js');
const { default: Property } = await import('../models/propertyModel.js');
const { default: Appointment } = await import('../models/appointmentModel.js');
const { default: AIModel, AICatalogState } = await import('../models/aiModelModel.js');
const { default: imagekit } = await import('../config/imagekit.js');
const { default: email } = await import('../services/emailService.js');
const { mountApiRoutes } = await import('../routes/mountApiRoutes.js');
const { respondError } = await import('../utils/httpErrors.js');
const { createCircuitBreaker, registry } = await import('../utils/circuitBreaker.js');
const { LLMRouter } = await import('../services/llm/LLMRouter.js');
const { modelFingerprint, MODEL_SEEDS } = await import('../services/llm/modelProfiles.js');
const { modelTestRateLimiter } = await import('../routes/adminRoutes.js');
const { NvidiaNimProvider } = await import('../services/llm/NvidiaNimProvider.js');
const { createAIService } = await import('../services/aiService.js');
const { resolveModelsByProvider } = await import('../controller/aiModelController.js');
const { redactUrl } = await import('../utils/redactUrl.js');
const { pagination } = await import('../utils/pagination.js');
const { saveListing } = await import('../services/listingService.js');
const { createFirecrawlService } = await import('../services/firecrawlService.js');

for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(email))) {
  if (method.startsWith('send')) email[method] = async () => ({ success: true });
}
const app = express();
app.use(cors(corsOptions({ NODE_ENV: 'test' })));
app.use(express.json());
app.use(cookieParser());
mountApiRoutes(app);
app.use((error, req, res, next) => respondError(res, error));

const testServer = createServer(app);
let mongo, owner, other, adminToken, passwordHash;
let uploads = [], removed = [];
const password = 'Phase1-password!';
const tokens = new Map();
const auth = user => `Bearer ${tokens.get(user.id)}`;
const futureDay = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const adminAuth = () => `Bearer ${adminToken}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=', 'base64');
const fields = { title: 'Phase 1 home', location: 'Pune', price: 5000000, beds: 2, baths: 2, sqft: 1000,
  type: 'Flat', availability: 'For Sale', description: 'Test listing', phone: '+919999999999', amenities: ['Parking', 'Gym'] };
const property = overrides => Property.create({ ...fields, image: ['https://example.com/old.jpg'], ...overrides });
const cookieFrom = response => response.headers['set-cookie'].find(c => c.startsWith('user_refresh=')).split(';')[0];
async function session(user = owner, rememberMe = false) {
  const res = await request(testServer).post('/api/users/login').send({ email: user.email, password, rememberMe });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { token: `Bearer ${res.body.token}`, cookie: cookieFrom(res), response: res };
}

before(async () => {
  await new Promise(resolve => testServer.listen(0, '127.0.0.1', resolve));
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongo.getUri());
  passwordHash = await bcrypt.hash(password, 4);
  await Admin.create({ email: process.env.ADMIN_EMAIL, password });
  await Promise.all([User.init(), Property.init(), Appointment.init(), AuthSession.init(), RefreshCredential.init(), AuditLog.init(), AIModel.init(), AICatalogState.init()]);
}, { timeout: 180000 });

beforeEach(async () => {
  for (const limiter of [loginLimiter, registrationLimiter, passwordResetLimiter, passwordResetVerifyLimiter, emailResendLimiter]) for (const ip of ['::ffff:127.0.0.1', '127.0.0.1', '::1']) await limiter.resetKey(ip);
  await Promise.all([User.deleteMany({}), Property.deleteMany({}), Appointment.deleteMany({}), AuthSession.deleteMany({}), RefreshCredential.deleteMany({}), AuditLog.deleteMany({}), AIModel.deleteMany({}), AICatalogState.deleteMany({})]);
  owner = await User.create({ name: 'Owner', email: 'owner@phase1.test', password: passwordHash, isEmailVerified: true });
  other = await User.create({ name: 'Other', email: 'other@phase1.test', password: passwordHash, isEmailVerified: true });
  for (const user of [owner, other]) tokens.set(user.id, (await createSession(user, 'user')).token);
  adminToken = (await createSession(await Admin.findOne({}), 'admin')).token;
  await modelTestRateLimiter.reset(`ai-model-test:${(await Admin.findOne({}))._id}`);
  uploads = []; removed = [];
  imagekit.upload = async options => {
    const id = `image-${uploads.length + 1}`;
    uploads.push(options);
    return { url: `https://example.com/${id}.png`, fileId: id };
  };
  imagekit.deleteFile = async id => { removed.push(id); };
});
after(async () => {
  testServer.closeAllConnections();
  await new Promise((resolve, reject) => testServer.close(error => error ? reject(error) : resolve()));
  await mongoose.disconnect();
  await mongo?.stop();
});

test('ban revokes old access and refresh credentials; login stays blocked after ban', async () => {
  const old = await session();
  const res = await request(testServer).put(`/api/admin/users/${owner.id}/ban`).set('Authorization', adminAuth()).send({ reason: 'Test ban' });
  assert.equal(res.status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 403);
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  assert.equal((await request(testServer).post('/api/users/login').send({ email: owner.email, password })).status, 403);
  await request(testServer).put(`/api/admin/users/${owner.id}/unban`).set('Authorization', adminAuth()).send({});
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 401);
});

test('suspension blocks old access, and an expired suspension allows a fresh login', async () => {
  const old = await session();
  const res = await request(testServer).put(`/api/admin/users/${owner.id}/suspend`).set('Authorization', adminAuth()).send({ reason: 'Test suspension', days: 1 });
  assert.equal(res.status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 403);
  await User.updateOne({ _id: owner._id }, { suspendedUntil: new Date(Date.now() - 1000) });
  const fresh = await session();
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', fresh.token)).status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 401);
});

test('bulk ban and bulk suspension revoke refresh and access tokens', async () => {
  for (const action of ['bulk-ban', 'bulk-suspend']) {
    await User.updateOne({ _id: owner._id }, { status: 'active' });
    const old = await session();
    const res = await request(testServer).post(`/api/admin/users/${action}`).set('Authorization', adminAuth()).send({ userIds: [owner.id], reason: 'Test bulk', days: 1 });
    assert.equal(res.status, 200);
    assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 403);
    assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  }
});

test('password reset atomically consumes reset token and revokes existing sessions', async () => {
  const old = await session();
  let resetUrl;
  email.sendPasswordResetEmail = async (to, url) => { resetUrl = url; };
  await request(testServer).post('/api/users/forgot').send({ email: owner.email });
  const resetToken = resetUrl.split('/').pop();
  const res = await request(testServer).post(`/api/users/reset/${resetToken}`).send({ password: 'New-password-123' });
  assert.equal(res.status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 401);
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  assert.equal((await request(testServer).post(`/api/users/reset/${resetToken}`).send({ password: 'Another-password' })).status, 400);
});

test('profile password change revokes old JWT and refresh credentials', async () => {
  const old = await session();
  const res = await request(testServer).put('/api/users/me').set('Authorization', old.token).send({ currentPassword: password, newPassword: 'Changed-password-123' });
  assert.equal(res.status, 200); assert.equal(res.body.sessionRevoked, true);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 401);
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
});

test('refresh rotation accepts an old cookie once and preserves remembered lifetime', async () => {
  const old = await session(owner, true);
  const results = await Promise.all([1, 2].map(() => request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
  assert.match(results.find(r => r.status === 200).headers['set-cookie'][0], /Max-Age=259[12]\d{3}/);
});

test('safe profile/admin/appointment DTOs exclude all credential hashes', async () => {
  const old = await session();
  await User.updateOne({ _id: owner._id }, { resetToken: 'secret-reset', emailVerificationToken: 'secret-verification' });
  const res = await request(testServer).get('/api/users/me').set('Authorization', old.token);
  for (const key of ['password', 'resetToken', 'emailVerificationToken', 'userRefreshTokenHash', 'sessionVersion', 'lockUntil']) assert.equal(res.body[key], undefined);
  const users = await request(testServer).get('/api/admin/users').set('Authorization', adminAuth());
  assert.equal(users.body.users.find(u => u._id === owner.id).userRefreshTokenHash, undefined);
  const p = await property();
  const apt = await Appointment.create({ propertyId: p.id, userId: owner.id, date: futureDay, time: '10:00' });
  const changed = await request(testServer).put('/api/appointments/status').set('Authorization', adminAuth()).send({ appointmentId: apt.id, status: 'confirmed' });
  assert.equal(changed.body.appointment.userId.password, undefined);
  assert.equal(changed.body.appointment.userId.resetToken, undefined);
});

test('guest and unrelated user appointments cannot be cancelled or rated', async () => {
  const p = await property();
  for (const guest of [true, false]) {
    const apt = await Appointment.create({ propertyId: p.id, ...(guest ? { guestInfo: { email: 'guest@phase1.test' } } : { userId: owner.id }), date: futureDay, time: '10:00' });
    assert.equal((await request(testServer).put(`/api/appointments/cancel/${apt.id}`).set('Authorization', auth(other)).send({})).status, 403);
    assert.equal((await request(testServer).put(`/api/appointments/feedback/${apt.id}`).set('Authorization', auth(other)).send({ rating: 5 })).status, 403);
    assert.equal((await Appointment.findById(apt.id)).status, 'pending');
  }
});

test('authenticated booking is visible to its owner and cancellable only by that owner', async () => {
  const p = await property();
  const res = await request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(owner)).send({ propertyId: p.id, date: futureDay, time: '10:00' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const list = await request(testServer).get('/api/appointments/user').set('Authorization', auth(owner));
  assert.equal(list.body.appointments[0]._id, res.body.appointment._id);
  assert.equal((await request(testServer).put(`/api/appointments/cancel/${res.body.appointment._id}`).set('Authorization', auth(owner)).send({})).status, 200);
});

test('multipart admin text-only edit retains images, explicit removal/replacement respects selection', async () => {
  const p = await property({ image: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] });
  const text = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('title', 'Edited title');
  assert.equal(text.status, 200); assert.deepEqual(text.body.property.image, p.image);
  const change = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id)
    .field('retainedImages', JSON.stringify([p.image[1]])).attach('image1', png, 'test.png');
  assert.equal(change.status, 200); assert.deepEqual(change.body.property.image, [p.image[1], 'https://example.com/image-1.png']);
  const empty = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('retainedImages', '[]');
  assert.equal(empty.status, 400);
  assert.equal((await Property.findById(p.id)).image.length, 2);
});

test('bad listing metadata or spoofed image bytes never upload to CDN', async () => {
  const p = await property();
  const invalid = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('price', '-1').attach('image1', png, 'test.png');
  assert.equal(invalid.status, 400); assert.equal(uploads.length, 0);
  const spoof = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).attach('image1', Buffer.from('not-png'), 'fake.png');
  assert.equal(spoof.status, 400); assert.equal(uploads.length, 0);
});

test('partial CDN failure and persistence failure compensate successful uploads', async () => {
  const p = await property();
  imagekit.upload = async options => {
    uploads.push(options);
    if (options.fileName === 'fail.png') throw new Error('Test upload failure');
    return { url: 'https://example.com/new.png', fileId: 'rollback-asset' };
  };
  const res = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).attach('image1', png, 'ok.png').attach('image2', png, 'fail.png');
  assert.equal(res.status, 500); assert.deepEqual(removed, ['rollback-asset']);
  assert.deepEqual((await Property.findById(p.id)).image, p.image);
  removed = [];
  const originalSave = Property.prototype.save;
  Property.prototype.save = async () => { throw new Error('Test persistence failure'); };
  try { await assert.rejects(saveListing({ body: {}, existing: p, files: [{ buffer: png, mimetype: 'image/png', originalname: 'ok.png' }] })); }
  finally { Property.prototype.save = originalSave; }
  assert.deepEqual(removed, ['rollback-asset']);
});

test('owner-only detail/edit loads rejected listings; strangers cannot upload or edit them', async () => {
  const p = await property({ status: 'rejected', postedBy: owner.id });
  assert.equal((await request(testServer).get(`/api/products/single/${p.id}`)).status, 404);
  assert.equal((await request(testServer).get(`/api/user/properties/${p.id}`).set('Authorization', auth(owner))).status, 200);
  assert.equal((await request(testServer).get(`/api/user/properties/${p.id}`).set('Authorization', auth(other))).status, 404);
  const denied = await request(testServer).put(`/api/user/properties/${p.id}`).set('Authorization', auth(other)).attach('images', png, 'test.png');
  assert.equal(denied.status, 404); assert.equal(uploads.length, 0);
  const edited = await request(testServer).put(`/api/user/properties/${p.id}`).set('Authorization', auth(owner)).field('title', 'Corrected listing');
  assert.equal(edited.status, 200); assert.equal(edited.body.property.status, 'pending');
  assert.deepEqual(edited.body.property.image, p.image);
});

test('public, admin, pending and owner pages reach records beyond original defaults', async () => {
  await Property.insertMany(Array.from({ length: 27 }, (_, n) => ({ ...fields, title: `Active ${n}`, image: ['https://example.com/a.jpg'], postedBy: owner.id })));
  await Property.insertMany(Array.from({ length: 18 }, (_, n) => ({ ...fields, title: `Pending ${n}`, status: 'pending', image: ['https://example.com/b.jpg'], postedBy: owner.id })));
  for (const [url, header, total, limit, key] of [
    ['/api/products/list', null, 27, 20, 'property'],
    ['/api/admin/properties', adminAuth(), 45, 20, 'property'],
    ['/api/admin/properties/pending', adminAuth(), 18, 15, 'properties'],
    ['/api/user/properties', auth(owner), 45, 10, 'properties'],
  ]) {
    const seen = new Set();
    for (let page = 1; page <= Math.ceil(total / limit); page++) {
      let req = request(testServer).get(`${url}?page=${page}`);
      if (header) req = req.set('Authorization', header);
      const res = await req;
      assert.equal(res.status, 200); assert.equal(res.body.pagination.totalProperties, total);
      res.body[key].forEach(p => seen.add(p._id));
    }
    assert.equal(seen.size, total, url);
  }
  const filtered = await request(testServer).get('/api/products/list?availability=buy&type=Apartment&search=Active&sort=price-low');
  assert.equal(filtered.body.pagination.totalProperties, 27);
  const summary = await request(testServer).get('/api/user/properties?limit=1').set('Authorization', auth(owner));
  assert.equal(summary.body.statusCounts.active, 27); assert.equal(summary.body.statusCounts.pending, 18);
});

test('pagination caps invalid/unbounded sizes and public queries exclude expired-by-time listings', async () => {
  assert.throws(() => pagination({ limit: -1, page: 'bad' }));
  assert.throws(() => pagination({ limit: 999999 }));
  const p = await property({ expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request(testServer).get(`/api/products/single/${p.id}`)).status, 404);
  assert.equal((await request(testServer).get('/api/products/list')).body.property.length, 0);
  assert.equal((await request(testServer).get(`/api/admin/properties/${p.id}`).set('Authorization', adminAuth())).status, 200);
});

async function aiFixture(slug = 'fixture-model', overrides = {}) {
  const model = new AIModel({ name: slug, slug, modelId: 'demo/text-model', profile: 'text-basic', provider: 'nvidia', ...overrides });
  model.lastTest = { passed: true, mode: 'application', configuration: modelFingerprint(model.toObject()), testedAt: new Date() };
  await model.save(); return model;
}
const appJSON = JSON.stringify({ overview: [{ name: 'Demo Home', price: 'INR 5000000', area: '1000 sqft', location: 'Pune', match_score: 50 }], best_value: { name: 'Demo Home', reason: 'Demo comparison only' }, recommendations: ['Verify source details'] });
const modelWrite = (row, values) => request(testServer).put(`/api/admin/ai-models/${row.id || row._id}`).set('Authorization', adminAuth()).send({ expectedVersion: row.version ?? row.__v ?? 0, ...values });

test('AI create rejects GitHub, saves NVIDIA disabled and public reads never reseed', async () => {
  assert.equal((await request(testServer).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'Legacy', slug: 'legacy', modelId: 'openai/gpt-4.1', provider: 'github' })).status, 400);
  const created = await request(testServer).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'NVIDIA test', slug: 'nvidia-test', modelId: 'demo/text-model', provider: 'nvidia' });
  assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.model.isActive, false);
  assert.deepEqual(await resolveModelsByProvider(), { nvidia: [] });
  assert.equal((await request(testServer).delete(`/api/admin/ai-models/${created.body.model._id}`).set('Authorization', adminAuth()).send({ expectedVersion: 0 })).status, 200);
  assert.equal((await request(testServer).get('/api/ai/models')).body.models.length, 0);
  assert.equal(await AIModel.countDocuments(), 0);
});

test('recovered LLM circuits retry once and prevent parallel recovery probes', async () => {
  const circuit = createCircuitBreaker({ failureThreshold: 1, timeout: 1 });
  await assert.rejects(circuit.execute(async () => { throw new Error('temporary outage'); }));
  circuit.nextAttempt = Date.now() - 1;
  let release;
  const probe = circuit.execute(() => new Promise(resolve => { release = resolve; }));
  await assert.rejects(circuit.execute(async () => 'parallel'), /already running/);
  release('recovered'); assert.equal(await probe, 'recovered'); assert.equal(circuit.isHealthy(), true);
  const provider = new NvidiaNimProvider('fake-key', [{ slug: 'phase1-recovery', modelId: 'demo/recovery', config: { maxTokens: 256, timeoutMs: 1000 } }]);
  const providerCircuit = provider.circuits[0]; providerCircuit.failureThreshold = 1;
  await assert.rejects(providerCircuit.execute(async () => { throw new Error('temporary outage'); }));
  providerCircuit.nextAttempt = Date.now() - 1;
  provider._call = async () => 'recovered response';
  assert.equal(await new LLMRouter([provider]).generateText('test', 'test'), 'recovered response');
});

test('NVIDIA factory never restores hardcoded models when catalog is empty', async () => {
  const model = [{ slug: 'phase1-priority', modelId: 'demo/priority', config: { maxTokens: 256, timeoutMs: 1000 } }];
  const ai = createAIService('fake-nvidia', model);
  assert.deepEqual(ai.router.providers.map(provider => provider.name), ['NvidiaNim']);
  assert.throws(() => createAIService('fake-nvidia', []), /No enabled/);
  assert.throws(() => new NvidiaNimProvider('fake-nvidia'), /No enabled/);
});

test('telemetry URL redaction removes raw verification/reset tokens and queries', () => {
  assert.equal(redactUrl('/api/users/verify/secret-token?email=private'), '/api/users/verify/[REDACTED]');
  assert.equal(redactUrl('/api/users/reset/secret-reset'), '/api/users/reset/[REDACTED]');
});

test('HTTP search honors default/selected NVIDIA models and rejects disabled slugs', async () => {
  const prototype = Object.getPrototypeOf(createFirecrawlService('test-only-firecrawl'));
  const originalSearch = prototype.findProperties, originalCall = NvidiaNimProvider.prototype._call;
  const calls = [];
  prototype.findProperties = async () => ({ properties: [{ building_name: 'Demo Home', price: 'INR 5000000', location_address: 'Pune' }] });
  NvidiaNimProvider.prototype._call = async modelId => { calls.push(modelId); return appJSON; };
  try {
    await aiFixture('http-default', { isActive: true, isDefault: true, modelId: 'demo/default' });
    const second = await aiFixture('http-selected', { isActive: true, modelId: 'demo/selected' });
    const search = model => request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'SelectionTest', ...(model && { model }), price: { max: 5000000 } });
    const first = await search(); assert.equal(first.status, 200); assert.equal(first.body.analysisMeta.actualModel.modelId, 'demo/default');
    assert.equal((await search('http-selected')).status, 200); assert.deepEqual(calls, ['demo/default', 'demo/selected']);
    assert.equal((await modelWrite(second, { isActive: false })).status, 200);
    assert.equal((await search('http-selected')).status, 400); assert.equal(calls.length, 2);
  } finally { prototype.findProperties = originalSearch; NvidiaNimProvider.prototype._call = originalCall; }
});

test('removed assets are deleted after commit, while retained assets remain', async () => {
  const p = await property({ image: ['https://example.com/a.jpg', 'https://example.com/b.jpg'], imageAssets: [
    { url: 'https://example.com/a.jpg', fileId: 'asset-a' }, { url: 'https://example.com/b.jpg', fileId: 'asset-b' },
  ] });
  const res = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id)
    .field('retainedImages', JSON.stringify([p.image[1]]));
  assert.equal(res.status, 200); assert.deepEqual(removed, ['asset-a']);
  assert.deepEqual((await Property.findById(p.id)).image, ['https://example.com/b.jpg']);
});

// Phase 2: exercise real HTTP contracts and transactions, including race outcomes.
test('simultaneous reservations allow one winner; cancellation releases exactly that slot', async () => {
  const p = await property();
  const payload = { propertyId: p.id, date: futureDay, time: '10:00' };
  const results = await Promise.all(Array.from({ length: 5 }, () => request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(owner)).send(payload)));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409, 409, 409]);
  const winner = results.find(r => r.status === 201).body.appointment;
  assert.equal(winner.startsAt, `${futureDay}T04:30:00.000Z`);
  assert.equal(winner.timeZone, 'Asia/Kolkata');
  assert.equal(winner.contactSnapshot.email, owner.email);
  assert.equal(await Appointment.countDocuments({ activeReservation: true }), 1);
  assert.equal((await request(testServer).put(`/api/appointments/cancel/${winner._id}`).set('Authorization', auth(owner)).send({ expectedVersion: winner.version })).status, 200);
  assert.equal((await request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(other)).send(payload)).status, 201);
});

test('invalid booking dates, unknown fields and unavailable listings fail before reservation', async () => {
  const p = await property();
  const send = body => request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(owner)).send({ propertyId: p.id, date: futureDay, time: '10:00', ...body });
  for (const body of [{ date: 'bad' }, { date: '2026-02-30' }, { date: '2000-01-01' }, { time: '10:00 AM' }, { propertyId: 'bad' }, { notes: {} }, { phone: 'abc' }, { injected: true }]) assert.equal((await send(body)).status, 400);
  for (const overrides of [{ status: 'pending' }, { status: 'archived' }, { status: 'active', expiresAt: new Date(Date.now() - 1) }, { status: 'active', expiresAt: null, marketStatus: 'sold' }, { marketStatus: 'rented' }]) {
    await Property.updateOne({ _id: p._id }, overrides);
    assert.equal((await send({})).status, 404);
  }
  assert.equal(await Appointment.countDocuments(), 0);
});

test('booking transitions are explicit, versioned, and feedback cannot complete a pending visit', async () => {
  const p = await property();
  const created = await request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(owner)).send({ propertyId: p.id, date: futureDay, time: '11:00' });
  const apt = created.body.appointment;
  const status = (value, version = 0) => request(testServer).put('/api/appointments/status').set('Authorization', adminAuth()).send({ appointmentId: apt._id, status: value, expectedVersion: version });
  assert.equal((await status('completed')).status, 409);
  assert.equal((await request(testServer).put(`/api/appointments/feedback/${apt._id}`).set('Authorization', auth(owner)).send({ rating: 5 })).status, 409);
  assert.equal((await status('confirmed')).status, 200);
  assert.equal((await status('cancelled')).status, 409); // stale version
  assert.equal((await status('completed', 1)).status, 409); // not yet ended
  await Appointment.updateOne({ _id: apt._id }, { endsAt: new Date(Date.now() - 1000) });
  assert.equal((await status('completed', 1)).status, 200);
  assert.equal((await status('pending', 2)).status, 409);
  const feedback = () => request(testServer).put(`/api/appointments/feedback/${apt._id}`).set('Authorization', auth(owner)).send({ rating: 5, comment: 'Helpful visit' });
  assert.deepEqual((await Promise.all([feedback(), feedback()])).map(r => r.status).sort(), [200, 409]);
  assert.equal(await AuditLog.countDocuments({ action: 'appointment_feedback', targetId: apt._id }), 1);
});

test('competing listing reviews have one versioned winner and one audit event', async () => {
  const p = await property({ status: 'pending', postedBy: owner._id });
  const results = await Promise.all([
    request(testServer).put(`/api/admin/properties/${p.id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: 0 }),
    request(testServer).put(`/api/admin/properties/${p.id}/reject`).set('Authorization', adminAuth()).send({ expectedVersion: 0, reason: 'Missing photos' }),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(await AuditLog.countDocuments({ targetId: p._id, action: { $in: ['approve_property', 'reject_property'] } }), 1);
  assert.equal((await request(testServer).put(`/api/admin/properties/${p.id}/approve`).set('Authorization', adminAuth()).send({})).status, 400);
});

test('audit storage failure rolls back listing publication', async () => {
  const p = await property({ status: 'pending', postedBy: owner._id });
  const original = AuditLog.create;
  AuditLog.create = async () => { throw new Error('Test audit outage'); };
  try {
    const res = await request(testServer).put(`/api/admin/properties/${p.id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: 0 });
    assert.equal(res.status, 500);
  } finally { AuditLog.create = original; }
  assert.equal((await Property.findById(p.id)).status, 'pending');
});

test('bulk review is all-or-nothing when any version is stale', async () => {
  const a = await property({ status: 'pending', postedBy: owner._id });
  const b = await property({ status: 'pending', postedBy: owner._id });
  const res = await request(testServer).post('/api/admin/properties/bulk-approve').set('Authorization', adminAuth()).send({ propertyIds: [a.id, b.id], expectedVersions: { [a.id]: 0, [b.id]: 99 } });
  assert.equal(res.status, 409);
  assert.equal(await Property.countDocuments({ status: 'pending' }), 2);
  assert.equal(await AuditLog.countDocuments({ action: 'approve_property' }), 0);
});

test('listing archival retains media and booking snapshots and cancels open reservations', async () => {
  const p = await property({ postedBy: owner._id });
  const booked = await request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(other)).send({ propertyId: p.id, date: futureDay, time: '09:00' });
  assert.equal(booked.status, 201);
  const res = await request(testServer).delete(`/api/user/properties/${p.id}`).set('Authorization', auth(owner));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await Property.findById(p.id)).status, 'archived');
  assert.equal((await request(testServer).get(`/api/products/single/${p.id}`)).status, 404);
  const apt = await Appointment.findById(booked.body.appointment._id);
  assert.equal(apt.status, 'cancelled'); assert.equal(apt.activeReservation, false);
  assert.equal(apt.propertySnapshot.title, p.title); assert.equal(apt.contactSnapshot.email, other.email);
  assert.deepEqual(removed, []);
});

test('account archival retains identity and references while revoking access', async () => {
  const p = await property({ postedBy: owner._id });
  const booked = await request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(other)).send({ propertyId: p.id, date: futureDay, time: '09:00' });
  const res = await request(testServer).delete(`/api/admin/users/${owner.id}`).set('Authorization', adminAuth());
  assert.equal(res.status, 200);
  assert.equal((await User.findById(owner.id)).status, 'deleted');
  assert.equal((await Property.findById(p.id)).status, 'archived');
  assert.equal((await Appointment.findById(booked.body.appointment._id)).status, 'cancelled');
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', auth(owner))).status, 403);
});

test('device sessions are independent; logout revokes only the matching device', async () => {
  const first = await session(); const second = await session();
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', first.token)).status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', second.token)).status, 200);
  assert.equal((await request(testServer).post('/api/users/logout').set('Cookie', first.cookie)).status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', first.token)).status, 401);
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', second.cookie)).status, 200);
});

test('refresh credential replay revokes its family including the freshly rotated access token', async () => {
  const old = await session();
  const rotated = await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie);
  assert.equal(rotated.status, 200);
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', `Bearer ${rotated.body.token}`)).status, 401);
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', cookieFrom(rotated))).status, 401);
  assert.equal(await AuditLog.countDocuments({ action: 'session_replay' }), 1);
});

test('session inventory and revocation cannot access another account', async () => {
  const old = await session();
  const decoded = jwt.decode(old.token.split(' ')[1]);
  const list = await request(testServer).get('/api/users/sessions').set('Authorization', old.token);
  assert.ok(list.body.sessions.some(s => s.id === decoded.sid && s.current));
  assert.equal(JSON.stringify(list.body).includes('digest'), false);
  assert.equal((await request(testServer).delete(`/api/users/sessions/${decoded.sid}`).set('Authorization', auth(other))).status, 404);
  assert.equal((await request(testServer).delete(`/api/users/sessions/${decoded.sid}`).set('Authorization', old.token)).status, 200);
  assert.equal((await request(testServer).get('/api/users/me').set('Authorization', old.token)).status, 401);
});

test('malformed IDs, paging, filter operators and sort keys return 400', async () => {
  for (const url of ['/api/products/list?page=abc', '/api/products/list?limit=101', '/api/products/list?sort=password', '/api/products/list?type=Castle', '/api/products/list?location[$ne]=x', '/api/products/single/not-an-id']) assert.equal((await request(testServer).get(url)).status, 400, url);
  assert.equal((await request(testServer).get('/api/admin/users/not-an-id').set('Authorization', adminAuth())).status, 400);
  assert.equal((await request(testServer).get('/api/appointments/user?limit=0').set('Authorization', auth(owner))).status, 400);
  assert.equal((await request(testServer).post('/api/users/login').send({ email: { $ne: '' }, password })).status, 400);
  const p = await property({ type: 'Apartment', availability: 'buy' });
  const detail = await request(testServer).get(`/api/products/single/${p.id}`);
  assert.equal(detail.body.property.type, 'Flat'); assert.equal(detail.body.property.purpose, 'sale');
  assert.equal(detail.body.property.version, 0);
  assert.equal((await request(testServer).get('/api/products/list?availability=buy')).status, 200);
});

test('CSV exports are independent and neutralize spreadsheet formulas', async () => {
  await AuditLog.create({ adminEmail: '=DANGEROUS()', action: 'test_event', targetType: 'user', targetName: '+SUM(1,2)', metadata: { reason: '"quoted"\nline' } });
  const responses = await Promise.all([1, 2].map(() => request(testServer).get('/api/admin/activity-logs/export?action=test_event').set('Authorization', adminAuth())));
  assert.equal(responses[0].status, 200); assert.equal(responses[0].text, responses[1].text);
  assert.ok(responses[0].text.includes("'=DANGEROUS()")); assert.ok(responses[0].text.includes("'+SUM(1,2)"));
  assert.ok(responses[0].text.includes('""quoted""'));
  assert.equal((await request(testServer).get('/api/admin/activity-logs?startDate=2026-02-30').set('Authorization', adminAuth())).status, 400);
});

test('expired suspension restoration unhides listings once and audits the transition', async () => {
  const { restoreExpiredSuspension } = await import('../services/domain/maintenance.js');
  const p = await property({ postedBy: owner._id, hiddenByModeration: true });
  await User.updateOne({ _id: owner._id }, { status: 'suspended', suspendedUntil: new Date(Date.now() - 1000) });
  await Promise.all([restoreExpiredSuspension(owner._id), restoreExpiredSuspension(owner._id)]);
  assert.equal((await Property.findById(p.id)).hiddenByModeration, false);
  assert.equal(await AuditLog.countDocuments({ action: 'auto_unsuspend_user' }), 1);
});

test('legacy migration preflight detects collisions without writes and backfills canonical booking data', async () => {
  const { migratePhase2 } = await import('../scripts/phase2-migration.js');
  await AIModel.deleteMany({});
  const p = await property();
  const apt = await Appointment.create({ propertyId: p._id, userId: owner._id, date: futureDay, time: '10:00 AM' });
  const copy = await Appointment.create({ propertyId: p._id, userId: owner._id, date: futureDay, time: '10:00' });
  const blocked = await migratePhase2({ apply: true });
  assert.ok(blocked.blockers.some(b => b.message.includes('Duplicate active slot')));
  assert.equal(blocked.applied, 0); assert.equal((await Appointment.findById(apt.id)).startsAt, undefined);
  await Appointment.deleteOne({ _id: copy._id });
  const dry = await migratePhase2(); assert.equal(dry.blockers.length, 0); assert.equal(dry.applied, 0);
  const applied = await migratePhase2({ apply: true }); assert.equal(applied.blockers.length, 0); assert.ok(applied.applied > 0);
  const migrated = await Appointment.findById(apt.id);
  assert.equal(migrated.time, '10:00'); assert.equal(migrated.startsAt.toISOString(), `${futureDay}T04:30:00.000Z`);
  assert.equal(migrated.contactSnapshot.email, owner.email);
});

test('expiry is consistent in owner DTOs, status totals and admin filters before maintenance runs', async () => {
  const p = await property({ postedBy: owner._id, expiresAt: new Date(Date.now() - 1000) });
  const own = await request(testServer).get('/api/user/properties').set('Authorization', auth(owner));
  assert.equal(own.body.properties[0].status, 'expired'); assert.equal(own.body.statusCounts.expired, 1);
  const active = await request(testServer).get('/api/admin/properties?status=active').set('Authorization', adminAuth());
  assert.equal(active.body.pagination.total, 0);
  const expired = await request(testServer).get('/api/admin/properties?status=expired').set('Authorization', adminAuth());
  assert.equal(expired.body.property[0]._id, p.id);
});

test('contact, newsletter and AI boundaries reject malformed values before downstream services', async () => {
  assert.equal((await request(testServer).post('/api/forms/submit').send({ name: {}, email: 'a@b.test', message: 'hello' })).status, 400);
  assert.equal((await request(testServer).post('/api/news/newsdata').send({ email: ['a@b.test'] })).status, 400);
  assert.equal((await request(testServer).post('/api/ai/search').send({ city: {}, price: { max: 1000 } })).status, 400);
  assert.equal((await request(testServer).post('/api/ai/search').send({ city: 'Pune', price: { min: 100, max: 1 } })).status, 400);
  assert.equal((await request(testServer).get('/api/ai/localities?city[$ne]=x')).status, 400);
  assert.equal((await request(testServer).post('/api/users/reset/invalid-token').send({ password: 'valid-password' })).status, 400);
});

test('cache freshness is enforced on reads even before MongoDB TTL cleanup', async () => {
  const { default: SearchCache } = await import('../models/searchCacheModel.js');
  const { getCached } = await import('../controller/propertyController.js');
  const ttl = Number(SearchCache.schema.path('createdAt').options.expires) * 1000;
  await SearchCache.create({ cacheKey: 'search:expired-test', createdAt: new Date(Date.now() - ttl - 1000), data: { stale: true } });
  assert.equal(await getCached('search:expired-test'), null);
  await SearchCache.create({ cacheKey: 'search:fresh-test', data: { fresh: true } });
  assert.deepEqual(await getCached('search:fresh-test'), { fresh: true });
});

test('expiry maintenance cancels reservations once and records the system transition', async () => {
  const { reconcileExpiredListings } = await import('../services/domain/maintenance.js');
  const p = await property();
  const booked = await request(testServer).post('/api/appointments/schedule/auth').set('Authorization', auth(owner)).send({ propertyId: p.id, date: futureDay, time: '14:00' });
  await Property.updateOne({ _id: p._id }, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal(await reconcileExpiredListings(), 1); assert.equal(await reconcileExpiredListings(), 0);
  assert.equal((await Appointment.findById(booked.body.appointment._id)).status, 'cancelled');
  assert.equal(await AuditLog.countDocuments({ action: 'expire_property', targetId: p._id }), 1);
});

test('expired suspension permits public listing reads before a worker or owner login runs', async () => {
  const p = await property({ postedBy: owner._id, hiddenByModeration: true, moderationUntil: new Date(Date.now() - 1000) });
  await User.updateOne({ _id: owner._id }, { status: 'suspended', suspendedUntil: new Date(Date.now() - 1000) });
  assert.equal((await request(testServer).get(`/api/products/single/${p.id}`)).status, 200);
  await Property.updateOne({ _id: p._id }, { moderationUntil: null });
  assert.equal((await request(testServer).get(`/api/products/single/${p.id}`)).status, 404);
});

test('empty amenities persist and admin mutation responses use the shared DTO', async () => {
  const p = await property({ amenities: ['Gym'] });
  const res = await request(testServer).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('expectedVersion', '0').field('amenities', '[]');
  assert.equal(res.status, 200); assert.deepEqual(res.body.property.amenities, []);
  assert.equal(res.body.property.version, 1); assert.equal(res.body.property.__v, undefined);
  const event = await AuditLog.findOne({ action: 'update_property', targetId: p._id });
  assert.ok(event.sessionId); assert.equal(event.metadata.entityVersion, 1);
});

test('demo repair requires explicit opt-in and retains orphan history without changing user accounts', async () => {
  const { repairDemoData } = await import('../scripts/phase2-demo-repair.js');
  const { migratePhase2, legacyBookingInstant, canonicalTime } = await import('../scripts/phase2-migration.js');
  await assert.rejects(repairDemoData(), /confirmation/);
  const usersBefore = await User.collection.find({}).sort({ _id: 1 }).toArray();
  const bad = await property({ beds: 111111, baths: 1111111 });
  const orphan = await Appointment.create({ propertyId: new mongoose.Types.ObjectId(), userId: owner._id, date: futureDay, time: '11:30', status: 'confirmed' });
  const preview = await repairDemoData({ demoDataConfirmed: true });
  assert.equal(preview.archivedProperties, 1); assert.equal(preview.repairedAppointments, 1); assert.equal(preview.applied, 0);
  assert.equal((await Appointment.findById(orphan.id)).status, 'confirmed');
  await repairDemoData({ demoDataConfirmed: true, apply: true });
  assert.equal((await Property.findById(bad.id)).status, 'archived');
  const retained = await Appointment.findById(orphan.id);
  assert.equal(retained.status, 'cancelled'); assert.equal(retained.propertySnapshot.unavailable, true);
  assert.equal(String(retained.propertyId), String(orphan.propertyId));
  assert.deepEqual(await User.collection.find({}).sort({ _id: 1 }).toArray(), usersBefore);
  const missingUserBooking = await Appointment.create({ propertyId: bad._id, userId: new mongoose.Types.ObjectId(), date: futureDay, time: '12:30', status: 'pending' });
  await repairDemoData({ demoDataConfirmed: true, apply: true });
  const missingContact = await Appointment.findById(missingUserBooking.id);
  assert.equal(missingContact.status, 'cancelled'); assert.equal(missingContact.contactSnapshot.unavailable, true);
  const report = await migratePhase2(); assert.equal(report.blockers.length, 0);
  assert.equal(legacyBookingInstant(futureDay, '11:30').toISOString(), `${futureDay}T06:00:00.000Z`);
  assert.throws(() => canonicalTime('24:00')); assert.throws(() => canonicalTime('11:70 AM'));
  assert.equal((await repairDemoData({ demoDataConfirmed: true, apply: true })).applied, 0);
});

test('newsletter requires recipient confirmation, rejects token substitution and revokes confirmations on suppression', async () => {
  const { default: News } = await import('../models/newsModel.js');
  const { newsletterToken } = await import('../utils/newsletterTokens.js');
  await News.deleteMany({});
  const signup = await request(testServer).post('/api/news/newsdata').send({ email: 'Consent@Example.com' });
  assert.equal(signup.status, 200);
  const row = await News.findOne({ email: 'consent@example.com' });
  assert.equal(row.status, 'pending');
  const confirmation = newsletterToken(row, 'confirm');
  const optout = newsletterToken(row, 'unsubscribe');
  assert.equal((await request(testServer).post('/api/news/unsubscribe').send({ email: row.email })).status, 400);
  assert.equal((await request(testServer).post('/api/news/confirm').send({ token: optout })).status, 400);
  assert.equal((await request(testServer).post('/api/news/confirm').send({ token: confirmation })).status, 200);
  assert.equal((await News.findById(row.id)).status, 'confirmed');
  assert.equal((await request(testServer).post('/api/news/unsubscribe').send({ token: optout })).status, 200);
  assert.equal((await request(testServer).post('/api/news/unsubscribe').send({ token: optout })).status, 200);
  assert.equal((await request(testServer).post('/api/news/confirm').send({ token: confirmation })).status, 404);
  const suppressed = await News.findById(row.id);
  assert.equal(suppressed.status, 'unsubscribed'); assert.equal(suppressed.consentVersion, 1);
  assert.equal((await request(testServer).post('/api/news/confirm').send({ token: newsletterToken(suppressed, 'confirm') })).status, 200);
});

test('newsletter dispatch failure is retryable and never grants marketing consent', async () => {
  const { default: News } = await import('../models/newsModel.js');
  const original = email.sendEmail;
  email.sendEmail = async () => { throw new Error('SMTP unavailable'); };
  try {
    const failed = await request(testServer).post('/api/news/newsdata').send({ email: 'retry@example.com' });
    assert.equal(failed.status, 503);
    assert.equal((await News.findOne({ email: 'retry@example.com' })).status, 'pending');
  } finally { email.sendEmail = original; }
  assert.equal((await request(testServer).post('/api/news/newsdata').send({ email: 'retry@example.com' })).status, 200);
});

test('contact inbox enforces admin access, pagination, versioned edits and audit rollback', async () => {
  const { default: Form } = await import('../models/formModel.js');
  await Form.deleteMany({});
  assert.equal((await request(testServer).post('/api/forms/submit').send({ name: 'Contact', email: 'contact@example.com', message: 'Please call me' })).status, 200);
  assert.equal((await request(testServer).get('/api/admin/leads').set('Authorization', auth(owner))).status, 403);
  let page = await request(testServer).get('/api/admin/leads?limit=1').set('Authorization', adminAuth());
  assert.equal(page.status, 200); assert.equal(page.body.pagination.total, 1);
  const row = page.body.leads[0];
  const update = { status: 'in_progress', adminNote: 'Called customer', expectedVersion: row.version };
  const saved = await request(testServer).put(`/api/admin/leads/${row._id}`).set('Authorization', adminAuth()).send(update);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal((await request(testServer).put(`/api/admin/leads/${row._id}`).set('Authorization', adminAuth()).send(update)).status, 409);
  assert.equal(await AuditLog.countDocuments({ action: 'update_lead' }), 1);
  const create = AuditLog.create;
  AuditLog.create = async () => { throw new Error('audit unavailable'); };
  try {
    assert.equal((await request(testServer).put(`/api/admin/leads/${row._id}`).set('Authorization', adminAuth()).send({ ...update, status: 'resolved', expectedVersion: 1 })).status, 500);
    assert.equal((await Form.findById(row._id)).status, 'in_progress');
  } finally { AuditLog.create = create; }
});

test('subscriber admin management never reveals tokens or grants consent and audits suppression', async () => {
  const { default: News } = await import('../models/newsModel.js');
  await News.deleteMany({});
  await News.collection.insertOne({ email: 'legacy@example.com' });
  const page = await request(testServer).get('/api/admin/subscribers?status=pending').set('Authorization', adminAuth());
  assert.equal(page.status, 200); assert.equal(page.body.pagination.total, 1); assert.equal(page.body.subscribers[0].status, 'pending');
  const row = page.body.subscribers[0];
  assert.equal((await request(testServer).put(`/api/admin/subscribers/${row._id}/suppress`).set('Authorization', adminAuth()).send({ status: 'confirmed' })).status, 400);
  assert.equal((await request(testServer).put(`/api/admin/subscribers/${row._id}/suppress`).set('Authorization', adminAuth()).send({})).status, 200);
  assert.equal(await AuditLog.countDocuments({ action: 'suppress_subscriber' }), 1);
});

test('full API journey: registration, verification, publication, owner revision, guest and account bookings', async () => {
  let verifyUrl;
  const original = email.sendEmailVerification;
  email.sendEmailVerification = async (address, name, url) => { verifyUrl = url; };
  const registeredEmail = 'journey@phase3.test';
  try {
    const registered = await request(testServer).post('/api/users/register').send({ name: 'Journey Owner', email: registeredEmail, password });
    assert.equal(registered.status, 200, JSON.stringify(registered.body)); assert.equal(registered.body.requiresVerification, true);
  } finally { email.sendEmailVerification = original; }
  assert.ok(verifyUrl);
  const verified = await request(testServer).get(`/api/users/verify/${verifyUrl.split('/').pop()}`);
  assert.equal(verified.status, 200, JSON.stringify(verified.body)); assert.ok(verified.body.token);
  const loggedIn = await request(testServer).post('/api/users/login').send({ email: registeredEmail, password });
  assert.equal(loggedIn.status, 200);
  const header = `Bearer ${loggedIn.body.token}`;
  let submission = request(testServer).post('/api/user/properties').set('Authorization', header);
  for (const [key, value] of Object.entries(fields)) submission = submission.field(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  const submitted = await submission.attach('images', png, 'home.png');
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
  const listing = submitted.body.property;
  const approved = await request(testServer).put(`/api/admin/properties/${listing._id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: listing.version });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal((await request(testServer).get(`/api/products/single/${listing._id}`)).status, 200);
  const revised = await request(testServer).put(`/api/user/properties/${listing._id}`).set('Authorization', header).field('title', 'Updated journey home').field('expectedVersion', String(approved.body.property.version));
  assert.equal(revised.status, 200, JSON.stringify(revised.body)); assert.equal(revised.body.property.status, 'pending');
  assert.equal((await request(testServer).get(`/api/products/single/${listing._id}`)).status, 404);
  assert.equal((await request(testServer).put(`/api/admin/properties/${listing._id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: revised.body.property.version })).status, 200);
  const notifications = [];
  const notify = email.sendAppointmentStatusUpdate;
  email.sendAppointmentStatusUpdate = async (address, appointment, status) => { notifications.push(status); };
  try {
    for (const [guest, time] of [[false, '10:00'], [true, '11:00']]) {
      let booking = request(testServer).post(`/api/appointments/schedule${guest ? '' : '/auth'}`);
      if (!guest) booking = booking.set('Authorization', auth(other));
      const booked = await booking.send({ propertyId: listing._id, date: futureDay, time, ...(guest ? { name: 'Guest', email: 'guest@example.com', phone: '+919999999999' } : {}) });
      assert.equal(booked.status, 201, JSON.stringify(booked.body));
      const confirmed = await request(testServer).put('/api/admin/appointments/status').set('Authorization', adminAuth()).send({ appointmentId: booked.body.appointment._id, status: 'confirmed', expectedVersion: booked.body.appointment.version });
      assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
      const cancelled = guest
        ? await request(testServer).put('/api/admin/appointments/status').set('Authorization', adminAuth()).send({ appointmentId: booked.body.appointment._id, status: 'cancelled', expectedVersion: confirmed.body.appointment.version })
        : await request(testServer).put(`/api/appointments/cancel/${booked.body.appointment._id}`).set('Authorization', auth(other)).send({ expectedVersion: confirmed.body.appointment.version });
      assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    }
    assert.deepEqual(notifications, ['confirmed', 'cancelled', 'confirmed', 'cancelled']);
  } finally { email.sendAppointmentStatusUpdate = notify; }
});

test('phase 3 migration preserves suppression, treats legacy addresses as pending and blocks normalized duplicates', async () => {
  const { default: News } = await import('../models/newsModel.js');
  const { migratePhase3 } = await import('../scripts/phase3-migration.js');
  await News.deleteMany({});
  await News.collection.insertMany([{ email: ' Legacy@Phase3.test ' }, { email: 'legacy@phase3.test', status: 'unsubscribed', consentVersion: 2 }]);
  const blocked = await migratePhase3();
  assert.equal(blocked.blockers.length, 1); assert.equal(blocked.applied, 0);
  assert.equal((await News.collection.findOne({ email: ' Legacy@Phase3.test ' })).status, undefined);
  await News.collection.deleteOne({ email: ' Legacy@Phase3.test ' });
  await News.collection.insertOne({ email: 'other@phase3.test' });
  const report = await migratePhase3({ apply: true });
  assert.deepEqual(report.blockers, []);
  assert.equal((await News.findOne({ email: 'legacy@phase3.test' })).status, 'unsubscribed');
  assert.equal((await News.findOne({ email: 'other@phase3.test' })).status, 'pending');
  assert.equal((await migratePhase3({ apply: true })).applied, 0);
});

test('admin session identity is server-validated and never exposes password/session internals', async () => {
  assert.equal((await request(testServer).get('/api/admin/session')).status, 401);
  assert.equal((await request(testServer).get('/api/admin/session').set('Authorization', auth(owner))).status, 403);
  const response = await request(testServer).get('/api/admin/session').set('Authorization', adminAuth());
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body.user).sort(), ['email', 'id', 'role']);
});

test('registration dispatch failure preserves an unverified account and explicit resend can recover it', async () => {
  const send = email.sendEmailVerification;
  email.sendEmailVerification = async () => { throw new Error('SMTP down'); };
  try {
    const registered = await request(testServer).post('/api/users/register').send({ name: 'Recovery', email: 'recovery@phase3.test', password });
    assert.equal(registered.status, 200);
    assert.equal(registered.body.requiresVerification, true); assert.equal(registered.body.verificationEmailSent, false);
    assert.equal((await User.findOne({ email: 'recovery@phase3.test' })).isEmailVerified, false);
    assert.equal((await request(testServer).post('/api/users/resend-verification').send({ email: 'recovery@phase3.test' })).status, 503);
  } finally { email.sendEmailVerification = send; }
  assert.equal((await request(testServer).post('/api/users/resend-verification').send({ email: 'recovery@phase3.test' })).status, 200);
});

test('unverified login without an existing token reports dispatch failure without issuing a session', async () => {
  await User.updateOne({ _id: owner._id }, { $set: { isEmailVerified: false }, $unset: { emailVerificationToken: 1 } });
  const send = email.sendEmailVerification;
  email.sendEmailVerification = async () => { throw new Error('SMTP down'); };
  try {
    const response = await request(testServer).post('/api/users/login').send({ email: owner.email, password });
    assert.equal(response.status, 403); assert.equal(response.body.requiresVerification, true); assert.equal(response.body.emailSent, false); assert.equal(response.body.token, undefined);
  } finally { email.sendEmailVerification = send; }
});

test('activity log totals are accurate for empty, first, middle and last pages', async () => {
  const empty = await request(testServer).get('/api/admin/activity-logs?targetType=lead').set('Authorization', adminAuth());
  assert.equal(empty.body.pagination.totalLogs, 0); assert.equal(empty.body.logs.length, 0);
  await AuditLog.insertMany(Array.from({ length: 45 }, (_, index) => ({ adminEmail: 'admin@phase3.test', action: 'update_lead', targetType: 'lead', targetName: `Inquiry ${index}` })));
  for (const [page, expected] of [[1, 20], [2, 20], [3, 5]]) {
    const response = await request(testServer).get(`/api/admin/activity-logs?targetType=lead&page=${page}&limit=20`).set('Authorization', adminAuth());
    assert.equal(response.status, 200); assert.equal(response.body.pagination.totalLogs, 45); assert.equal(response.body.pagination.totalPages, 3); assert.equal(response.body.logs.length, expected);
  }
});


test('admin catalog accepts the empty search and all-type filters sent by the admin page', async () => {
  await property();
  const response = await request(testServer).get('/api/admin/properties?page=1&search=&type=all&sort=newest&status=all').set('Authorization', adminAuth());
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.property.length, 1);
});

test('dashboard reconciles visible listings, current accounts, guest history and honest request charts', async () => {
  const { default: Stats } = await import('../models/statsModel.js');
  await Stats.deleteMany({});
  const visible = await property();
  await property({ expiresAt: new Date(Date.now() - 1000) });
  await property({ hiddenByModeration: true });
  await property({ status: 'archived', archivedAt: new Date() });
  await User.updateOne({ _id: other._id }, { status: 'deleted', deletedAt: new Date() });
  await Appointment.create({ propertyId: visible.id, guestInfo: { name: 'Guest history', email: 'guest@example.com' }, propertySnapshot: { title: 'Historical title' }, date: futureDay, time: '10:00' });
  await Stats.create([{ endpoint: `/api/products/single/${visible.id}`, method: 'GET', statusCode: 200, responseTime: 2 }, { endpoint: `/api/products/single/${visible.id}`, method: 'GET', statusCode: 404, responseTime: 2 }]);
  const res = await request(testServer).get('/api/admin/stats').set('Authorization', adminAuth());
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.stats.totalProperties, 4); assert.equal(res.body.stats.activeListings, 1); assert.equal(res.body.stats.totalUsers, 1);
  const list = await request(testServer).get('/api/admin/properties?status=active').set('Authorization', adminAuth());
  assert.equal(list.body.pagination.total, res.body.stats.activeListings);
  assert.match(JSON.stringify(res.body.stats.recentActivity), /Guest history.*Historical title/);
  assert.equal(res.body.stats.viewsData.labels.length, 30);
  assert.equal(res.body.stats.viewsData.datasets[0].data.reduce((a, b) => a + b, 0), 1);
  assert.match(res.body.stats.viewsData.datasets[0].label, /API requests/);
  for (const endpoint of ['overview', 'users', 'properties']) assert.equal((await request(testServer).get(`/api/admin/stats/${endpoint}`).set('Authorization', adminAuth())).status, 200);
  const count = Property.countDocuments;
  Property.countDocuments = () => Promise.reject(new Error('private database failure'));
  try {
    for (const route of ['stats', 'stats/overview', 'stats/properties']) {
      const failed = await request(testServer).get(`/api/admin/${route}`).set('Authorization', adminAuth());
      assert.equal(failed.status, 500); assert.equal(failed.body.success, false); assert.doesNotMatch(JSON.stringify(failed.body), /private database/);
    }
  } finally { Property.countDocuments = count; }
});

test('refresh outages preserve both cookies; invalid credentials still clear them', async () => {
  const old = await session();
  const find = RefreshCredential.findOne;
  RefreshCredential.findOne = () => { throw new Error('temporary database outage'); };
  try {
    for (const [route, cookie] of [['refresh', old.cookie], ['admin/refresh', 'admin_refresh=' + 'a'.repeat(96)]]) {
      const failed = await request(testServer).post(`/api/users/${route}`).set('Cookie', cookie);
      assert.equal(failed.status, 503); assert.equal(failed.headers['set-cookie'], undefined); assert.doesNotMatch(JSON.stringify(failed.body), /database outage/);
    }
  } finally { RefreshCredential.findOne = find; }
  assert.equal((await request(testServer).post('/api/users/refresh').set('Cookie', old.cookie)).status, 200);
  const invalid = await request(testServer).post('/api/users/refresh').set('Cookie', 'user_refresh=invalid');
  assert.equal(invalid.status, 401); assert.match(invalid.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970/);
});

test('record details and entity audit filters require admin access and safe bounded contracts', async () => {
  const { default: Form } = await import('../models/formModel.js');
  const lead = await Form.create({ name: 'Lead', email: 'lead@example.com', message: 'Details' });
  const p = await property({ postedBy: owner._id });
  const a = await Appointment.create({ propertyId: p.id, userId: owner.id, date: futureDay, time: '10:00' });
  for (const route of [`appointments/${a.id}`, `leads/${lead.id}`]) {
    assert.equal((await request(testServer).get(`/api/admin/${route}`).set('Authorization', auth(owner))).status, 403);
    const result = await request(testServer).get(`/api/admin/${route}`).set('Authorization', adminAuth());
    assert.equal(result.status, 200); assert.doesNotMatch(JSON.stringify(result.body), /password|sessionFence/);
  }
  assert.equal((await request(testServer).get('/api/admin/appointments/not-an-id').set('Authorization', adminAuth())).status, 400);
  assert.equal((await request(testServer).get(`/api/admin/appointments/${new mongoose.Types.ObjectId()}`).set('Authorization', adminAuth())).status, 404);
  await AuditLog.create({ adminEmail: 'system', actorType: 'system', action: 'test_detail', targetType: 'appointment', targetId: a._id });
  const logs = await request(testServer).get(`/api/admin/activity-logs?targetType=appointment&targetId=${a.id}&actorType=system&limit=1`).set('Authorization', adminAuth());
  assert.equal(logs.status, 200); assert.equal(logs.body.pagination.total, 1); assert.equal(logs.body.logs[0].actorEmail, 'system');
  assert.equal((await request(testServer).get(`/api/admin/activity-logs?targetId=${a.id}`).set('Authorization', adminAuth())).status, 400);
  const users = await request(testServer).get('/api/admin/users?search=').set('Authorization', adminAuth());
  assert.equal(users.status, 200); assert.equal(users.body.pagination.total, 2);
  const catalog = await request(testServer).get(`/api/admin/properties/${p.id}`).set('Authorization', adminAuth());
  assert.deepEqual(catalog.body.property.owner, { _id: owner.id, name: owner.name, email: owner.email });
});

test('stale archives and bulk moderation fail without partially changing records', async () => {
  const p = await property();
  await Property.updateOne({ _id: p.id }, { $inc: { __v: 1 } });
  assert.equal((await request(testServer).post('/api/products/remove').set('Authorization', adminAuth()).send({ id: p.id, expectedVersion: 0 })).status, 409);
  assert.equal((await Property.findById(p.id)).status, 'active');
  const bulk = await request(testServer).post('/api/admin/users/bulk-ban').set('Authorization', adminAuth()).send({ userIds: [owner.id, other.id], expectedVersions: { [owner.id]: 0, [other.id]: 1 }, reason: 'stale bulk' });
  assert.equal(bulk.status, 409); assert.equal(await User.countDocuments({ status: 'banned' }), 0);
});

test('cancellation notifications run after commit and never after an audit rollback', async () => {
  const p = await property();
  await Appointment.create({ propertyId: p.id, guestInfo: { email: 'guest@example.com' }, propertySnapshot: { title: 'Snapshot home' }, date: futureDay, time: '10:00' });
  const originalSend = email.sendAppointmentStatusUpdate, create = AuditLog.create;
  const attempts = [];
  email.sendAppointmentStatusUpdate = async (recipient, appointment, status) => {
    assert.equal((await Appointment.findById(appointment._id)).status, 'cancelled');
    attempts.push({ recipient, status });
    throw new Error('simulated mail failure after commit');
  };
  try {
    AuditLog.create = async () => { throw new Error('audit failure'); };
    assert.equal((await request(testServer).post('/api/products/remove').set('Authorization', adminAuth()).send({ id: p.id })).status, 500);
    assert.equal(attempts.length, 0);
    AuditLog.create = create;
    assert.equal((await request(testServer).post('/api/products/remove').set('Authorization', adminAuth()).send({ id: p.id })).status, 200);
    assert.deepEqual(attempts, [{ recipient: 'guest@example.com', status: 'cancelled' }]);
  } finally { AuditLog.create = create; email.sendAppointmentStatusUpdate = originalSend; }
});

test('image validation rejects truncated decoding, excessive dimensions and animated frames before CDN upload', async () => {
  const { validateImage } = await import('../services/listingService.js');
  const { default: sharp } = await import('sharp');
  await validateImage({ buffer: png, mimetype: 'image/png' });
  await assert.rejects(validateImage({ buffer: png.subarray(0, 45), mimetype: 'image/png' }));
  const huge = await sharp({ create: { width: 8001, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(validateImage({ buffer: huge, mimetype: 'image/png' }));
  const pixels = Buffer.alloc(2 * 4 * 3, 255);
  pixels.fill(0, 2 * 2 * 3);
  const animated = await sharp(pixels, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).gif().toBuffer();
  await assert.rejects(validateImage({ buffer: animated, mimetype: 'image/gif' }));
  assert.equal(uploads.length, 0);
});

test('notification templates escape inputs, use historical snapshots and reflect the actual meeting state', async () => {
  const templates = await import('../email.js');
  const historical = { propertyId: null, propertySnapshot: { title: '<img src=x onerror=alert(1)>' }, date: futureDay, time: '10:00', status: 'pending', notes: '<script>bad</script>' };
  const meeting = templates.getMeetingLinkTemplate(historical, 'https://example.com/meet?a=1&b=2');
  assert.match(meeting, /Pending/); assert.doesNotMatch(meeting, /has been confirmed|<img src=x/);
  assert.match(meeting, /&lt;img/); assert.match(templates.getUserReactivatedTemplate('User'), /\/signin/);
  const original = email.sendEmail;
  let html, subject;
  email.sendEmail = async (recipient, title, body) => { html = body; subject = title; };
  try {
    const methods = Object.getPrototypeOf(email);
    await methods.sendAppointmentNotificationToAdmin.call(email, historical, { name: '<svg onload=bad>', email: 'guest@example.com', phone: '<b>phone</b>' });
    assert.doesNotMatch(html, /<svg|<script>|<b>phone/); assert.match(html, /&lt;script&gt;/);
    await methods.sendAppointmentStatusUpdate.call(email, 'guest@example.com', historical, 'cancelled');
    assert.match(subject, /Appointment Cancelled/); assert.match(html, /&lt;img/);
  } finally { email.sendEmail = original; }
});

test('CSV exports disclose their cap and diagnostic failures never expose internal messages', async () => {
  const csv = await request(testServer).get('/api/admin/activity-logs/export').set('Authorization', adminAuth());
  assert.equal(csv.headers['x-export-limit'], '10000'); assert.equal(csv.headers['x-export-truncated'], 'false'); assert.match(csv.text, /Actor Email,Actor Type/);
  const { default: SearchCache } = await import('../models/searchCacheModel.js');
  const count = SearchCache.countDocuments;
  SearchCache.countDocuments = () => { throw new Error('private cache connection'); };
  try {
    const failed = await request(testServer).get('/api/cache/stats').set('Authorization', adminAuth());
    assert.equal(failed.status, 500); assert.equal(failed.body.success, false); assert.doesNotMatch(JSON.stringify(failed.body), /private cache/);
  } finally { SearchCache.countDocuments = count; }
});

test('Brevo transport bounds requests and labels configuration without claiming verified delivery', async () => {
  const { default: axios } = await import('axios');
  const { sendEmail, checkEmailHealth } = await import('../config/nodemailer.js');
  const adapter = axios.defaults.adapter, key = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = 'isolated-test-key';
  let calls = 0;
  axios.defaults.adapter = async config => {
    calls++;
    assert.equal(config.timeout, 10000); assert.equal(config.url, 'https://api.brevo.com/v3/smtp/email');
    return { data: { messageId: 'isolated-test-message' }, status: 201, statusText: 'Created', headers: {}, config };
  };
  try {
    await sendEmail({ from: 'sender@example.com', to: 'guest@example.com', subject: 'Test', html: '<p>Test</p>' });
    assert.equal(calls, 1);
    const health = await checkEmailHealth(); assert.equal(health.status, 'configured'); assert.match(health.message, /not been verified/);
  } finally {
    axios.defaults.adapter = adapter;
    if (key === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = key;
  }
});

test('AI lifecycle requires exact application evidence and rejects stale, unsupported and secret-like options', async () => {
  const original = NvidiaNimProvider.prototype._call;
  const calls = [];
  NvidiaNimProvider.prototype._call = async id => { calls.push(id); return calls.length === 1 ? 'OK' : appJSON; };
  try {
    const created = await request(testServer).post('/api/admin/ai-models').set('Authorization', adminAuth()).send(MODEL_SEEDS[0]);
    assert.equal(created.status, 201, JSON.stringify(created.body)); let row = created.body.model;
    assert.equal((await modelWrite(row, { isActive: true })).status, 409);
    const connection = await request(testServer).post(`/api/admin/ai-models/${row._id}/test`).set('Authorization', adminAuth()).send({ expectedVersion: row.version, mode: 'connection' });
    assert.equal(connection.status, 200); assert.equal(connection.body.result.passed, true); row = connection.body.model;
    assert.equal((await modelWrite(row, { isActive: true })).status, 409);
    const application = await request(testServer).post(`/api/admin/ai-models/${row._id}/test`).set('Authorization', adminAuth()).send({ expectedVersion: row.version, mode: 'application' });
    assert.equal(application.status, 200, JSON.stringify(application.body)); assert.equal(application.body.result.passed, true); row = application.body.model;
    assert.deepEqual(calls, [row.modelId, row.modelId]);
    const enabled = await modelWrite(row, { isActive: true }); assert.equal(enabled.status, 200, JSON.stringify(enabled.body)); row = enabled.body.model;
    assert.equal(row.isDefault, true);
    assert.equal((await modelWrite({ ...row, version: row.version - 1 }, { badge: 'stale' })).status, 409);
    assert.equal((await modelWrite(row, { config: { ...row.config, maxTokens: 4096 } })).status, 409);
    assert.equal((await modelWrite(row, { config: { ...row.config, reasoningBudget: 10 } })).status, 400);
    assert.equal((await modelWrite(row, { apiKey: 'never-store-keys' })).status, 400);
    assert.equal((await request(testServer).post(`/api/admin/ai-models/${row._id}/test`).set('Authorization', auth(owner)).send({ expectedVersion: row.version })).status, 403);
    assert.equal((await request(testServer).get('/api/ai/models')).body.models[0].slug, row.slug);
    assert.doesNotMatch(JSON.stringify(application.body), /isolated-nvidia-test-key|reasoning_content/);
    await AIModel.collection.updateOne({ _id: new mongoose.Types.ObjectId(row._id) }, { $set: { apiKey: 'legacy-secret-value', 'lastTest.rawResponse': 'legacy-secret-value' } });
    const listed = await request(testServer).get('/api/admin/ai-models').set('Authorization', adminAuth());
    assert.equal(listed.status, 200); assert.doesNotMatch(JSON.stringify(listed.body), /legacy-secret-value/);
  } finally { NvidiaNimProvider.prototype._call = original; }
});

test('default replacement, full AI off, removal history and stale bulk reorder are atomic', async () => {
  let first = await aiFixture('first', { isActive: true, isDefault: true });
  let second = await aiFixture('second', { isActive: true });
  assert.equal((await modelWrite(first, { isActive: false })).status, 409);
  const replaced = await modelWrite(first, { isActive: false, replacementId: second.id, replacementVersion: second.__v });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
  second = await AIModel.findById(second.id); assert.equal(second.isDefault, true);
  first = await AIModel.findById(first.id);
  const stale = await request(testServer).post('/api/admin/ai-models/reorder').set('Authorization', adminAuth()).send({ modelIds: [second.id, first.id], expectedVersions: { [first.id]: first.__v, [second.id]: 99 } });
  assert.equal(stale.status, 409); assert.equal((await AIModel.findById(first.id)).order, first.order);
  const removed = await request(testServer).delete(`/api/admin/ai-models/${second.id}`).set('Authorization', adminAuth()).send({ expectedVersion: second.__v, turnOffAI: true });
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal(await AuditLog.countDocuments({ action: 'delete_ai_model', targetId: second._id }), 1);
  assert.deepEqual(await resolveModelsByProvider(), { nvidia: [] });
  const off = await request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'fake').send({ city: 'Pune', price: { max: 5000000 } });
  assert.equal(off.status, 503);
});

test('model tests never fall back, reject reasoning-only/invalid JSON and detect edits made during a test', async () => {
  const row = await aiFixture('test-exact'); await aiFixture('not-a-test-fallback', { isActive: true });
  const original = NvidiaNimProvider.prototype._call;
  let calls = 0;
  NvidiaNimProvider.prototype._call = async () => { calls++; return 'not application JSON'; };
  try {
    const failed = await request(testServer).post(`/api/admin/ai-models/${row.id}/test`).set('Authorization', adminAuth()).send({ expectedVersion: row.__v });
    assert.equal(failed.status, 200); assert.equal(failed.body.result.passed, false); assert.equal(calls, 1);
    const fresh = failed.body.model;
    NvidiaNimProvider.prototype._call = async () => {
      await AIModel.updateOne({ _id: row.id }, { $set: { 'config.temperature': 0.8 }, $inc: { __v: 1 } });
      return appJSON;
    };
    const stale = await request(testServer).post(`/api/admin/ai-models/${row.id}/test`).set('Authorization', adminAuth()).send({ expectedVersion: fresh.version });
    assert.equal(stale.status, 409);
  } finally { NvidiaNimProvider.prototype._call = original; }
});

test('NVIDIA parameter profiles omit unsupported fields and preserve saved caps and final-answer boundaries', async () => {
  const { default: axios } = await import('axios');
  const adapter = axios.defaults.adapter; const requests = [];
  axios.defaults.adapter = async config => { requests.push({ body: JSON.parse(config.data), timeout: config.timeout }); return { data: { choices: [{ finish_reason: 'stop', message: { content: appJSON, reasoning_content: 'never disclose this' } }] }, status: 200, statusText: 'OK', headers: {}, config }; };
  try {
    for (const seed of MODEL_SEEDS) {
      const cfg = { ...seed.config, maxTokens: 2048, timeoutMs: 1000, ...(seed.profile === 'nemotron-bolt' && { enableThinking: true, seed: 42 }), ...(seed.profile === 'mistral-large-4' && { reasoningEffort: 'high' }) };
      const provider = new NvidiaNimProvider('fake-key', [{ ...seed, config: cfg }]);
      assert.equal(await provider.generateText('demo', 'demo', { exact: true, maxTokens: 6000, timeoutMs: 20000, jsonMode: true }), appJSON);
    }
    assert.equal(requests[0].body.chat_template_kwargs.enable_thinking, true); assert.equal(requests[0].body.seed, 42);
    assert.equal(requests[1].body.reasoning_effort, 'high'); assert.equal(requests[1].body.chat_template_kwargs, undefined);
    assert.equal(requests[2].body.reasoning_effort, undefined);
    for (const item of requests) { assert.equal(item.body.response_format, undefined); assert.equal(item.body.reasoning_budget, undefined); assert.equal(item.body.max_tokens, 2048); assert.equal(item.timeout, 1000); assert.equal(item.body.stream, false); }
    axios.defaults.adapter = async config => ({ data: { choices: [{ message: { reasoning_content: 'private thinking' } }] }, status: 200, statusText: 'OK', headers: {}, config });
    await assert.rejects(new NvidiaNimProvider('fake', [MODEL_SEEDS[0]]).generateText('demo', 'demo', { exact: true }));
  } finally { axios.defaults.adapter = adapter; }
});

test('NVIDIA fallback reports its actual model and invalid JSON advances the chain', async () => {
  const service = createAIService('fake', [{ ...MODEL_SEEDS[0], slug: 'bad-first' }, { ...MODEL_SEEDS[1], slug: 'good-second' }]);
  const provider = service.router.providers[0]; const calls = [];
  provider._call = async modelId => { calls.push(modelId); return calls.length === 1 ? 'invalid JSON' : appJSON; };
  assert.equal(await service.generateText('demo'), appJSON);
  assert.equal(service.lastGeneration.fallback, true); assert.equal(service.lastGeneration.modelId, MODEL_SEEDS[1].modelId);
  assert.equal(calls.length, 2);
});

test('catalog changes invalidate search and trends caches across service instances, including limits', async () => {
  const { default: SearchCache } = await import('../models/searchCacheModel.js'); const { default: TrendsCache } = await import('../models/trendsCacheModel.js');
  await SearchCache.deleteMany({}); await TrendsCache.deleteMany({});
  const model = await aiFixture('cache-default', { isActive: true, isDefault: true });
  const prototype = Object.getPrototypeOf(createFirecrawlService('fake'));
  const search = prototype.findProperties, trends = prototype.getLocationTrends, call = NvidiaNimProvider.prototype._call;
  let searches = 0, trendCalls = 0;
  prototype.findProperties = async () => { searches++; return { properties: [{ building_name: 'Demo Home', price: 'INR 5000000' }] }; };
  prototype.getLocationTrends = async () => { trendCalls++; return { locations: [{ location: 'Pune' }] }; };
  NvidiaNimProvider.prototype._call = async (modelId, config, prompt) => prompt.includes('localities') ? '{"trends":[]}' : appJSON;
  const find = () => request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'fake').send({ city: 'CacheCity', price: { max: 5000000 } });
  const loc = limit => request(testServer).get(`/api/locations/CacheCity/trends?limit=${limit}`).set('X-Firecrawl-Key', 'fake');
  try {
    assert.equal((await find()).status, 200); assert.equal((await find()).body.fromCache, true); assert.equal(searches, 1);
    assert.equal((await loc(1)).status, 200); assert.equal((await loc(2)).status, 200); assert.equal(trendCalls, 2);
    const changed = await modelWrite(model, { badge: 'New metadata' }); assert.equal(changed.status, 200);
    assert.equal((await find()).status, 200); assert.equal(searches, 2);
    await AIModel.updateOne({ _id: model.id }, { $set: { isActive: false }, $inc: { __v: 1 } });
    assert.equal((await find()).status, 503); assert.equal((await loc(1)).status, 503);
  } finally { prototype.findProperties = search; prototype.getLocationTrends = trends; NvidiaNimProvider.prototype._call = call; }
});

test('concurrent enable/default writes preserve one default and model audit failure rolls back mutations', async () => {
  const first = await aiFixture('concurrent-first'), second = await aiFixture('concurrent-second');
  const results = await Promise.all([modelWrite(first, { isActive: true }), modelWrite(second, { isActive: true })]);
  assert.deepEqual(results.map(result => result.status), [200, 200]); assert.equal(await AIModel.countDocuments({ isDefault: true }), 1);
  const current = await AIModel.findById(first.id); const create = AuditLog.create;
  AuditLog.create = async () => { throw new Error('audit unavailable'); };
  try { assert.equal((await modelWrite(current, { badge: 'rolled-back' })).status, 500); assert.notEqual((await AIModel.findById(first.id)).badge, 'rolled-back'); }
  finally { AuditLog.create = create; }
});

test('NVIDIA migration dry run and apply preserve unrelated records, backups and retired catalog history', async () => {
  const { buildNvidiaPlan, applyNvidiaPlan, snapshotHash } = await import('../scripts/nvidia-model-migration.js');
  const { mkdtemp, readFile, stat } = await import('node:fs/promises');
  const folder = await mkdtemp(path.join(tmpdir(), 'nvidia-migration-test-'));
  await AIModel.collection.insertMany([{ name: 'Old provider', slug: 'old-github', modelId: 'openai/gpt-4.1', provider: 'github', isActive: true, isDefault: true, __v: 0 }, { name: 'NVIDIA kept', slug: 'old-nvidia', modelId: 'demo/legacy', provider: 'nvidia', config: { enableThinking: true, reasoningBudget: 1000 }, isActive: true, __v: 0 }]);
  const beforeUsers = await User.find().lean(), beforeLogs = await AuditLog.find().lean();
  const rows = await AIModel.collection.find().toArray(); const plan = buildNvidiaPlan(rows);
  assert.equal(plan.blockers.length, 0); assert.equal(plan.retire.length, 1); assert.equal(plan.normalize.length, 1); assert.equal(plan.insert.length, 3);
  assert.equal(snapshotHash(await AIModel.collection.find().toArray()), plan.snapshot);
  await AIModel.collection.createIndex({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true }, name: 'one_default_ai_model' });
  const backup = path.join(folder, 'models.ejson'); await applyNvidiaPlan(mongoose.connection, plan, backup);
  assert.match(await readFile(backup, 'utf8'), /old-github/); assert.equal((await stat(backup)).mode & 0o777, 0o600);
  assert.equal(await AIModel.countDocuments({ provider: 'github' }), 0); assert.equal(await AIModel.countDocuments(), 4); assert.equal(await AIModel.countDocuments({ isActive: true }), 0);
  assert.equal(await mongoose.connection.db.collection('ai_model_retirements').countDocuments({ 'original.slug': 'old-github' }), 1);
  assert.deepEqual(await User.find().lean(), beforeUsers); assert.deepEqual(await AuditLog.find().lean(), beforeLogs);
  assert.equal((await AIModel.collection.indexes()).some(index => index.name === 'one_default_ai_model'), false);
});

test('editing saved serving parameters invalidates application evidence before activation', async () => {
  const row = await aiFixture('needs-retest');
  const changed = await modelWrite(row, { config: { ...row.config.toObject(), temperature: 0.7 } });
  assert.equal(changed.status, 200, JSON.stringify(changed.body)); assert.equal(changed.body.model.lastTest, undefined);
  assert.equal((await modelWrite(changed.body.model, { isActive: true })).status, 409);
  assert.equal((await modelWrite(changed.body.model, { profile: null })).status, 400);
  assert.equal((await modelWrite(changed.body.model, { config: null })).status, 400);
});

test('model test endpoint has a bounded per-admin request budget', async () => {
  let row = (await aiFixture('rate-test')).toObject();
  const original = NvidiaNimProvider.prototype._call; NvidiaNimProvider.prototype._call = async () => appJSON;
  try {
    for (let i = 0; i < 6; i++) {
      const result = await request(testServer).post(`/api/admin/ai-models/${row._id}/test`).set('Authorization', adminAuth()).send({ expectedVersion: row.version ?? row.__v ?? 0 });
      assert.equal(result.status, 200); row = result.body.model;
    }
    assert.equal((await request(testServer).post(`/api/admin/ai-models/${row._id}/test`).set('Authorization', adminAuth()).send({ expectedVersion: row.version })).status, 429);
  } finally { NvidiaNimProvider.prototype._call = original; }
});

test('search analyzes more than eight listings and labels incomplete coverage without inventing scores', async () => {
  await aiFixture('larger-results', { isActive: true, isDefault: true });
  const prototype = Object.getPrototypeOf(createFirecrawlService('fake'));
  const search = prototype.findProperties, call = NvidiaNimProvider.prototype._call;
  const items = Array.from({ length: 10 }, (_, index) => ({ building_name: `Home ${index}`, price: 'INR 5000000' }));
  prototype.findProperties = async () => ({ properties: items });
  NvidiaNimProvider.prototype._call = async (modelId, config, prompt) => {
    assert.match(prompt, /Rank these 10/); assert.match(prompt, /Home 9/);
    return JSON.stringify({ overview: items.slice(0, 9).map(item => ({ name: item.building_name, price: item.price, match_score: 50 })) });
  };
  try {
    const result = await request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'fake').send({ city: 'LargerResultCity', limit: 10, price: { max: 5000000 } });
    assert.equal(result.status, 200); assert.equal(result.body.properties.length, 10);
    assert.equal(result.body.analysisMeta.status, 'partial'); assert.equal(result.body.analysisMeta.analyzedCount, 9); assert.equal(result.body.analysisMeta.totalCount, 10);
  } finally { prototype.findProperties = search; NvidiaNimProvider.prototype._call = call; }
});

test('explicit setup seeds only disabled NVIDIA profiles and cannot silently overwrite a catalog', async () => {
  const { seedDefaultModels } = await import('../controller/aiModelController.js');
  await seedDefaultModels();
  assert.equal(await AIModel.countDocuments(), 3); assert.equal(await AIModel.countDocuments({ isActive: true }), 0);
  await assert.rejects(seedDefaultModels(), /not empty/);
  assert.equal((await request(testServer).get('/api/ai/models')).body.available, false);
});

test('making a tested model default and saving a full fallback order updates all affected versions', async () => {
  const first = await aiFixture('ordered-first', { isActive: true, isDefault: true });
  let second = await aiFixture('ordered-second', { isActive: true });
  const selected = await modelWrite(second, { isDefault: true }); assert.equal(selected.status, 200, JSON.stringify(selected.body));
  assert.equal(await AIModel.countDocuments({ isDefault: true }), 1); assert.equal((await AIModel.findById(first.id)).isDefault, false);
  const oldFirst = await AIModel.findById(first.id); second = await AIModel.findById(second.id);
  const order = { modelIds: [second.id, first.id], expectedVersions: { [first.id]: oldFirst.__v, [second.id]: second.__v } };
  const saved = await request(testServer).post('/api/admin/ai-models/reorder').set('Authorization', adminAuth()).send(order);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual((await AIModel.find().sort('order')).map(row => row.slug), ['ordered-second', 'ordered-first']);
  assert.equal((await request(testServer).post('/api/admin/ai-models/reorder').set('Authorization', adminAuth()).send(order)).status, 409);
});

test('NVIDIA timeout diagnostics use safe codes without leaking upstream configuration', async () => {
  const { default: axios } = await import('axios'); const original = axios.defaults.adapter;
  axios.defaults.adapter = async () => { throw Object.assign(new Error('sensitive upstream detail'), { code: 'ECONNABORTED' }); };
  try { await assert.rejects(new NvidiaNimProvider('private-test-key', [MODEL_SEEDS[0]]).generateText('demo', 'demo', { exact: true }), error => error.code === 'NVIDIA_TIMEOUT' && !error.message.includes('sensitive')); }
  finally { axios.defaults.adapter = original; }
});

test('NVIDIA fallback bounds quota use to three actual attempts', async () => {
  const models = Array.from({ length: 5 }, (_, index) => ({ slug: `budget-${index}`, modelId: `demo/budget-${index}`, profile: 'text-basic', config: { maxTokens: 256, timeoutMs: 1000 } }));
  const provider = new NvidiaNimProvider('fake', models); let attempts = 0;
  provider._call = async () => { attempts++; throw new Error('upstream failure'); };
  await assert.rejects(provider.generateText('demo', 'demo')); assert.equal(attempts, 3);
});

test('acceptance P3-02: admin login, cross-origin session, temporary refresh recovery and logout', async () => {
  const origin = 'http://localhost:5174';
  const login = await request(testServer).post('/api/users/admin').set('Origin', origin).send({ email: process.env.ADMIN_EMAIL, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.equal(login.headers['access-control-allow-origin'], origin); assert.equal(login.headers['access-control-allow-credentials'], 'true');
  const refreshHeader = login.headers['set-cookie'].find(value => value.startsWith('admin_refresh='));
  assert.match(refreshHeader, /HttpOnly/); assert.match(refreshHeader, /SameSite=Lax/);
  let cookie = refreshHeader.split(';')[0], token = `Bearer ${login.body.token}`;
  assert.equal((await request(testServer).get('/api/admin/session').set('Origin', origin).set('Authorization', token)).status, 200);
  const find = RefreshCredential.findOne;
  RefreshCredential.findOne = () => { throw new Error('isolated transient outage'); };
  try {
    const unavailable = await request(testServer).post('/api/users/admin/refresh').set('Origin', origin).set('Cookie', cookie);
    assert.equal(unavailable.status, 503); assert.equal(unavailable.headers['set-cookie'], undefined);
  } finally { RefreshCredential.findOne = find; }
  const refreshed = await request(testServer).post('/api/users/admin/refresh').set('Origin', origin).set('Cookie', cookie);
  assert.equal(refreshed.status, 200); token = `Bearer ${refreshed.body.token}`; cookie = refreshed.headers['set-cookie'].find(value => value.startsWith('admin_refresh=')).split(';')[0];
  assert.equal((await request(testServer).get('/api/admin/session').set('Authorization', token)).status, 200);
  const logout = await request(testServer).post('/api/users/admin/logout').set('Cookie', cookie);
  assert.equal(logout.status, 200); assert.match(logout.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970/);
  assert.equal((await request(testServer).get('/api/admin/session').set('Authorization', token)).status, 401);
  assert.equal((await request(testServer).post('/api/users/admin/refresh').set('Cookie', cookie)).status, 401);
});

test('acceptance P3-02: production origin allowlist, preflight/export headers and secure refresh cookies', async () => {
  const origin = 'https://admin.acceptance.test';
  const production = express();
  production.use(cors(corsOptions({ NODE_ENV: 'production', ADMIN_URL: origin, EXTRA_ALLOWED_ORIGINS: ' https://preview.acceptance.test ' })));
  production.get('/probe', (req, res) => res.json({ success: true }));
  production.use((error, req, res, next) => respondError(res, error));
  const server = createServer(production);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const preflight = await request(server).options('/probe').set('Origin', origin).set('Access-Control-Request-Method', 'GET').set('Access-Control-Request-Headers', 'authorization');
    assert.equal(preflight.status, 204); assert.equal(preflight.headers['access-control-allow-credentials'], 'true');
    const allowed = await request(server).get('/probe').set('Origin', origin);
    assert.equal(allowed.status, 200); assert.match(allowed.headers['access-control-expose-headers'], /X-Export-Truncated/);
    assert.equal((await request(server).get('/probe').set('Origin', 'https://preview.acceptance.test')).status, 200);
    const blocked = await request(server).get('/probe').set('Origin', 'http://localhost:5174');
    assert.equal(blocked.status, 500); assert.equal(blocked.headers['access-control-allow-origin'], undefined); assert.doesNotMatch(JSON.stringify(blocked.body), /CORS blocked/);
    assert.equal((await request(server).get('/probe')).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  const environment = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try {
    const login = await request(testServer).post('/api/users/admin').send({ email: process.env.ADMIN_EMAIL, password });
    assert.equal(login.status, 200); assert.match(login.headers['set-cookie'][0], /Secure/); assert.match(login.headers['set-cookie'][0], /SameSite=None/);
  } finally { process.env.NODE_ENV = environment; }
});

test('acceptance P3-03/P3-04: retained-image revision, stale review and historical bookings survive mail failure', async () => {
  let submission = request(testServer).post('/api/user/properties').set('Authorization', auth(owner));
  for (const [key, value] of Object.entries(fields)) submission = submission.field(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  const created = await submission.attach('images', png, 'acceptance.png'); assert.equal(created.status, 201, JSON.stringify(created.body));
  let listing = created.body.property; const originalImages = [...listing.image];
  const approved = await request(testServer).put(`/api/admin/properties/${listing._id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: listing.version });
  assert.equal(approved.status, 200); listing = approved.body.property;
  const revision = await request(testServer).put(`/api/user/properties/${listing._id}`).set('Authorization', auth(owner)).field('title', 'Acceptance correction').field('retainedImages', JSON.stringify(originalImages)).field('expectedVersion', String(listing.version));
  assert.equal(revision.status, 200); assert.deepEqual(revision.body.property.image, originalImages);
  assert.equal(uploads.length, 1); assert.equal(removed.length, 0);
  assert.equal((await request(testServer).get(`/api/products/single/${listing._id}`)).status, 404);
  assert.equal((await request(testServer).put(`/api/admin/properties/${listing._id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: listing.version })).status, 409);
  const rereview = await request(testServer).put(`/api/admin/properties/${listing._id}/approve`).set('Authorization', adminAuth()).send({ expectedVersion: revision.body.property.version });
  assert.equal(rereview.status, 200); listing = rereview.body.property;
  assert.equal((await request(testServer).get(`/api/products/single/${listing._id}`)).status, 200);
  const original = email.sendAppointmentStatusUpdate; const attempts = [];
  email.sendAppointmentStatusUpdate = async (recipient, appointment, status) => {
    assert.equal((await Appointment.findById(appointment._id)).status, status);
    attempts.push({ recipient, status }); throw new Error('isolated mail outage');
  };
  try {
    for (const [guest, time] of [[true, '10:00'], [false, '11:00']]) {
      let call = request(testServer).post(`/api/appointments/schedule${guest ? '' : '/auth'}`);
      if (!guest) call = call.set('Authorization', auth(other));
      const booked = await call.send({ propertyId: listing._id, date: futureDay, time, ...(guest ? { name: 'Acceptance guest', email: 'acceptance-guest@example.com', phone: fields.phone } : {}) });
      assert.equal(booked.status, 201); let appointment = booked.body.appointment;
      const confirmed = await request(testServer).put('/api/appointments/status').set('Authorization', adminAuth()).send({ appointmentId: appointment._id, expectedVersion: appointment.version, status: 'confirmed' });
      assert.equal(confirmed.status, 200); appointment = confirmed.body.appointment;
      assert.equal((await request(testServer).get(`/api/admin/appointments/${appointment._id}`).set('Authorization', adminAuth())).body.appointment.status, 'confirmed');
    }
    const archived = await request(testServer).post('/api/products/remove').set('Authorization', adminAuth()).send({ id: listing._id, expectedVersion: listing.version });
    assert.equal(archived.status, 200, JSON.stringify(archived.body));
    const history = await request(testServer).get('/api/admin/appointments').set('Authorization', adminAuth());
    assert.equal(history.body.appointments.length, 2);
    for (const item of history.body.appointments) { assert.equal(item.status, 'cancelled'); assert.equal(item.propertySnapshot.title, 'Acceptance correction'); assert.deepEqual(item.propertySnapshot.image, originalImages); }
    assert.deepEqual(attempts.map(value => value.status), ['confirmed', 'confirmed', 'cancelled', 'cancelled']);
    assert.deepEqual(new Set(attempts.map(value => value.recipient)), new Set(['acceptance-guest@example.com', other.email]));
    assert.equal(removed.length, 0);
    assert.equal((await request(testServer).get('/api/appointments/user').set('Authorization', auth(other))).body.appointments.length, 1);
  } finally { email.sendAppointmentStatusUpdate = original; }
});

test('acceptance P3-05: inquiry resolution and recipient confirmation/suppression retain version and consent boundaries', async () => {
  const { default: Form } = await import('../models/formModel.js'); const { default: News } = await import('../models/newsModel.js');
  await Form.deleteMany({}); await News.deleteMany({});
  const posted = await request(testServer).post('/api/forms/submit').send({ name: 'Acceptance contact', email: 'contact-acceptance@example.com', message: 'Please contact me' });
  assert.equal(posted.status, 200);
  const inbox = await request(testServer).get('/api/admin/leads').set('Authorization', adminAuth()); let lead = inbox.body.leads[0];
  for (const status of ['in_progress', 'resolved']) {
    const changed = await request(testServer).put(`/api/admin/leads/${lead._id}`).set('Authorization', adminAuth()).send({ expectedVersion: lead.version, status, adminNote: 'Acceptance follow-up' });
    assert.equal(changed.status, 200); lead = changed.body.lead;
  }
  assert.equal((await request(testServer).get(`/api/admin/leads/${lead._id}`).set('Authorization', adminAuth())).body.lead.status, 'resolved');
  let confirmationToken;
  const send = email.sendEmail;
  email.sendEmail = async (recipient, subject, html) => { confirmationToken = html.match(/\/newsletter\/confirm\?token=([^"&]+)/)?.[1]; return { success: true }; };
  try { assert.equal((await request(testServer).post('/api/news/newsdata').send({ email: 'consent-acceptance@example.com' })).status, 200); }
  finally { email.sendEmail = send; }
  assert.ok(confirmationToken, 'Confirmation link should be dispatched to the recipient');
  let subscriber = await News.findOne({ email: 'consent-acceptance@example.com' }); assert.equal(subscriber.status, 'pending');
  assert.equal((await request(testServer).post('/api/news/confirm').send({ token: decodeURIComponent(confirmationToken) })).status, 200);
  const list = await request(testServer).get('/api/admin/subscribers?status=confirmed').set('Authorization', adminAuth());
  assert.equal(list.body.pagination.total, 1); assert.doesNotMatch(JSON.stringify(list.body), /tokenHash|confirmationToken/);
  assert.equal((await request(testServer).put(`/api/admin/subscribers/${subscriber.id}/suppress`).set('Authorization', adminAuth()).send({})).status, 200);
  assert.equal((await request(testServer).post('/api/news/confirm').send({ token: decodeURIComponent(confirmationToken) })).status, 404);
  subscriber = await News.findById(subscriber.id); assert.equal(subscriber.status, 'unsubscribed');
});

test('acceptance P3-06: public SSE returns actual NVIDIA provenance and cache metadata', async () => {
  await aiFixture('acceptance-stream', { isActive: true, isDefault: true });
  const prototype = Object.getPrototypeOf(createFirecrawlService('fake'));
  const find = prototype.findProperties, call = NvidiaNimProvider.prototype._call;
  prototype.findProperties = async () => ({ properties: [{ building_name: 'Demo Home', price: 'INR 5000000', location_address: 'Pune' }] });
  NvidiaNimProvider.prototype._call = async () => appJSON;
  try {
    for (const cached of [false, true]) {
      const stream = await request(testServer).post('/api/ai/search').set('Accept', 'text/event-stream').set('X-Firecrawl-Key', 'fake').send({ city: 'AcceptanceStreamCity', price: { max: 5000000 } }).timeout({ response: 3000, deadline: 5000 });
      assert.equal(stream.status, 200); assert.match(stream.headers['content-type'], /text\/event-stream/);
      const events = stream.text.split('\n\n').filter(Boolean).map(event => { const [name, payload] = event.split('\n'); return { name: name.slice(7), data: JSON.parse(payload.slice(6)) }; });
      const result = events.find(event => event.name === 'result'); assert.ok(result, stream.text);
      assert.equal(result.data.success, true); assert.equal(result.data.analysisMeta.actualModel.provider, 'nvidia'); assert.equal(result.data.analysisMeta.actualModel.slug, 'acceptance-stream');
      assert.equal(Boolean(result.data.fromCache), cached); assert.equal(events.at(-1).name, 'done');
    }
  } finally { prototype.findProperties = find; NvidiaNimProvider.prototype._call = call; }
});

test('acceptance P3-06: a late coalesced SSE client receives the complete shared result', async () => {
  await aiFixture('acceptance-shared-stream', { isActive: true, isDefault: true });
  const prototype = Object.getPrototypeOf(createFirecrawlService('fake'));
  const find = prototype.findProperties, call = NvidiaNimProvider.prototype._call;
  let sourceCalls = 0, inferenceCalls = 0, release;
  let started; const analyzing = new Promise(resolve => { started = resolve; });
  prototype.findProperties = async () => { sourceCalls++; return { properties: [{ building_name: 'Demo Home', price: 'INR 5000000' }] }; };
  NvidiaNimProvider.prototype._call = async () => { inferenceCalls++; started(); return new Promise(resolve => { release = () => resolve(appJSON); }); };
  const search = () => request(testServer).post('/api/ai/search').set('Accept', 'text/event-stream').set('X-Firecrawl-Key', 'fake').send({ city: 'AcceptanceSharedStreamCity', price: { max: 5000000 } }).timeout({ response: 3000, deadline: 5000 });
  let first;
  try {
    first = search().then(response => response);
    await analyzing;
    const second = search().buffer(true).parse((incoming, done) => {
      let body = ''; incoming.setEncoding('utf8');
      incoming.on('data', chunk => { body += chunk; if (body.includes('"stage":"searching"')) release(); });
      incoming.on('end', () => done(null, body)); incoming.on('error', done);
    });
    const both = await Promise.all([first, second]);
    assert.equal(sourceCalls, 1); assert.equal(inferenceCalls, 1);
    for (const response of both) {
      const text = response.text || response.body;
      assert.match(text, /event: result\n/); assert.match(text, /"properties":\[/); assert.match(text, /"actualModel":\{/); assert.match(text, /event: done\n/);
    }
  } finally { release?.(); if (first) await first.catch(() => {}); prototype.findProperties = find; NvidiaNimProvider.prototype._call = call; }
});

test('expired public tokens are rejected quietly and session-store outages remain retryable', async () => {
 const expired = jwt.sign({ id: owner.id, sv: 0 }, process.env.JWT_SECRET, { expiresIn: -1 });
 const result = await request(testServer).get('/api/users/me').set('Authorization', `Bearer ${expired}`);
 assert.equal(result.status, 401); assert.equal(result.body.code, 'TOKEN_EXPIRED');
 const find = User.findById;
 User.findById = () => { throw new Error('private store failure'); };
 try {
  const unavailable = await request(testServer).get('/api/users/me').set('Authorization', auth(owner));
  assert.equal(unavailable.status, 503); assert.doesNotMatch(JSON.stringify(unavailable.body), /private store/);
 } finally { User.findById = find; }
});
