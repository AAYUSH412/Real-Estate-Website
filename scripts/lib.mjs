// Shared helpers for the root commands. Uses only Node so it works before any install.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const APPS = ['backend', 'frontend', 'admin'];
export const LOCAL_DB_PORT = 27018;
export const appPath = (...parts) => path.join(ROOT, ...parts);

export function readEnv(app) {
  const file = appPath(app, '.env.local');
  if (!existsSync(file)) return null;
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

// True when the backend is configured for the database started by these commands.
export const usesLocalDb = env => new RegExp(`^mongodb://(127\\.0\\.0\\.1|localhost):${LOCAL_DB_PORT}/`).test(env?.MONGO_URI || '');

export const isPortOpen = port => new Promise(resolve => {
  const hosts = ['127.0.0.1', '::1'];
  let pending = hosts.length;
  for (const host of hosts) {
    const socket = net.connect({ port, host, timeout: 800 });
    const done = open => {
      socket.destroy();
      if (open) resolve(true);
      else if (--pending === 0) resolve(false);
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  }
});

export async function waitForPort(port, timeoutMs, stillRunning = () => true) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && stillRunning()) {
    if (await isPortOpen(port)) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

const useShell = process.platform === 'win32';

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: useShell && command === 'npm', ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`)));
  });
}

// Starts a long-running process and prefixes its output, so three apps stay readable in one terminal.
export function startLabelled(label, color, command, args, options = {}) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell && command === 'npm', ...options });
  const prefix = `\x1b[${color}m${label.padEnd(8)}\x1b[0m| `;
  for (const stream of [child.stdout, child.stderr]) {
    let partial = '';
    stream.on('data', chunk => {
      const lines = (partial + chunk).split(/\r?\n/);
      partial = lines.pop();
      for (const line of lines) process.stdout.write(`${prefix}${line}\n`);
    });
  }
  return child;
}

export function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

export const startLocalDb = () => startLabelled('database', '35', process.execPath, ['scripts/local-db.js'], { cwd: appPath('backend') });
