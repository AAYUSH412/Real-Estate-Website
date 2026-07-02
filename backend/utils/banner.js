// Terminal startup banner — dev only, skipped in production JSON log mode
const R = '\x1b[0m';
const B = '\x1b[1m';
const C = '\x1b[36m';   // cyan
const G = '\x1b[32m';   // green
const D = '\x1b[2m';    // dim

const WIDTH = 46;

function pad(str, total) {
  const visible = str.replace(/\x1b\[[0-9;]*m/g, '').length;
  return str + ' '.repeat(Math.max(0, total - visible));
}

export function printBanner({ port, env, db, imagekit, nvidia }) {
  if (process.env.NODE_ENV === 'production') return;

  const title = `${B}${C}BuildEstate API${R}  ${D}v1.0.0${R}`;
  const titleVisible = `BuildEstate API  v1.0.0`;
  const titlePad = Math.floor((WIDTH - titleVisible.length) / 2);
  const titleLine = ' '.repeat(titlePad) + title;

  const line = (label, value, ok) => {
    const tick = ok !== undefined ? (ok ? `${G}✓${R}` : `\x1b[31m✗${R}`) : '';
    const raw = `  ${D}◆${R} ${B}${label}${R}`;
    const padded = pad(raw, 22);
    return `${padded}${tick ? tick + ' ' : ''}${value}`;
  };

  const sep = `${D}${'─'.repeat(WIDTH)}${R}`;

  const t = new Date().toLocaleTimeString('en-IN', { hour12: false });

  const lines = [
    '',
    `${D}╔${'═'.repeat(WIDTH)}╗${R}`,
    `${D}║${R}${titleLine}${pad('', WIDTH - titlePad - titleVisible.length)}${D}║${R}`,
    `${D}╚${'═'.repeat(WIDTH)}╝${R}`,
    '',
    line('Environment', `${C}${env}${R}`),
    line('Port', `${C}0.0.0.0:${port}${R}`),
    line('Database', `${db ? `${G}connected${R}` : `\x1b[31mnot connected${R}`}`, db),
    line('ImageKit', `${imagekit ? `${G}connected${R}` : `\x1b[31mmissing keys${R}`}`, imagekit),
    line('NVIDIA NIM', `${nvidia ? `${G}key set${R}` : `\x1b[33mnot configured${R}`}`),
    line('Started', `${D}${t}${R}`),
    '',
    `  ${D}Crons  expire-listings 00:05 · auto-unsuspend 00:10${R}`,
    sep,
    '',
  ];

  process.stdout.write(lines.join('\n') + '\n');
}
