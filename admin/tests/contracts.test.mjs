import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { location: { pathname: '/', href: '' }, dispatchEvent() {} };
const constantsSource = (await readFile(new URL('../src/config/constants.js', import.meta.url), 'utf8')).replaceAll('import.meta.env.VITE_BACKEND_URL', "'https://contract.test'");
const constantsURL = `data:text/javascript;base64,${Buffer.from(constantsSource).toString('base64')}`;
const clientSource = (await readFile(new URL('../src/services/apiClient.js', import.meta.url), 'utf8'))
  .replace("from 'axios'", `from '${new URL('../node_modules/axios/index.js', import.meta.url).href}'`)
  .replace("from '../config/constants'", `from '${constantsURL}'`);
const clientURL = `data:text/javascript;base64,${Buffer.from(clientSource).toString('base64')}`;
const { default: client } = await import(clientURL);
const domainSource = (await readFile(new URL('../src/services/domainAPI.js', import.meta.url), 'utf8'))
  .replace("from './apiClient.js'", `from '${clientURL}'`)
  .replace("from '@buildestate/contracts'", `from '${new URL('../../shared/contracts/index.js', import.meta.url).href}'`);
const { listingReviewAPI } = await import(`data:text/javascript;base64,${Buffer.from(domainSource).toString('base64')}`);
let requests;
beforeEach(() => {
  requests = []; storage.clear();
  client.defaults.adapter = async config => { requests.push(config); return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config }; };
});
test('admin review includes the version displayed to the reviewer and uses the latest token', async () => {
  storage.set('token', 'fresh-token');
  const record = { _id: 'a'.repeat(24), version: 3 };
  await listingReviewAPI.approve(record);
  await listingReviewAPI.reject(record, ' Needs photos ');
  assert.equal(requests[0].headers.Authorization, 'Bearer fresh-token');
  assert.equal(requests[0].url, `/api/admin/properties/${record._id}/approve`);
  assert.deepEqual(JSON.parse(requests[0].data), { expectedVersion: 3 });
  assert.deepEqual(JSON.parse(requests[1].data), { expectedVersion: 3, reason: 'Needs photos' });
});
test('invalid review commands are rejected before HTTP', () => {
  assert.throws(() => listingReviewAPI.approve({ _id: 'a'.repeat(24) }));
  assert.throws(() => listingReviewAPI.reject({ version: 0 }, ''));
  assert.equal(requests.length, 0);
});
