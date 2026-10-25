// Vérifie l'aperçu autonome dans des conditions proches de l'hébergement : chemin non racine,
// squelette HTML ajouté autour, CSP stricte (pas d'eval, aucun réseau externe).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const body = await readFile('dist-demo/partants-demo.html', 'utf8');
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}</style></head><body>${body}</body></html>`;
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'";
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': csp });
  res.end(page);
}).listen(0);
const url = `http://localhost:${server.address().port}/a/Zk3x9QpLm2/v1`;

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
const errors = [];
const run = async (name, scheme, fn) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, locale: 'fr-CA', timezoneId: 'America/Toronto' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`${name} console: ${m.text()}`));
  await p.goto(url, { waitUntil: 'load' });
  try {
    await fn(p);
  } catch (e) {
    await p.screenshot({ path: `screenshots/demo-failure-${name}.png` });
    throw e;
  } finally {
    await ctx.close();
  }
};
const step = (s) => console.log('✔', s);
try {
  await run('parcours', 'light', async (p) => {
    await p.getByText('On joue ce soir ?').waitFor({ timeout: 20000 });
    await p.screenshot({ path: 'screenshots/demo-onboarding.png' });
    step('démarre depuis un chemin non racine, onboarding affiché');
    await p.getByRole('button', { name: 'Passer' }).click();
    await p.getByText('À venir').waitFor({ timeout: 10000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: 'screenshots/demo-feed.png' });
    step('feed avec les données de démo');
    await p.getByRole('button', { name: /^Basket 3 contre 3/ }).first().click();
    await p.getByText('Quand', { exact: true }).waitFor();
    await p.getByRole('button', { name: 'Je suis partant' }).last().click();
    await p.getByRole('button', { name: 'Continuer avec un courriel' }).click();
    await p.getByLabel('Continuer avec un courriel').fill('lea@exemple.ca');
    await p.getByRole('button', { name: 'Continuer', exact: true }).click();
    await p.getByText('Démo : le code est 123456.').waitFor();
    await p.getByLabel('Code à 6 chiffres').fill('123456');
    await p.getByRole('button', { name: 'Valider le code' }).click();
    await p.getByLabel('Ton prénom (ou surnom)').fill('Léa');
    await p.getByLabel('Date de naissance').fill('19900512');
    await p.getByRole('checkbox').click();
    await p.getByRole('button', { name: 'Terminer' }).click();
    await p.getByRole('button', { name: 'Tu y es' }).last().waitFor({ timeout: 10000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: 'screenshots/demo-joined.png' });
    step('inscription par code 123456 → « Tu y es »');
    // Profil admin via la barre Démo
    await p.getByRole('button', { name: /^Je suis/ }).click();
    await p.getByRole('button', { name: 'Camille · admin, organisatrice' }).click();
    await p.waitForTimeout(800); // fermeture de la feuille
    await p.locator('[aria-label="Retour"]:visible').last().click();
    await p.getByRole('tab', { name: 'Profil' }).click();
    await p.getByRole('button', { name: 'Back-office' }).click();
    await p.getByText('Harcèlement ou propos déplacés').first().waitFor({ timeout: 10000 });
    await p.screenshot({ path: 'screenshots/demo-admin.png' });
    step('changement de profil (Camille) → back-office');
  });
  await run('sombre', 'dark', async (p) => {
    await p.getByText('On joue ce soir ?').waitFor({ timeout: 20000 });
    await p.getByRole('button', { name: 'Passer' }).click();
    await p.getByText('À venir').waitFor({ timeout: 10000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: 'screenshots/demo-feed-dark.png' });
    step('mode sombre');
  });
} catch (e) {
  console.error('ÉCHEC :', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
  const relevant = errors.filter((e) => !/favicon/.test(e));
  if (relevant.length) console.log('Erreurs JS/CSP :\n - ' + [...new Set(relevant)].slice(0, 10).join('\n - '));
  else console.log('Aucune erreur JS ni violation CSP');
}
