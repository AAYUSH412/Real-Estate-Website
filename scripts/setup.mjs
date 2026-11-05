// npm run setup: checks Node, creates missing .env.local files and installs all three apps.
// Existing .env.local files are never changed.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { APPS, appPath, run } from './lib.mjs';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`Node.js 22.12 or newer is required. You have ${process.versions.node}. Download it from https://nodejs.org`);
  process.exit(1);
}

for (const app of APPS) {
  const target = appPath(app, '.env.local');
  if (existsSync(target)) {
    console.log(`Keeping existing ${app}/.env.local`);
    continue;
  }
  copyFileSync(appPath(app, '.env.example'), target);
  console.log(`Created ${app}/.env.local`);
  if (app === 'backend') {
    const generated = readFileSync(target, 'utf8')
      .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString('hex')}`)
      .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${randomBytes(12).toString('hex')}`);
    writeFileSync(target, generated);
  }
}

for (const app of APPS) {
  console.log(`\nInstalling ${app} (this can take a minute)...`);
  await run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: appPath(app) });
}

console.log(`
Setup complete. Next:

  npm run seed     add sample listings and create the admin account
  npm run dev      start everything

Then open:
  Website  http://localhost:5173
  Admin    http://localhost:5175
`);
