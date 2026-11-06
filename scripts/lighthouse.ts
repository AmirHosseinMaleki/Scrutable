/**
 * pnpm lighthouse  (run `pnpm build` first)
 * Serves dist/ locally and runs Lighthouse's accessibility audits on every page,
 * on a phone-sized and a desktop-sized profile. Exits 1 if any accessibility audit fails.
 */
import { createServer } from 'node:http';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
if (!existsSync(dist)) {
  console.error('dist/ not found. Run `pnpm build` first.');
  process.exit(1);
}

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(dist, p);
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

const pages = readdirSync(dist, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('index.html'))
  .map((f) => `/${f.replace(/index\.html$/, '')}`)
  .sort();

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
let failures = 0;

for (const profile of ['mobile', 'desktop'] as const) {
  for (const page of pages) {
    const result = await lighthouse(
      `${base}${page}`,
      { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['accessibility'] },
      profile === 'desktop' ? desktopConfig : undefined,
    );
    const lhr = result!.lhr;
    const failed = Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 1 && lhr.categories.accessibility!.auditRefs.some((r) => r.id === a.id));
    const score = Math.round((lhr.categories.accessibility!.score ?? 0) * 100);
    console.log(`${failed.length === 0 ? 'ok  ' : 'FAIL'} ${profile.padEnd(7)} ${page.padEnd(32)} accessibility ${score}`);
    for (const a of failed) {
      failures += 1;
      console.log(`       - ${a.id}: ${a.title}`);
    }
  }
}

chrome.kill();
server.close();
console.log(failures === 0 ? '\nNo accessibility errors.' : `\n${failures} accessibility audit(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
