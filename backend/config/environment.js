import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDirectory = fileURLToPath(new URL('../', import.meta.url));
// ESM imports run before server.js's body. Every eager config reader must import
// this module first. Shell/Azure variables win; local overrides .env defaults.
export function loadEnvironment({ directory = backendDirectory, env = process.env } = {}) {
  if (env.NODE_ENV === 'test') return;
  if (env.NODE_ENV !== 'production') dotenv.config({ path: path.join(directory, '.env.local'), processEnv: env, quiet: true });
  dotenv.config({ path: path.join(directory, '.env'), processEnv: env, quiet: true });
}
loadEnvironment();
