// npm run seed: fills an empty database with sample data, starting the local database if needed.
import { LOCAL_DB_PORT, appPath, isPortOpen, readEnv, run, startLocalDb, stopProcess, usesLocalDb, waitForPort } from './lib.mjs';

const env = readEnv('backend');
if (!env) {
  console.error('backend/.env.local is missing. Run "npm run setup" first.');
  process.exit(1);
}

let database;
try {
  if (usesLocalDb(env) && !await isPortOpen(LOCAL_DB_PORT)) {
    database = startLocalDb();
    if (!await waitForPort(LOCAL_DB_PORT, 300000, () => database.exitCode === null)) throw new Error('The local database did not start.');
  }
  await run(process.execPath, ['scripts/seed-demo.js', ...process.argv.slice(2)], { cwd: appPath('backend') });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stopProcess(database);
}
