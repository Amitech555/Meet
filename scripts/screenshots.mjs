// Captures d'écran de contrôle visuel : petit écran (iPhone SE), grand écran, mode sombre.
// Usage : npm run export:web && node scripts/screenshots.mjs /styleguide /  [--full]
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';

// Playwright est préinstallé globalement dans l'environnement CI/cloud ; sinon : npm i -D playwright
const { chromium } = createRequire(import.meta.url)('playwright');

const root = join(process.cwd(), 'dist');
const outDir = join(process.cwd(), 'screenshots');
const args = process.argv.slice(2);
const full = args.includes('--full');
const onboarded = args.includes('--onboarded');
const routes = args.filter((a) => a.startsWith('/'));
if (routes.length === 0) routes.push('/');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(root, url);
  if (!existsSync(file) || url.endsWith('/')) file = join(root, 'index.html'); // SPA
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const port = server.address().port;

const devices = [
  { name: 'se', viewport: { width: 375, height: 667 }, scheme: 'light' },
  { name: 'large', viewport: { width: 430, height: 932 }, scheme: 'light' },
  { name: 'dark', viewport: { width: 390, height: 844 }, scheme: 'dark' },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const d of devices) {
  const ctx = await browser.newContext({ viewport: full ? { width: d.viewport.width, height: 4200 } : d.viewport, deviceScaleFactor: 2, colorScheme: d.scheme, locale: 'fr-CA', timezoneId: 'America/Toronto', isMobile: true, hasTouch: true });
  if (onboarded) {
    // Préférences persistées comme après l'onboarding (Montréal + 3 intérêts)
    await ctx.addInitScript(() => {
      localStorage.setItem('partants-prefs', JSON.stringify({ state: { onboarded: true, cityId: 1, interests: [1, 2, 10], theme: 'system', view: 'list' }, version: 0 }));
    });
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${d.name} ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${d.name} console: ${m.text()}`));
  for (const r of routes) {
    await page.goto(`http://localhost:${port}${r}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const slug = r === '/' ? 'home' : r.replace(/^\//, '').replace(/[/?=&]/g, '_');
    const path = join(outDir, `${slug}--${d.name}.png`);
    await page.screenshot({ path, fullPage: false });
    console.log('📸', path);
  }
  await ctx.close();
}
await browser.close();
server.close();
if (errors.length) {
  console.log('\nErreurs JS :');
  for (const e of [...new Set(errors)]) console.log(' -', e);
}
