// npm run smoke: proves the setup works by starting the API and checking real responses.
// Expects "npm run seed" to have run. Uses SMOKE_PORT (default 4100) so it never touches a running API.
import { LOCAL_DB_PORT, appPath, isPortOpen, readEnv, startLabelled, startLocalDb, stopProcess, usesLocalDb, waitForPort } from './lib.mjs';

const env = readEnv('backend');
if (!usesLocalDb(env)) {
  console.error('Smoke test only runs against the local database.');
  process.exit(1);
}
const port = Number(process.env.SMOKE_PORT) || 4100;
if (await isPortOpen(port)) {
  console.error(`Port ${port} is in use. Set SMOKE_PORT to a free port.`);
  process.exit(1);
}

const base = `http://127.0.0.1:${port}`;
const check = (name, passed, detail = '') => {
  if (!passed) throw new Error(`${name} failed ${detail}`);
  console.log(`ok  ${name}`);
};

let database, api;
try {
  if (!await isPortOpen(LOCAL_DB_PORT)) {
    database = startLocalDb();
    if (!await waitForPort(LOCAL_DB_PORT, 300000, () => database.exitCode === null)) throw new Error('The local database did not start.');
  }
  api = startLabelled('api', '36', process.execPath, ['server.js'], { cwd: appPath('backend'), env: { ...process.env, PORT: String(port) } });
  if (!await waitForPort(port, 60000, () => api.exitCode === null)) throw new Error('The API did not start.');

  const ready = await fetch(`${base}/health/ready`);
  check('database is ready', ready.ok, `(${ready.status})`);

  const listings = await (await fetch(`${base}/api/products/list`)).json();
  check('sample listings are returned', listings.properties?.length > 0);

  const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const admin = await post('/api/users/admin', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  check('admin can sign in', admin.ok, `(${admin.status})`);

  const demo = await post('/api/users/login', { email: 'demo@example.com', password: 'Demo12345!' });
  check('demo user can sign in', demo.ok, `(${demo.status})`);

  const signup = await post('/api/users/register', { name: 'Smoke Test', email: `smoke-${Date.now()}@buildestate.test`, password: 'Smoke12345!' });
  check('new users can register without an email service', (await signup.json()).verificationEmailSent === true);

  console.log('\nSmoke test passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stopProcess(api);
  stopProcess(database);
}
