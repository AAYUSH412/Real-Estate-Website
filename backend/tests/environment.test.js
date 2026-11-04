import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.NODE_ENV = 'test';
const { loadEnvironment } = await import('../config/environment.js');

test('environment loads local before defaults, preserves host values, and isolates tests/production', async () => {
 const directory = await mkdtemp(path.join(tmpdir(), 'buildestate-env-'));
 try {
  await writeFile(path.join(directory, '.env.local'), 'EMAIL_USER=local@example.test\nBREVO_API_KEY=local-test-key\n');
  await writeFile(path.join(directory, '.env'), 'EMAIL_USER=default@example.test\nFALLBACK_SETTING=default\n');
  const local = { NODE_ENV: 'development' }; loadEnvironment({ directory, env: local });
  assert.equal(local.EMAIL_USER, 'local@example.test'); assert.equal(local.BREVO_API_KEY, 'local-test-key'); assert.equal(local.FALLBACK_SETTING, 'default');
  const production = { NODE_ENV: 'production', EMAIL_USER: 'host@example.test', BREVO_API_KEY: 'host-test-key' }; loadEnvironment({ directory, env: production });
  assert.equal(production.EMAIL_USER, 'host@example.test'); assert.equal(production.BREVO_API_KEY, 'host-test-key');
  const isolated = { NODE_ENV: 'test' }; loadEnvironment({ directory, env: isolated }); assert.equal(isolated.EMAIL_USER, undefined);
 } finally { await rm(directory, { recursive: true, force: true }); }
});

test('email sender is read at send time and missing sender never silently uses an unverified fallback', async () => {
 const { default: axios } = await import('axios');
 const { default: email } = await import('../services/emailService.js');
 const old = { adapter: axios.defaults.adapter, sender: process.env.EMAIL_USER, key: process.env.BREVO_API_KEY };
 const payloads = []; process.env.BREVO_API_KEY = 'isolated-test-key';
 axios.defaults.adapter = async config => { payloads.push(JSON.parse(config.data)); return { data: { messageId: 'test-accepted' }, status: 201, headers: {}, config }; };
 try {
  process.env.EMAIL_USER = 'verified@example.test'; await email.sendPasswordResetEmail('recipient@example.test', 'https://example.test/reset/test');
  assert.equal(payloads[0].sender.email, 'verified@example.test');
  process.env.EMAIL_USER = 'changed@example.test'; await email.sendPasswordResetEmail('recipient@example.test', 'https://example.test/reset/test');
  assert.equal(payloads[1].sender.email, 'changed@example.test');
  delete process.env.EMAIL_USER; await assert.rejects(email.sendPasswordResetEmail('recipient@example.test', 'https://example.test/reset/test'), /Missing EMAIL_USER/); assert.equal(payloads.length, 2);
 } finally {
  axios.defaults.adapter = old.adapter;
  for (const [key,value] of [['EMAIL_USER',old.sender],['BREVO_API_KEY',old.key]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
 }
});
