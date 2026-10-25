/**
 * Mode démo (aperçu web sans serveur) : une base en mémoire chargée depuis un instantané
 * de la base Supabase locale (`scripts/demo-snapshot.sh`). Les dates sont décalées d'un nombre
 * entier de jours pour que « ce soir » reste ce soir et que les heures murales soient conservées.
 */
import snapshot from './snapshot.json';

export type Row = Record<string, any>;

export type DemoDb = {
  cities: Row[];
  categories: Row[];
  profiles: Row[];
  user_interests: Row[];
  groups: Row[];
  group_members: Row[];
  sessions: Row[];
  session_participants: Row[];
  messages: Row[];
  reviews: Row[];
  reports: Row[];
  follows: Row[];
  notifications: Row[];
  blocks: Row[];
  saved_sessions: Row[];
  push_tokens: Row[];
};

const DATE_KEYS = new Set([
  'created_at', 'updated_at', 'starts_at', 'ends_at', 'joined_at', 'priority_until', 'adult_confirmed_at',
  'terms_accepted_at', 'phone_verified_at', 'read_at', 'pushed_at', 'deleted_at',
]);

const DAY = 24 * 3600 * 1000;

function shiftDates(rows: Row[], deltaMs: number): Row[] {
  return rows.map((r) => {
    const out: Row = { ...r };
    for (const k of Object.keys(out)) {
      if (DATE_KEYS.has(k) && typeof out[k] === 'string') out[k] = new Date(new Date(out[k]).getTime() + deltaMs).toISOString();
    }
    return out;
  });
}

export function loadDb(now = Date.now()): DemoDb {
  const snap = snapshot as unknown as Record<string, any>;
  const delta = Math.round((now - new Date(snap.snapshot_at).getTime()) / DAY) * DAY;
  const t = (k: string) => shiftDates((snap[k] as Row[] | null) ?? [], delta);
  const db: DemoDb = {
    cities: t('cities'),
    categories: t('categories'),
    profiles: t('profiles'),
    user_interests: t('user_interests'),
    groups: t('groups'),
    group_members: t('group_members'),
    sessions: t('sessions'),
    session_participants: t('session_participants'),
    messages: t('messages'),
    reviews: t('reviews'),
    reports: t('reports'),
    follows: t('follows'),
    notifications: [],
    blocks: [],
    saved_sessions: [],
    push_tokens: [],
  };
  // La fenêtre prioritaire de démo reste ouverte 12 h à partir de l'affichage
  for (const s of db.sessions) if (s.priority_until) s.priority_until = new Date(now + 12 * 3600 * 1000).toISOString();
  return db;
}

let seq = 1_000_000;
export const nextId = () => ++seq;
export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
