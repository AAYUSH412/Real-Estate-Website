import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Never load server.js or connectdb: this suite owns an ephemeral database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'phase1-isolated-test-secret';
process.env.ADMIN_EMAIL = 'admin@phase1.test';
process.env.IMAGEKIT_PUBLIC_KEY = 'test-placeholder';
process.env.IMAGEKIT_PRIVATE_KEY = 'test-placeholder';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
process.env.RATE_LIMIT_STORE_PATH = path.join(tmpdir(), `buildestate-tests-${process.pid}`);
process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(tmpdir(), 'buildestate-mongo-binaries');

const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: mongoose } = await import('mongoose');
const { default: express } = await import('express');
const { default: cookieParser } = await import('cookie-parser');
const { default: request } = await import('supertest');
const { default: jwt } = await import('jsonwebtoken');
const { default: bcrypt } = await import('bcryptjs');
const { default: User, Admin } = await import('../models/userModel.js');
const { default: Property } = await import('../models/propertyModel.js');
const { default: Appointment } = await import('../models/appointmentModel.js');
const { default: AIModel } = await import('../models/aiModelModel.js');
const { default: imagekit } = await import('../config/imagekit.js');
const { default: email } = await import('../services/emailService.js');
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
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', propertyRoutes);
app.use((error, req, res, next) => {
  res.status(error.status || error.statusCode || (error.name === 'MulterError' ? 400 : 500)).json({ success: false, message: error.message });
});

let mongo, owner, other, adminToken, passwordHash;
let uploads = [], removed = [];
const password = 'Phase1-password!';
const auth = user => `Bearer ${jwt.sign({ id: user._id, sv: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
const adminAuth = () => `Bearer ${adminToken}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5qkAAAAASUVORK5CYII=', 'base64');
const fields = { title: 'Phase 1 home', location: 'Pune', price: 5000000, beds: 2, baths: 2, sqft: 1000,
  type: 'Flat', availability: 'For Sale', description: 'Test listing', phone: '+919999999999', amenities: ['Parking', 'Gym'] };
const property = overrides => Property.create({ ...fields, image: ['https://example.com/old.jpg'], ...overrides });
const cookieFrom = response => response.headers['set-cookie'].find(c => c.startsWith('user_refresh=')).split(';')[0];
async function session(user = owner, rememberMe = false) {
  const res = await request(app).post('/api/users/login').send({ email: user.email, password, rememberMe });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { token: `Bearer ${res.body.token}`, cookie: cookieFrom(res), response: res };
}

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { dbName: 'phase1' } });
  await mongoose.connect(mongo.getUri());
  passwordHash = await bcrypt.hash(password, 4);
  await Admin.create({ email: process.env.ADMIN_EMAIL, password });
  adminToken = jwt.sign({ email: process.env.ADMIN_EMAIL }, process.env.JWT_SECRET);
}, { timeout: 180000 });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Property.deleteMany({}), Appointment.deleteMany({})]);
  owner = await User.create({ name: 'Owner', email: 'owner@phase1.test', password: passwordHash, isEmailVerified: true });
  other = await User.create({ name: 'Other', email: 'other@phase1.test', password: passwordHash, isEmailVerified: true });
  uploads = []; removed = [];
  imagekit.upload = async options => {
    const id = `image-${uploads.length + 1}`;
    uploads.push(options);
    return { url: `https://example.com/${id}.png`, fileId: id };
  };
  imagekit.deleteFile = async id => { removed.push(id); };
});
after(async () => { await mongoose.disconnect(); await mongo?.stop(); });

test('ban revokes old access and refresh credentials; login stays blocked after ban', async () => {
  const old = await session();
  const res = await request(app).put(`/api/admin/users/${owner.id}/ban`).set('Authorization', adminAuth()).send({ reason: 'Test ban' });
  assert.equal(res.status, 200);
  assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 403);
  assert.equal((await request(app).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  assert.equal((await request(app).post('/api/users/login').send({ email: owner.email, password })).status, 403);
  await request(app).put(`/api/admin/users/${owner.id}/unban`).set('Authorization', adminAuth()).send({});
  assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 401);
});

test('suspension blocks old access, and an expired suspension allows a fresh login', async () => {
  const old = await session();
  const res = await request(app).put(`/api/admin/users/${owner.id}/suspend`).set('Authorization', adminAuth()).send({ reason: 'Test suspension', days: 1 });
  assert.equal(res.status, 200);
  assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 403);
  await User.updateOne({ _id: owner._id }, { suspendedUntil: new Date(Date.now() - 1000) });
  const fresh = await session();
  assert.equal((await request(app).get('/api/users/me').set('Authorization', fresh.token)).status, 200);
  assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 401);
});

test('bulk ban and bulk suspension revoke refresh and access tokens', async () => {
  for (const action of ['bulk-ban', 'bulk-suspend']) {
    await User.updateOne({ _id: owner._id }, { status: 'active' });
    const old = await session();
    const res = await request(app).post(`/api/admin/users/${action}`).set('Authorization', adminAuth()).send({ userIds: [owner.id], reason: 'Test bulk', days: 1 });
    assert.equal(res.status, 200);
    assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 403);
    assert.equal((await request(app).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  }
});

test('password reset atomically consumes reset token and revokes existing sessions', async () => {
  const old = await session();
  let resetUrl;
  email.sendPasswordResetEmail = async (to, url) => { resetUrl = url; };
  await request(app).post('/api/users/forgot').send({ email: owner.email });
  const resetToken = resetUrl.split('/').pop();
  const res = await request(app).post(`/api/users/reset/${resetToken}`).send({ password: 'New-password-123' });
  assert.equal(res.status, 200);
  assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 401);
  assert.equal((await request(app).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
  assert.equal((await request(app).post(`/api/users/reset/${resetToken}`).send({ password: 'Another-password' })).status, 400);
});

test('profile password change revokes old JWT and refresh credentials', async () => {
  const old = await session();
  const res = await request(app).put('/api/users/me').set('Authorization', old.token).send({ currentPassword: password, newPassword: 'Changed-password-123' });
  assert.equal(res.status, 200); assert.equal(res.body.sessionRevoked, true);
  assert.equal((await request(app).get('/api/users/me').set('Authorization', old.token)).status, 401);
  assert.equal((await request(app).post('/api/users/refresh').set('Cookie', old.cookie)).status, 401);
});

test('refresh rotation accepts an old cookie once and preserves remembered lifetime', async () => {
  const old = await session(owner, true);
  const results = await Promise.all([1, 2].map(() => request(app).post('/api/users/refresh').set('Cookie', old.cookie)));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
  assert.match(results.find(r => r.status === 200).headers['set-cookie'][0], /Max-Age=2592000/);
});

test('safe profile/admin/appointment DTOs exclude all credential hashes', async () => {
  const old = await session();
  await User.updateOne({ _id: owner._id }, { resetToken: 'secret-reset', emailVerificationToken: 'secret-verification' });
  const res = await request(app).get('/api/users/me').set('Authorization', old.token);
  for (const key of ['password', 'resetToken', 'emailVerificationToken', 'userRefreshTokenHash', 'sessionVersion', 'lockUntil']) assert.equal(res.body[key], undefined);
  const users = await request(app).get('/api/admin/users').set('Authorization', adminAuth());
  assert.equal(users.body.users.find(u => u._id === owner.id).userRefreshTokenHash, undefined);
  const p = await property();
  const apt = await Appointment.create({ propertyId: p.id, userId: owner.id, date: '2030-01-01', time: '10:00' });
  const changed = await request(app).put('/api/appointments/status').set('Authorization', adminAuth()).send({ appointmentId: apt.id, status: 'confirmed' });
  assert.equal(changed.body.appointment.userId.password, undefined);
  assert.equal(changed.body.appointment.userId.resetToken, undefined);
});

test('guest and unrelated user appointments cannot be cancelled or rated', async () => {
  const p = await property();
  for (const guest of [true, false]) {
    const apt = await Appointment.create({ propertyId: p.id, ...(guest ? { guestInfo: { email: 'guest@phase1.test' } } : { userId: owner.id }), date: '2030-01-01', time: '10:00' });
    assert.equal((await request(app).put(`/api/appointments/cancel/${apt.id}`).set('Authorization', auth(other)).send({})).status, 403);
    assert.equal((await request(app).put(`/api/appointments/feedback/${apt.id}`).set('Authorization', auth(other)).send({ rating: 5 })).status, 403);
    assert.equal((await Appointment.findById(apt.id)).status, 'pending');
  }
});

test('authenticated booking is visible to its owner and cancellable only by that owner', async () => {
  const p = await property();
  const res = await request(app).post('/api/appointments/schedule/auth').set('Authorization', auth(owner)).send({ propertyId: p.id, date: '2030-01-01', time: '10:00' });
  assert.equal(res.status, 201);
  const list = await request(app).get('/api/appointments/user').set('Authorization', auth(owner));
  assert.equal(list.body.appointments[0]._id, res.body.appointment._id);
  assert.equal((await request(app).put(`/api/appointments/cancel/${res.body.appointment._id}`).set('Authorization', auth(owner)).send({})).status, 200);
});

test('multipart admin text-only edit retains images, explicit removal/replacement respects selection', async () => {
  const p = await property({ image: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] });
  const text = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('title', 'Edited title');
  assert.equal(text.status, 200); assert.deepEqual(text.body.property.image, p.image);
  const change = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id)
    .field('retainedImages', JSON.stringify([p.image[1]])).attach('image1', png, 'test.png');
  assert.equal(change.status, 200); assert.deepEqual(change.body.property.image, [p.image[1], 'https://example.com/image-1.png']);
  const empty = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('retainedImages', '[]');
  assert.equal(empty.status, 400);
  assert.equal((await Property.findById(p.id)).image.length, 2);
});

test('bad listing metadata or spoofed image bytes never upload to CDN', async () => {
  const p = await property();
  const invalid = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).field('price', '-1').attach('image1', png, 'test.png');
  assert.equal(invalid.status, 400); assert.equal(uploads.length, 0);
  const spoof = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).attach('image1', Buffer.from('not-png'), 'fake.png');
  assert.equal(spoof.status, 400); assert.equal(uploads.length, 0);
});

test('partial CDN failure and persistence failure compensate successful uploads', async () => {
  const p = await property();
  imagekit.upload = async options => {
    uploads.push(options);
    if (options.fileName === 'fail.png') throw new Error('Test upload failure');
    return { url: 'https://example.com/new.png', fileId: 'rollback-asset' };
  };
  const res = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id).attach('image1', png, 'ok.png').attach('image2', png, 'fail.png');
  assert.equal(res.status, 500); assert.deepEqual(removed, ['rollback-asset']);
  assert.deepEqual((await Property.findById(p.id)).image, p.image);
  removed = [];
  p.save = async () => { throw new Error('Test persistence failure'); };
  await assert.rejects(saveListing({ body: {}, existing: p, files: [{ buffer: png, mimetype: 'image/png', originalname: 'ok.png' }] }));
  assert.deepEqual(removed, ['rollback-asset']);
});

test('owner-only detail/edit loads rejected listings; strangers cannot upload or edit them', async () => {
  const p = await property({ status: 'rejected', postedBy: owner.id });
  assert.equal((await request(app).get(`/api/products/single/${p.id}`)).status, 404);
  assert.equal((await request(app).get(`/api/user/properties/${p.id}`).set('Authorization', auth(owner))).status, 200);
  assert.equal((await request(app).get(`/api/user/properties/${p.id}`).set('Authorization', auth(other))).status, 404);
  const denied = await request(app).put(`/api/user/properties/${p.id}`).set('Authorization', auth(other)).attach('images', png, 'test.png');
  assert.equal(denied.status, 404); assert.equal(uploads.length, 0);
  const edited = await request(app).put(`/api/user/properties/${p.id}`).set('Authorization', auth(owner)).field('title', 'Corrected listing');
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
      let req = request(app).get(`${url}?page=${page}`);
      if (header) req = req.set('Authorization', header);
      const res = await req;
      assert.equal(res.status, 200); assert.equal(res.body.pagination.totalProperties, total);
      res.body[key].forEach(p => seen.add(p._id));
    }
    assert.equal(seen.size, total, url);
  }
  const filtered = await request(app).get('/api/products/list?availability=buy&type=Apartment&search=Active&sort=price-low');
  assert.equal(filtered.body.pagination.totalProperties, 27);
  const summary = await request(app).get('/api/user/properties?limit=1').set('Authorization', auth(owner));
  assert.equal(summary.body.statusCounts.active, 27); assert.equal(summary.body.statusCounts.pending, 18);
});

test('pagination caps invalid/unbounded sizes and public queries exclude expired-by-time listings', async () => {
  assert.deepEqual(pagination({ limit: -1, page: 'bad' }), { page: 1, limit: 20, skip: 0 });
  assert.equal(pagination({ limit: 999999 }).limit, 100);
  const p = await property({ expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request(app).get(`/api/products/single/${p.id}`)).status, 404);
  assert.equal((await request(app).get('/api/products/list')).body.property.length, 0);
  assert.equal((await request(app).get(`/api/admin/properties/${p.id}`).set('Authorization', adminAuth())).status, 200);
});

test('AI model create/update persists provider and all-disabled models stay disabled', async () => {
  await AIModel.deleteMany({});
  const created = await request(app).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'GitHub test', slug: 'github-test', modelId: 'test-id', provider: 'github' });
  assert.equal(created.status, 201); assert.equal(created.body.model.provider, 'github');
  const update = await request(app).put(`/api/admin/ai-models/${created.body.model._id}`).set('Authorization', adminAuth()).send({ isActive: false });
  assert.equal(update.status, 200);
  assert.deepEqual(await resolveModelsByProvider(), { github: [], nvidia: [] });
  assert.equal(await AIModel.countDocuments(), 1);
  await request(app).delete(`/api/admin/ai-models/${created.body.model._id}`).set('Authorization', adminAuth());
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
    const github = await request(app).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'HTTP GitHub', slug: 'http-github', modelId: 'test', provider: 'github', order: 0 });
    assert.equal(github.status, 201);
    const nvidia = await request(app).post('/api/admin/ai-models').set('Authorization', adminAuth()).send({ name: 'HTTP NVIDIA', slug: 'http-nvidia', modelId: 'test', provider: 'nvidia', isDefault: true, order: 1 });
    assert.equal(nvidia.status, 201);
    const defaultResult = await request(app).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'DefaultTest', price: { max: 5000000 } });
    assert.equal(defaultResult.status, 200); assert.deepEqual(calls, ['nvidia']);
    const selectedResult = await request(app).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'SelectedTest', model: 'http-github', price: { max: 5000000 } });
    assert.equal(selectedResult.status, 200); assert.deepEqual(calls, ['nvidia', 'github']);
    await request(app).put(`/api/admin/ai-models/${github.body.model._id}`).set('Authorization', adminAuth()).send({ isActive: false });
    const disabled = await request(app).post('/api/ai/search').set('X-Firecrawl-Key', 'test-only-firecrawl').send({ city: 'DisabledTest', model: 'http-github', price: { max: 5000000 } });
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
  const res = await request(app).post('/api/products/update').set('Authorization', adminAuth()).field('id', p.id)
    .field('retainedImages', JSON.stringify([p.image[1]]));
  assert.equal(res.status, 200); assert.deepEqual(removed, ['asset-a']);
  assert.deepEqual((await Property.findById(p.id)).image, ['https://example.com/b.jpg']);
});
