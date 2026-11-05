// npm run doctor: explains what is missing. Prints variable names and status, never values.
import { existsSync } from 'node:fs';
import { APPS, LOCAL_DB_PORT, appPath, isPortOpen, readEnv, usesLocalDb } from './lib.mjs';

let problems = 0;
const ok = message => console.log(`  ok    ${message}`);
const info = message => console.log(`  note  ${message}`);
const bad = message => { problems += 1; console.log(`  FIX   ${message}`); };
const filled = (env, name) => !!env?.[name] && !/^(your[_-]|<|xxx)/i.test(env[name]);

console.log('\nTools');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 12)) ok(`Node.js ${process.versions.node}`);
else bad(`Node.js ${process.versions.node} is too old. Install 22.12 or newer.`);

console.log('\nApps');
for (const app of APPS) {
  if (existsSync(appPath(app, 'node_modules'))) ok(`${app} dependencies installed`);
  else bad(`${app} dependencies missing. Run: npm run setup`);
  if (existsSync(appPath(app, '.env.local'))) ok(`${app}/.env.local exists`);
  else bad(`${app}/.env.local missing. Run: npm run setup`);
}

const backend = readEnv('backend');
const frontend = readEnv('frontend');
const admin = readEnv('admin');

console.log('\nRequired settings (backend/.env.local)');
for (const name of ['MONGO_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'WEBSITE_URL']) {
  if (filled(backend, name)) ok(name);
  else bad(`${name} is empty`);
}
if (usesLocalDb(backend)) info('Database: local, started for you by "npm run dev"');
else if (backend?.MONGO_URI) info('Database: remote. Check it is not a production database before testing.');

console.log('\nOptional features');
const feature = (name, names, without) => names.every(key => filled(backend, key))
  ? ok(name)
  : info(`${name} is off (${names.join(', ')}). ${without}`);
feature('Photo uploads', ['IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'], 'The site runs, but new photos cannot be uploaded.');
feature('Email', ['BREVO_API_KEY', 'EMAIL_USER'], 'Verification and reset links print in the API terminal.');
feature('AI analysis', ['NVIDIA_API_KEY'], 'AI Hub search stays unavailable.');

console.log('\nClients');
if (filled(frontend, 'VITE_API_BASE_URL')) ok('frontend VITE_API_BASE_URL');
else bad('frontend/.env.local needs VITE_API_BASE_URL=http://localhost:4000');
if (admin && admin.VITE_API_URL) info('admin VITE_API_URL is set. Leave it empty for local development.');
else if (admin) ok('admin uses the local API proxy');

console.log('\nPorts');
const ports = { 'API': Number(backend?.PORT) || 4000, 'Website': 5173, 'Admin': 5175, 'Local database': LOCAL_DB_PORT };
for (const [name, port] of Object.entries(ports)) {
  info(`${name} port ${port}: ${await isPortOpen(port) ? 'in use (fine if BuildEstate is already running)' : 'free'}`);
}

console.log(problems ? `\n${problems} thing(s) to fix.\n` : '\nEverything needed is ready. Run: npm run dev\n');
process.exitCode = problems ? 1 : 0;
