import axios from 'axios';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { location: { pathname: '/', href: '' }, dispatchEvent() {}, addEventListener() {} };
const constantsSource = (await readFile(new URL('../src/config/constants.js', import.meta.url), 'utf8')).replaceAll('import.meta.env.VITE_BACKEND_URL', "'https://contract.test'");
const constantsURL = `data:text/javascript;base64,${Buffer.from(constantsSource).toString('base64')}`;
const clientSource = (await readFile(new URL('../src/services/apiClient.js', import.meta.url), 'utf8'))
  .replace("from '@buildestate/contracts'", `from '${new URL('../../shared/contracts/index.js', import.meta.url).href}'`)
  .replace("from 'axios'", `from '${new URL('../node_modules/axios/index.js', import.meta.url).href}'`)
  .replace("from '../config/constants'", `from '${constantsURL}'`);
const clientURL = `data:text/javascript;base64,${Buffer.from(clientSource).toString('base64')}`;
const { default: client } = await import(clientURL);
const domainSource = (await readFile(new URL('../src/services/domainAPI.js', import.meta.url), 'utf8'))
  .replace("from './apiClient.js'", `from '${clientURL}'`)
  .replace("from '@buildestate/contracts'", `from '${new URL('../../shared/contracts/index.js', import.meta.url).href}'`);
const { listingReviewAPI } = await import(`data:text/javascript;base64,${Buffer.from(domainSource).toString('base64')}`);
const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
const freshToken = jwt(Math.floor(Date.now() / 1000) + 3600);
let requests;
beforeEach(() => {
  requests = []; storage.clear();
  client.defaults.adapter = async config => { requests.push(config); return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config }; };
});
test('admin review includes the version displayed to the reviewer and uses the latest token', async () => {
  storage.set('token', freshToken);
  const record = { _id: 'a'.repeat(24), version: 3 };
  await listingReviewAPI.approve(record);
  await listingReviewAPI.reject(record, ' Needs photos ');
  assert.equal(requests[0].headers.Authorization, `Bearer ${freshToken}`);
  assert.equal(requests[0].url, `/api/admin/properties/${record._id}/approve`);
  assert.deepEqual(JSON.parse(requests[0].data), { expectedVersion: 3 });
  assert.deepEqual(JSON.parse(requests[1].data), { expectedVersion: 3, reason: 'Needs photos' });
});
test('invalid review commands are rejected before HTTP', () => {
  assert.throws(() => listingReviewAPI.approve({ _id: 'a'.repeat(24) }));
  assert.throws(() => listingReviewAPI.reject({ version: 0 }, ''));
  assert.equal(requests.length, 0);
});


test('expired stored admin tokens refresh once before parallel protected requests', async () => {
  storage.set('token', jwt(1));
  const previous = axios.defaults.adapter;
  let refreshes = 0;
  axios.defaults.adapter = async config => {
    refreshes++;
    return { data: { success: true, token: freshToken }, status: 200, statusText: 'OK', headers: {}, config };
  };
  try {
    await Promise.all([client.get('/api/admin/session'), client.get('/api/admin/properties')]);
    assert.equal(refreshes, 1);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.headers.Authorization === `Bearer ${freshToken}`));
  } finally { axios.defaults.adapter = previous; }
});

test('temporary refresh failure preserves the stored session for retry', async () => {
  const expired = jwt(1); storage.set('token', expired);
  const previous = axios.defaults.adapter;
  axios.defaults.adapter = async config => { throw { config, response: { status: 503 } }; };
  try {
    await assert.rejects(client.get('/api/admin/session'));
    assert.equal(storage.get('token'), expired); assert.equal(requests.length, 0);
  } finally { axios.defaults.adapter = previous; }
});

test('reactive refresh outage after a protected 401 preserves credentials and permits retry', async () => {
  storage.set('token', freshToken);
  const previous = axios.defaults.adapter;
  client.defaults.adapter = async config => { throw { config, response: { status: 401 } }; };
  axios.defaults.adapter = async config => { throw { config, response: { status: 503 } }; };
  try {
    await assert.rejects(client.get('/api/admin/session'), error => error.response.status === 503);
    assert.equal(storage.get('token'), freshToken);
  } finally { axios.defaults.adapter = previous; }
});
