import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap, { escapeXml } from '../api/sitemap.js';
import { createQueryCache } from '../../shared/contracts/queryCache.js';

test('sitemap follows the canonical property payload across all pages and fails closed on dependency errors', async () => {
  const original = globalThis.fetch;
  const urls = [];
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
  globalThis.fetch = async url => { urls.push(url); return { ok: true, json: async () => ({ property: [{ _id: (urls.length === 1 ? 'a' : 'b').repeat(24) }], pagination: { hasNextPage: urls.length === 1 } }) }; };
  try {
    await sitemap({}, res);
    assert.equal(urls.length, 2); assert.equal(res.code, 200);
    assert.ok(res.body.includes(`/property/${'a'.repeat(24)}`)); assert.ok(res.body.includes(`/property/${'b'.repeat(24)}`));
    assert.equal(escapeXml('<&"\''), '&lt;&amp;&quot;&apos;');
    globalThis.fetch = async () => { throw new Error('Offline'); };
    await sitemap({}, res); assert.equal(res.code, 503); assert.equal(res.headers['Cache-Control'], 'no-store');
  } finally { globalThis.fetch = original; }
});

test('query cache coalesces requests, isolates caller cancellation, invalidates mutations and retries failures', async () => {
  const cache = createQueryCache(); let calls = 0; let resolve;
  const fetcher = () => { calls++; return new Promise(done => { resolve = done; }); };
  const controller = new AbortController();
  const first = cache.get('property', fetcher, controller.signal);
  const second = cache.get('property', fetcher);
  controller.abort(); await assert.rejects(first, { name: 'AbortError' });
  resolve('home'); assert.equal(await second, 'home'); assert.equal(calls, 1);
  assert.equal(await cache.get('property', fetcher), 'home');
  cache.clear(); assert.equal(await cache.get('property', async () => 'updated'), 'updated');
  await assert.rejects(cache.get('failure', async () => { throw new Error('Offline'); }));
  assert.equal(await cache.get('failure', async () => 'recovered'), 'recovered');
});
