// Envoie les notifications en attente (notifications.pushed_at is null) via l'API Expo Push.
// Appelée chaque minute par pg_cron (voir migration 20261025000008). Accès : clé service uniquement.
import { inList, rest } from '../_shared/rest.ts';
import { log } from '../_shared/log.ts';

type Notif = { id: number; user_id: string; kind: string; session_id: string | null; payload: Record<string, string> };

const texts: Record<'fr' | 'en', Record<string, (p: Record<string, string>) => { title: string; body: string }>> = {
  fr: {
    reminder_24h: (p) => ({ title: 'Demain', body: `${p.title} à ${time(p.starts_at, 'fr')}` }),
    reminder_2h: (p) => ({ title: 'Dans 2 h', body: `${p.title} à ${p.venue}` }),
    spot_opened: (p) => ({ title: 'Une place s’est libérée', body: `${p.title} : elle est à toi.` }),
    session_cancelled: (p) => ({ title: 'Session annulée', body: p.reason ? `${p.title} — ${p.reason}` : p.title }),
    checkin: (p) => ({ title: 'Qui était là ?', body: `Fais l’appel pour ${p.title}` }),
    review_request: (p) => ({ title: 'Comment c’était ?', body: `Donne ton avis sur ${p.title}` }),
    new_from_followed: (p) => ({ title: `${p.host_name} a publié une session`, body: p.title }),
    priority_access: (p) => ({ title: 'Accès prioritaire', body: `${p.title} : tu peux t’inscrire avant tout le monde.` }),
  },
  en: {
    reminder_24h: (p) => ({ title: 'Tomorrow', body: `${p.title} at ${time(p.starts_at, 'en')}` }),
    reminder_2h: (p) => ({ title: 'In 2 hours', body: `${p.title} at ${p.venue}` }),
    spot_opened: (p) => ({ title: 'A spot opened up', body: `${p.title}: it's yours.` }),
    session_cancelled: (p) => ({ title: 'Session cancelled', body: p.reason ? `${p.title} — ${p.reason}` : p.title }),
    checkin: (p) => ({ title: 'Who showed up?', body: `Take attendance for ${p.title}` }),
    review_request: (p) => ({ title: 'How was it?', body: `Rate ${p.title}` }),
    new_from_followed: (p) => ({ title: `${p.host_name} posted a session`, body: p.title }),
    priority_access: (p) => ({ title: 'Priority access', body: `${p.title}: you can sign up before everyone else.` }),
  },
};

function time(iso: string | undefined, lang: 'fr' | 'en') {
  if (!iso) return '';
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(iso));
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) return new Response('forbidden', { status: 403 });

  const db = rest(serviceKey);
  let pending: Notif[];
  try {
    pending = await db.select<Notif>('notifications', 'select=id,user_id,kind,session_id,payload&pushed_at=is.null&order=created_at&limit=500');
  } catch (e) {
    log('error', 'push.fetch_failed', { error: String(e) });
    return new Response('error', { status: 500 });
  }
  if (!pending.length) return Response.json({ sent: 0 });

  const userIds = [...new Set(pending.map((n) => n.user_id))];
  const [tokens, profiles] = await Promise.all([
    db.select<{ token: string; user_id: string }>('push_tokens', `select=token,user_id&user_id=${inList(userIds)}`),
    db.select<{ id: string; locale: string }>('profiles', `select=id,locale&id=${inList(userIds)}`),
  ]);
  const localeOf = new Map(profiles.map((p) => [p.id, p.locale === 'en' ? 'en' : 'fr'] as const));

  const messages = pending.flatMap((n) => {
    const lang = localeOf.get(n.user_id) ?? 'fr';
    const make = texts[lang][n.kind];
    if (!make) return [];
    const { title, body } = make(n.payload ?? {});
    return tokens
      .filter((t) => t.user_id === n.user_id)
      .map((t) => ({ to: t.token, title, body, sound: 'default', data: { session_id: n.session_id, kind: n.kind }, _nid: n.id }));
  });

  let sent = 0;
  const dead: string[] = [];
  const failed = new Set<number>(); // notifications à réessayer à la prochaine minute
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}),
        },
        body: JSON.stringify(chunk.map(({ _nid, ...m }) => m)),
      });
      if (!res.ok) throw new Error(`expo ${res.status}`);
      const json = await res.json();
      (json.data ?? []).forEach((r: { status: string; details?: { error?: string } }, j: number) => {
        if (r.status === 'ok') sent++;
        else if (r.details?.error === 'DeviceNotRegistered') dead.push(chunk[j]!.to);
      });
    } catch (e) {
      chunk.forEach((m) => failed.add(m._nid));
      log('warn', 'push.chunk_failed', { error: String(e), size: chunk.length });
    }
  }

  if (dead.length) await db.remove('push_tokens', `token=${inList(dead)}`);
  // Sans jeton (pas d'appareil) ou envoyé : traité. Échec réseau : on réessaiera.
  const done = pending.map((n) => n.id).filter((id) => !failed.has(id));
  if (done.length) await db.update('notifications', `id=${inList(done)}`, { pushed_at: new Date().toISOString() });
  log('info', 'push.sent', { notifications: pending.length, messages: messages.length, sent, dead_tokens: dead.length, retry: failed.size });
  return Response.json({ sent });
});
