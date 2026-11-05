// npm run dev: starts the API, website and admin in one terminal, plus the local database if used.
import { LOCAL_DB_PORT, appPath, isPortOpen, readEnv, startLabelled, startLocalDb, stopProcess, usesLocalDb, waitForPort } from './lib.mjs';

const env = readEnv('backend');
if (!env) {
  console.error('backend/.env.local is missing. Run "npm run setup" first.');
  process.exit(1);
}

const ports = { API: Number(env.PORT) || 4000, Website: 5173, Admin: 5175 };
const busy = [];
for (const [name, port] of Object.entries(ports)) if (await isPortOpen(port)) busy.push(`${name} port ${port}`);
if (busy.length) {
  console.error(`Already in use: ${busy.join(', ')}. Close whatever is using it, or stop the earlier "npm run dev".`);
  process.exit(1);
}

const children = [];
let stopping = false;
const stopAll = code => {
  if (stopping) return;
  stopping = true;
  children.forEach(stopProcess);
  setTimeout(() => process.exit(code), 1500);
};
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

const watch = (name, child) => {
  children.push(child);
  child.once('exit', code => {
    if (stopping) return;
    console.error(`${name} stopped (exit code ${code}). Stopping the others. "npm run doctor" can help find the cause.`);
    stopAll(1);
  });
  return child;
};

if (usesLocalDb(env) && !await isPortOpen(LOCAL_DB_PORT)) {
  const database = watch('Database', startLocalDb());
  if (!await waitForPort(LOCAL_DB_PORT, 300000, () => database.exitCode === null)) stopAll(1);
}

if (!stopping) {
  watch('API', startLabelled('api', '36', 'npm', ['run', 'dev'], { cwd: appPath('backend') }));
  watch('Website', startLabelled('website', '32', 'npm', ['run', 'dev'], { cwd: appPath('frontend') }));
  watch('Admin', startLabelled('admin', '33', 'npm', ['run', 'dev'], { cwd: appPath('admin') }));
  console.log('\nWebsite  http://localhost:5173\nAdmin    http://localhost:5175\nAPI      http://localhost:4000\nPress Ctrl+C to stop.\n');
}
