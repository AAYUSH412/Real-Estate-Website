// Local MongoDB replica set for development, so no Atlas account is needed to start.
// The first run downloads a MongoDB binary. Data stays in backend/.local-db between runs.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

export const LOCAL_DB_PORT = 27018;
const dbPath = fileURLToPath(new URL('../.local-db/', import.meta.url));
await mkdir(dbPath, { recursive: true });

console.log('Starting local MongoDB. The first run downloads it and can take a few minutes.');
const server = await MongoMemoryReplSet.create({
  replSet: { name: 'buildestate-local', count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ port: LOCAL_DB_PORT, dbPath, storageEngine: 'wiredTiger' }],
});
console.log(`Local MongoDB ready on port ${LOCAL_DB_PORT}`);

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
