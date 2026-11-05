// npm run check:docs: fails when a Markdown file links to a missing file, image or heading.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, appPath } from './lib.mjs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(file => file && existsSync(appPath(file)) && !file.startsWith('docs/history/') && !file.includes('.agents/'));

const withoutCode = text => text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
const slug = heading => heading.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
const headings = file => new Set([...withoutCode(readFileSync(appPath(file), 'utf8')).matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => slug(match[1])));

const broken = [];
for (const file of files) {
  const text = withoutCode(readFileSync(appPath(file), 'utf8'));
  const targets = [...text.matchAll(/\]\(([^)\s]+)/g), ...text.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1]);
  for (const target of targets) {
    if (/^(https?:|mailto:)/.test(target)) continue;
    const [link, anchor] = target.split('#');
    const resolved = link ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURI(link))) : file;
    if (!existsSync(appPath(resolved))) broken.push(`${file} -> ${target}`);
    else if (anchor && resolved.endsWith('.md') && !headings(resolved).has(anchor)) broken.push(`${file} -> ${target} (no such heading)`);
  }
}

if (broken.length) {
  console.error(`Broken links:\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
console.log(`Checked ${files.length} Markdown files. All links work.`);
