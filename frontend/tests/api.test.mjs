import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Execute the real TS API client with an injected build-time URL and no network.
const source = (await readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8'))
  .replace("from 'axios'", `from '${new URL('../node_modules/axios/index.js', import.meta.url).href}'`)
  .replaceAll('import.meta.env.VITE_API_BASE_URL', "'https://phase1.test'");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { location: { pathname: '/', href: '' }, dispatchEvent() {} };
const { default: client, appointmentsAPI, propertiesAPI, userListingsAPI } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
let requests;
beforeEach(() => {
  storage.clear(); requests = [];
  client.defaults.adapter = async config => {
    requests.push(config);
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
});

test('signed-in bookings use the auth endpoint and attach the latest access token', async () => {
  storage.set('buildestate_token', 'current-token');
  await appointmentsAPI.schedule({ propertyId: 'test', date: '2030-01-01', time: '10:00', name: 'Owner', email: 'owner@test', phone: '1234567890' });
  assert.equal(requests[0].url, '/appointments/schedule/auth');
  assert.equal(requests[0].headers.Authorization, 'Bearer current-token');
});

test('guest bookings keep the guest endpoint without an authorization header', async () => {
  await appointmentsAPI.schedule({ propertyId: 'test', date: '2030-01-01', time: '10:00', name: 'Guest', email: 'guest@test', phone: '1234567890' });
  assert.equal(requests[0].url, '/appointments/schedule');
  assert.equal(requests[0].headers.Authorization, undefined);
});

test('property and owner requests forward page/filter parameters rather than silently using page one', async () => {
  await propertiesAPI.getAll({ page: 3, location: 'Pune', type: 'Apartment', sort: 'price-low' });
  await userListingsAPI.getMyListings({ page: 4 });
  assert.deepEqual(requests[0].params, { page: 3, location: 'Pune', type: 'Apartment', sort: 'price-low' });
  assert.equal(requests[1].params.page, 4);
});

test('owner update preserves the FormData binary and explicit retained-image selection', async () => {
  const data = new FormData();
  data.append('retainedImages', JSON.stringify(['https://example.com/existing.png']));
  data.append('images', new Blob(['test-binary'], { type: 'image/png' }), 'new.png');
  await userListingsAPI.update('owned-id', data);
  assert.equal(requests[0].url, '/user/properties/owned-id');
  assert.equal(requests[0].data, data);
  assert.equal(await requests[0].data.get('images').text(), 'test-binary');
  assert.match(requests[0].headers.get('Content-Type'), /multipart\/form-data/);
});

test('appointment pagination and optimistic cancellation version reach the backend unchanged', async () => {
  await appointmentsAPI.getByUser({ page: 3, limit: 20, status: 'confirmed' });
  await appointmentsAPI.cancel('booking-id', 'Changed plans', 7);
  assert.deepEqual(requests[0].params, { page: 3, limit: 20, status: 'confirmed' });
  assert.deepEqual(JSON.parse(requests[1].data), { reason: 'Changed plans', expectedVersion: 7 });
});
