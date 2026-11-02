import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';

// Never load server.js or connectdb: this suite owns an ephemeral database.
process.env.NODE_ENV = 'test';
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
const { default: AIModel } = await import('../models/aiModelModel.js');
const { default: imagekit } = await import('../config/imagekit.js');
const { default: email } = await import('../services/emailService.js');
const { default: formRoutes } = await import('../routes/formRoutes.js');
const { default: newsRoutes } = await import('../routes/newsRoutes.js');
const { default: userRoutes } = await import('../routes/userRoutes.js');
const { default: productRoutes } = await import('../routes/productRoutes.js');
const { default: propertyRoutes } = await import('../routes/propertyRoutes.js');
const { default: adminRoutes } = await import('../routes/adminRoutes.js');
const { default: appointmentRoutes } = await import('../routes/appointmentRoutes.js');
const { createCircuitBreaker, registry } = await import('../utils/circuitBreaker.js');
const { LLMRouter } = await import('../services/llm/LLMRouter.js');
const { GitHubModelsProvider } = await import('../services/llm/GitHubModelsProvider.js');
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
app.use(express.json());
app.use(cookieParser());
app.use('/api/form', formRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', propertyRoutes);
app.use((error, req, res, next) => {
  res.status(error.status || error.statusCode || (error.name === 'MulterError' ? 400 : 500)).json({ success: false, message: error.message });
});

const testServer = createServer(app);
let mongo, owner, other, adminToken, passwordHash;
let uploads = [], removed = [];
const password = 'Phase1-password!';
const tokens = new Map();
const auth = user => `Bearer ${tokens.get(user.id)}`;
const futureDay = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const adminAuth = () => `Bearer ${adminToken}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5qkAAAAASUVORK5CYII=', 'base64');
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
  await Promise.all([User.init(), Property.init(), Appointment.init(), AuthSession.init(), RefreshCredential.init(), AuditLog.init()]);
}, { timeout: 180000 });

beforeEach(async () => {
  for (const limiter of [loginLimiter, registrationLimiter, passwordResetLimiter, passwordResetVerifyLimiter, emailResendLimiter]) for (const ip of ['::ffff:127.0.0.1', '127.0.0.1', '::1']) await limiter.resetKey(ip);
  await Promise.all([User.deleteMany({}), Property.deleteMany({}), Appointment.deleteMany({}), AuthSession.deleteMany({}), RefreshCredential.deleteMany({}), AuditLog.deleteMany({})]);
  owner = await User.create({ name: 'Owner', email: 'owner@phase1.test', password: passwordHash, isEmailVerified: true });
  other = await User.create({ name: 'Other', email: 'other@phase1.test', password: passwordHash, isEmailVerified: true });
  for (const user of [owner, other]) tokens.set(user.id, (await createSession(user, 'user')).token);
  adminToken = (await createSession(await Admin.findOne({}), 'admin')).token;
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

test('AI model create/update persists provider and all-disabled models stay disabled', async () => {
  await AIModel.deleteMany({});
  const created = await request(testServer).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'GitHub test', slug: 'github-test', modelId: 'test-id', provider: 'github' });
  assert.equal(created.status, 201); assert.equal(created.body.model.provider, 'github');
  const update = await request(testServer).put(`/api/admin/ai-models/${created.body.model._id}`).set('Authorization', adminAuth()).send({ isActive: false });
  assert.equal(update.status, 200);
  assert.deepEqual(await resolveModelsByProvider(), { github: [], nvidia: [] });
  assert.equal(await AIModel.countDocuments(), 1);
  await request(testServer).delete(`/api/admin/ai-models/${created.body.model._id}`).set('Authorization', adminAuth());
  assert.deepEqual(await resolveModelsByProvider(), { github: [], nvidia: [] });
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
  const providerCircuit = registry.getBreaker('ghm-phase1-recovery', { failureThreshold: 1, timeout: 1 });
  await assert.rejects(providerCircuit.execute(async () => { throw new Error('temporary outage'); }));
  providerCircuit.nextAttempt = Date.now() - 1;
  const provider = new GitHubModelsProvider('fake-key', [{ slug: 'phase1-recovery', modelId: 'test-id', config: { timeoutMs: 1000 } }]);
  provider._call = async () => 'recovered response';
  assert.equal(await new LLMRouter([provider]).generateText('test', 'test'), 'recovered response');
});

test('selected NVIDIA provider runs first; disabled provider does not reappear as hardcoded fallback', async () => {
  const originalGitHub = GitHubModelsProvider.prototype.generateText;
  const originalNvidia = NvidiaNimProvider.prototype.generateText;
  const calls = [];
  GitHubModelsProvider.prototype.generateText = async function () { calls.push('github'); return 'github'; };
  NvidiaNimProvider.prototype.generateText = async function () { calls.push('nvidia'); return 'nvidia'; };
  const model = [{ slug: 'phase1-priority', modelId: 'test', config: { timeoutMs: 1000 } }];
  try {
    const ai = createAIService('fake-github', 'fake-nvidia', model, model, 'nvidia');
    assert.equal(await ai.generateText('test'), 'nvidia'); assert.deepEqual(calls, ['nvidia']);
    const only = createAIService('fake-github', 'fake-nvidia', [], model, 'nvidia');
    assert.deepEqual(only.router.providers.map(p => p.name), ['NvidiaNim']);
    assert.throws(() => createAIService('fake-github', 'fake-nvidia', [], []), /No enabled/);
  } finally {
    GitHubModelsProvider.prototype.generateText = originalGitHub;
    NvidiaNimProvider.prototype.generateText = originalNvidia;
  }
});

test('telemetry URL redaction removes raw verification/reset tokens and queries', () => {
  assert.equal(redactUrl('/api/users/verify/secret-token?email=private'), '/api/users/verify/[REDACTED]');
  assert.equal(redactUrl('/api/users/reset/secret-reset'), '/api/users/reset/[REDACTED]');
});

test('HTTP search honors the default/selected provider and rejects a disabled model', async () => {
  const githubKey = process.env.GITHUB_MODELS_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  process.env.GITHUB_MODELS_API_KEY = 'test-only-github';
  process.env.NVIDIA_API_KEY = 'test-only-nvidia';
  const firecrawlPrototype = Object.getPrototypeOf(createFirecrawlService('test-only-firecrawl'));
  const originalSearch = firecrawlPrototype.findProperties;
  const originalGitHub = GitHubModelsProvider.prototype._call;
  const originalNvidia = NvidiaNimProvider.prototype._call;
  const calls = [];
  const result = JSON.stringify({ overview: [{ name: 'Test result', price: '₹50 L', match_score: 50 }] });
  firecrawlPrototype.findProperties = async () => ({ properties: [{ building_name: 'Test result', price: '₹50 L', location_address: 'Pune' }] });
  GitHubModelsProvider.prototype._call = async () => { calls.push('github'); return result; };
  NvidiaNimProvider.prototype._call = async () => { calls.push('nvidia'); return result; };
  try {
    const github = await request(testServer).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'HTTP GitHub', slug: 'http-github', modelId: 'test', provider: 'github', order: 0 });
    assert.equal(github.status, 201);
    const nvidia = await request(testServer).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'HTTP NVIDIA', slug: 'http-nvidia', modelId: 'test', provider: 'nvidia', isDefault: true, order: 1 });
    assert.equal(nvidia.status, 201);
    const defaultResult = await request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'DefaultTest', price: { max: 5000000 } });
    assert.equal(defaultResult.status, 200); assert.deepEqual(calls, ['nvidia']);
    const selectedResult = await request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'SelectedTest', model: 'http-github', price: { max: 5000000 } });
    assert.equal(selectedResult.status, 200); assert.deepEqual(calls, ['nvidia', 'github']);
    await request(testServer).put(`/api/admin/ai-models/${github.body.model._id}`).set('Authorization', adminAuth()).send({ isActive: false });
    const disabled = await request(testServer).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'DisabledTest', model: 'http-github', price: { max: 5000000 } });
    assert.equal(disabled.status, 400); assert.equal(calls.length, 2);
  } finally {
    firecrawlPrototype.findProperties = originalSearch;
    GitHubModelsProvider.prototype._call = originalGitHub;
    NvidiaNimProvider.prototype._call = originalNvidia;
    if (githubKey === undefined) delete process.env.GITHUB_MODELS_API_KEY; else process.env.GITHUB_MODELS_API_KEY = githubKey;
    if (nvidiaKey === undefined) delete process.env.NVIDIA_API_KEY; else process.env.NVIDIA_API_KEY = nvidiaKey;
  }
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
  assert.equal((await request(testServer).post('/api/form/submit').send({ name: {}, email: 'a@b.test', message: 'hello' })).status, 400);
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
