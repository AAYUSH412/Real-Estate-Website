import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'test';
const backend = fileURLToPath(new URL('../', import.meta.url));
const { default: emailService } = await import('../services/emailService.js');

const withEnv = async (values, run) => {
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) value === undefined ? delete process.env[key] : process.env[key] = value;
  try { return await run(); } finally {
    for (const [key, value] of Object.entries(before)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
};
const noImageKit = { IMAGEKIT_PUBLIC_KEY: undefined, IMAGEKIT_PRIVATE_KEY: undefined, IMAGEKIT_URL_ENDPOINT: undefined };

test('missing ImageKit keys fail uploads clearly in development', () => withEnv({ ...noImageKit, NODE_ENV: 'development' }, async () => {
  const { default: imagekit } = await import('../config/imagekit.js?development');
  await assert.rejects(imagekit.upload({}), error => error.statusCode === 400 && error.code === 'IMAGEKIT_NOT_CONFIGURED');
}));

test('missing ImageKit keys still stop production', () => withEnv({ ...noImageKit, NODE_ENV: 'production' }, async () => {
  await assert.rejects(import('../config/imagekit.js?production'), /Missing IMAGEKIT_PUBLIC_KEY/);
}));

test('account links print locally only when Brevo is not configured', () => withEnv({ BREVO_API_KEY: undefined, NODE_ENV: 'development' }, async () => {
  const lines = [];
  const log = console.log;
  console.log = line => lines.push(line);
  try {
    const result = await emailService.sendEmailVerification('a@example.test', 'A', 'http://localhost:5173/verify-email/token');
    assert.equal(result.messageId, 'local-terminal');
    assert.ok(lines.join('').includes('/verify-email/token'));
  } finally { console.log = log; }
}));

test('production never prints account links', () => withEnv({ BREVO_API_KEY: undefined, NODE_ENV: 'production' }, () => {
  assert.equal(emailService.printLocalLink('Verify', 'a@example.test', 'http://x/token'), false);
}));

test('demo seed refuses production and remote databases before connecting', () => {
  const run = env => spawnSync(process.execPath, ['scripts/seed-demo.js'], { cwd: backend, encoding: 'utf8', timeout: 20000, env: { PATH: process.env.PATH, ...env } });
  const production = run({ NODE_ENV: 'production', MONGO_URI: 'mongodb://127.0.0.1:1/x' });
  assert.equal(production.status, 1);
  assert.match(production.stderr, /NODE_ENV is production/);
  const remote = run({ NODE_ENV: 'development', MONGO_URI: 'mongodb+srv://user:pass@example.invalid/x', ADMIN_EMAIL: 'a@example.test', ADMIN_PASSWORD: 'x' });
  assert.equal(remote.status, 1);
  assert.match(remote.stderr, /not a local database/);
});
