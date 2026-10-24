// Page web légère de prévisualisation (Open Graph) pour les liens partagés :
//   https://partants.app/s/<session_id>  et  https://partants.app/g/<invite_code>
// + fichiers de liens universels (.well-known). Si l'app est installée, le système l'ouvre directement.
import { rest } from '../_shared/rest.ts';
import { log } from '../_shared/log.ts';

const APP_STORE = Deno.env.get('APP_STORE_URL') ?? 'https://apps.apple.com/ca/app/partants/id0000000000';
const PLAY_STORE = Deno.env.get('PLAY_STORE_URL') ?? 'https://play.google.com/store/apps/details?id=app.partants.mobile';
const DEFAULT_IMAGE = Deno.env.get('SHARE_DEFAULT_IMAGE') ?? 'https://partants.app/og-default.png';
const APPLE_TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? 'TEAMID';
const ANDROID_SHA256 = Deno.env.get('ANDROID_CERT_SHA256') ?? '';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function page(opts: { title: string; description: string; image: string; deepLink: string; url: string }) {
  const { title, description, image, deepLink, url } = opts;
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Partants</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Partants">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="apple-itunes-app" content="app-id=0000000000, app-argument=${esc(url)}">
<style>
body{margin:0;background:#FAF7F2;color:#14110F;font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif}
main{max-width:480px;margin:0 auto;padding:32px 16px}
.card{background:#fff;border:1px solid #E7E1D8;border-radius:20px;padding:24px}
h1{font-size:28px;line-height:32px;margin:0 0 8px}p{color:#6B645C;font-size:16px;line-height:22px}
a.btn{display:block;text-align:center;padding:16px;border-radius:999px;font-weight:700;text-decoration:none;margin-top:12px}
.primary{background:#FF4F1A;color:#14110F}.ghost{border:1px solid #E7E1D8;color:#14110F}
</style></head>
<body><main><div class="card">
<h1>${esc(title)}</h1><p>${esc(description)}</p>
<a class="btn primary" href="${esc(deepLink)}">Ouvrir dans Partants</a>
<a class="btn ghost" href="${APP_STORE}">App Store</a><a class="btn ghost" href="${PLAY_STORE}">Google Play</a>
</div></main></body></html>`;
}

const html = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/share/, '');

  if (path === '/.well-known/apple-app-site-association') {
    return Response.json({ applinks: { details: [{ appIDs: [`${APPLE_TEAM_ID}.app.partants.mobile`], components: [{ '/': '/s/*' }, { '/': '/g/*' }] }] } });
  }
  if (path === '/.well-known/assetlinks.json') {
    return Response.json([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'app.partants.mobile', sha256_cert_fingerprints: [ANDROID_SHA256] } }]);
  }

  const db = rest(Deno.env.get('SUPABASE_ANON_KEY')!);
  const publicUrl = `https://partants.app${path}`;

  const s = /^\/s\/([0-9a-f-]{36})$/.exec(path);
  if (s) {
    // deno-lint-ignore no-explicit-any
    const data = await db.rpc<any>('get_session', { p_session_id: s[1] });
    if (!data) return html(page({ title: 'Session introuvable', description: 'Cette session n’est plus disponible.', image: DEFAULT_IMAGE, deepLink: 'partants://', url: publicUrl }), 404);
    const when = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(data.starts_at));
    const left = Math.max(0, data.max_players - data.joined_count);
    const price = data.price_cents > 0 ? `${(data.price_cents / 100).toFixed(data.price_cents % 100 ? 2 : 0).replace('.', ',')} $` : 'Gratuit';
    log('info', 'share.view', { kind: 'session' });
    return html(page({
      title: data.title,
      description: `${when} · ${data.venue_name} · ${left > 0 ? `${left} place${left > 1 ? 's' : ''}` : 'Complet'} · ${price}`,
      image: data.cover_url ?? DEFAULT_IMAGE,
      deepLink: `partants://session/${s[1]}`,
      url: publicUrl,
    }));
  }

  const g = /^\/g\/([a-z0-9-]{4,40})$/.exec(path);
  if (g) {
    // deno-lint-ignore no-explicit-any
    const data = await db.rpc<any>('get_group', { p_invite_code: g[1] });
    if (!data) return html(page({ title: 'Groupe introuvable', description: 'Ce lien d’invitation n’est plus valide.', image: DEFAULT_IMAGE, deepLink: 'partants://', url: publicUrl }), 404);
    log('info', 'share.view', { kind: 'group' });
    return html(page({
      title: data.name,
      description: [data.rhythm_label, `${data.member_count} membres`].filter(Boolean).join(' · '),
      image: data.cover_url ?? DEFAULT_IMAGE,
      deepLink: `partants://g/${g[1]}`,
      url: publicUrl,
    }));
  }

  return html(page({ title: 'Partants', description: 'Trouve une activité ce soir à Montréal.', image: DEFAULT_IMAGE, deepLink: 'partants://', url: publicUrl }), 404);
});
