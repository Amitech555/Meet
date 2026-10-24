// Parcours principal de bout en bout sur l'export web + Supabase local (+ Mailpit) :
// visiteur anonyme → session → « Je suis partant » → connexion par code courriel → 18+ → inscription automatique.
// Usage : npm run export:web && node scripts/e2e-web.mjs
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(process.cwd(), 'dist');
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SESSION_ID = 'c3000000-0000-4000-8000-000000000001'; // Basket au parc La Fontaine (seed)
const email = `e2e-${Date.now()}@partants.test`;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(root, url);
  if (!existsSync(file) || url.endsWith('/')) file = join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

async function waitForCode() {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json();
    const msg = list.messages?.[0];
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const code = /\b(\d{6})\b/.exec(full.Text ?? full.HTML ?? '')?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Aucun code reçu dans Mailpit');
}

const step = (n) => console.log(`✔ ${n}`);
await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-CA', timezoneId: 'America/Toronto' });
await ctx.addInitScript(() => {
  localStorage.setItem('partants-prefs', JSON.stringify({ state: { onboarded: true, cityId: 1, interests: [1, 2, 10], theme: 'system', view: 'list' }, version: 0 }));
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  const t0 = Date.now();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByText('À venir').waitFor({ timeout: 10000 });
  step(`feed chargé en ${Date.now() - t0} ms (sans compte)`);

  await page.goto(`${base}/session/${SESSION_ID}`, { waitUntil: 'networkidle' });
  await page.getByText('Basket 3 contre 3 au parc La Fontaine').first().waitFor();
  step('détail de session visible sans compte');

  await page.getByRole('button', { name: 'Je suis partant' }).last().click();
  await page.getByText('Connecte-toi pour réserver ta place').waitFor();
  step('connexion demandée seulement au moment de rejoindre');

  await page.getByRole('button', { name: 'Continuer avec un courriel' }).click();
  await page.getByLabel('Continuer avec un courriel').fill(email);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  const code = await waitForCode();
  step('code reçu par courriel');

  await page.getByLabel('Code à 6 chiffres').fill(code);
  await page.getByRole('button', { name: 'Valider le code' }).click();
  await page.getByText('Dernière étape').waitFor({ timeout: 10000 });
  step('code validé → dernière étape');

  await page.getByLabel('Ton prénom (ou surnom)').fill('Léa');
  await page.getByLabel('Date de naissance').fill('19900512');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Terminer' }).click();

  await page.getByRole('button', { name: 'Tu y es' }).last().waitFor({ timeout: 15000 });
  step('retour sur la session : inscription rejouée automatiquement → « Tu y es »');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/e2e-joined.png' });

  const row = execSync(
    `psql "${DB_URL}" -qAt -c "select sp.status from public.session_participants sp join auth.users u on u.id = sp.user_id where u.email = '${email}' and sp.session_id = '${SESSION_ID}'"`,
  ).toString().trim();
  if (row !== 'joined') throw new Error(`statut en base inattendu : ${row}`);
  step('base : participant « joined »');

  const birth = execSync(`psql "${DB_URL}" -qAt -c "select adult_confirmed_at is not null from public.profiles p join auth.users u on u.id = p.id where u.email = '${email}'"`).toString().trim();
  if (birth !== 't') throw new Error('18+ non confirmé');
  step('18+ confirmé, date de naissance non stockée');

  // Création d'une session (Quoi → Quand → Où → Détails)
  const tc = Date.now();
  await page.goto(`${base}/create`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Course & marche' }).first().click();
  await page.getByLabel('Titre').fill('Sortie e2e au canal');
  await page.screenshot({ path: 'screenshots/e2e-create-what.png' });
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: '19:00' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByLabel('Nom du lieu').fill('Marché Atwater');
  await page.getByLabel('Chercher une adresse').fill('atwater');
  await page.getByRole('button', { name: /Marché Atwater, 138/ }).click();
  await page.screenshot({ path: 'screenshots/e2e-create-where.png' });
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Publier la session' }).click();
  await page.getByText('Sortie e2e au canal').first().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Gérer' }).last().waitFor();
  step(`session créée et publiée en ${Math.round((Date.now() - tc) / 1000)} s (organisateur inscrit d'office)`);
  await page.screenshot({ path: 'screenshots/e2e-created.png' });
  const created = execSync(`psql "${DB_URL}" -qAt -c "select places_taken || '/' || max_players from public.sessions s join auth.users u on u.id = s.host_id where u.email = '${email}'"`).toString().trim();
  if (created !== '1/8') throw new Error(`session créée inattendue : ${created}`);
  step('base : session 1/8 (valeurs par défaut : 8 places)');


  // Groupe : rejoindre « Course Griffintown du mardi » puis discuter en temps réel avec l'organisateur (Karim)
  await page.goto(`${base}/groups`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Course Griffintown du mardi/ }).first().click();
  await page.getByRole('button', { name: 'Rejoindre le groupe' }).click();
  await page.getByRole('button', { name: 'Discussion' }).waitFor({ timeout: 10000 });
  step('groupe rejoint');

  // Karim, connecté dans un autre navigateur, ouvre le chat du groupe
  const { createClient } = createRequire(import.meta.url)(join(process.cwd(), 'node_modules/@supabase/supabase-js'));
  const env = Object.fromEntries((await readFile('.env', 'utf8')).split('\n').filter(Boolean).map((l) => l.split('=')));
  const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const { data: karim } = await sb.auth.signInWithPassword({ email: 'demo+karim@partants.app', password: 'partants-demo' });
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-CA', timezoneId: 'America/Toronto' });
  await ctx2.addInitScript((session) => {
    localStorage.setItem('partants-prefs', JSON.stringify({ state: { onboarded: true, cityId: 1, interests: [], theme: 'system', view: 'list' }, version: 0 }));
    localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
  }, karim.session);
  const page2 = await ctx2.newPage();
  await page2.goto(`${base}/group/b2000000-0000-4000-8000-000000000001`, { waitUntil: 'networkidle' });
  await page2.getByRole('button', { name: 'Discussion' }).click();
  await page2.getByText('Bienvenue aux nouveaux').waitFor({ timeout: 10000 });

  await page.getByRole('button', { name: 'Discussion' }).click();
  await page.getByLabel('Écris un message').fill('Salut, je viens mardi pour la première fois');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await page2.getByText('Salut, je viens mardi pour la première fois').waitFor({ timeout: 10000 });
  step('message reçu en direct par un autre membre (Realtime + RLS)');
  await page2.screenshot({ path: 'screenshots/e2e-group-chat.png' });
  await ctx2.close();

  console.log('\nPARCOURS PRINCIPAL OK');
} catch (e) {
  await page.screenshot({ path: 'screenshots/e2e-failure.png' });
  console.error('ÉCHEC :', e.message);
  if (errors.length) console.error('Erreurs JS :', errors);
  process.exitCode = 1;
} finally {
  execSync(`psql "${DB_URL}" -qAt -c "delete from public.messages where user_id in (select id from auth.users where email = '${email}');"`);
  execSync(`psql "${DB_URL}" -qAt -c "delete from public.sessions where host_id in (select id from auth.users where email = '${email}'); delete from auth.users where email = '${email}'"`);
  await browser.close();
  server.close();
}
