// Audit visuel : captures des écrans principaux depuis l'aperçu démo (dist-demo), sans serveur Supabase.
// Usage : npm run demo:build && node scripts/audit-screens.mjs [dossier]   (défaut : screenshots/audit)
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] ?? 'screenshots/audit';
const body = await readFile('dist-demo/partants-demo.html', 'utf8');
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style></head><body>${body}</body></html>`;
const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page);
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const SESSION = 'c3000000-0000-4000-8000-000000000001';
const GROUP = 'b2000000-0000-4000-8000-000000000002';
const viewports = {
  mobile: { width: 390, height: 844 },
  tablette: { width: 820, height: 1180 },
  desktop: { width: 1366, height: 900 },
};
// [nom, chemin, profil connecté ?, onboarding vu ?]
const screens = [
  ['onboarding', '/', null, false],
  ['feed', '/', null, true],
  ['detail', `/session/${SESSION}`, null, true],
  ['groupe', `/group/${GROUP}`, null, true],
  ['creer', '/create', 'Camille · admin, organisatrice', true],
  ['mes-sessions', '/sessions', 'Camille · admin, organisatrice', true],
  ['profil', '/profile', 'Camille · admin, organisatrice', true],
  ['tableau-de-bord', '/host', 'Camille · admin, organisatrice', true],
  ['connexion', '/auth', null, true],
  ['recherche-vide', '/search', null, true],
  ['styleguide', '/styleguide', null, true],
];
const plan = [
  ...screens.map((s) => ['mobile', 'light', ...s]),
  ...['onboarding', 'feed', 'detail', 'profil'].map((n) => ['mobile', 'dark', ...screens.find((s) => s[0] === n)]),
  ...['feed', 'detail'].flatMap((n) => ['tablette', 'desktop'].map((v) => [v, 'light', ...screens.find((s) => s[0] === n)])),
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const [vp, scheme, name, path, persona, onboarded] of plan) {
  const ctx = await browser.newContext({ viewport: viewports[vp], deviceScaleFactor: 1, colorScheme: scheme, locale: 'fr-CA', timezoneId: 'America/Toronto' });
  if (onboarded) await ctx.addInitScript(() => localStorage.setItem('partants-prefs', JSON.stringify({ state: { onboarded: true, cityId: 1, interests: [], theme: 'system', locale: 'fr', view: 'list', pushAsked: true }, version: 0 })));
  const p = await ctx.newPage();
  try {
    await p.goto(base + (persona ? '/' : path));
    await p.getByRole('button', { name: /^Je suis :/ }).waitFor({ timeout: 20000 });
    if (persona) {
      await p.getByRole('button', { name: /^Je suis :/ }).click();
      await p.getByRole('button', { name: persona }).click();
      await p.waitForTimeout(400);
      await p.evaluate((to) => window.history.pushState(null, '', to), path);
      await p.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
    }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/${vp}-${scheme}-${name}.png`, fullPage: false });
    console.log('✔', vp, scheme, name);
  } catch (e) {
    console.log('✘', vp, scheme, name, e.message.split('\n')[0]);
  } finally {
    await ctx.close();
  }
}
await browser.close();
server.close();
