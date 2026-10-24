import { defaultSessionStart, wallParts, zonedWallTimeToUtc } from '@/lib/time';
import type { CancellationPolicy, SessionLevel, SessionSummary } from '@/features/sessions/types';

export type Recurrence = 'none' | 'weekly' | 'biweekly';

export type SessionDraft = {
  categoryId: number | null;
  title: string;
  description: string;
  startsAt: string; // ISO UTC
  durationMin: number;
  recurrence: Recurrence;
  venueName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  minPlayers: number;
  maxPlayers: number;
  level: SessionLevel;
  priceCents: number;
  cancellationPolicy: CancellationPolicy;
  coverUrl: string | null;
  groupId: string | null;
};

/** Valeurs par défaut intelligentes : prochain samedi 10 h, 8 places, gratuit, tous niveaux. */
export function defaultDraft(now: Date = new Date()): SessionDraft {
  return {
    categoryId: null,
    title: '',
    description: '',
    startsAt: defaultSessionStart(now),
    durationMin: 90,
    recurrence: 'none',
    venueName: '',
    address: '',
    lat: null,
    lng: null,
    minPlayers: 2,
    maxPlayers: 8,
    level: 'all',
    priceCents: 0,
    cancellationPolicy: 'flexible',
    coverUrl: null,
    groupId: null,
  };
}

/** « Refaire la même » : reprend tout d'une session passée, à la même heure le prochain jour équivalent. */
export function draftFromSession(s: SessionSummary, now: Date = new Date()): SessionDraft {
  const p = wallParts(s.starts_at);
  const start = new Date(s.starts_at);
  const week = 7 * 24 * 3600 * 1000;
  let next = start.getTime();
  while (next <= now.getTime() + 3600 * 1000) next += week;
  const n = wallParts(new Date(next).toISOString());
  return {
    categoryId: s.category.id,
    title: s.title,
    description: s.description ?? '',
    startsAt: zonedWallTimeToUtc(n.year, n.month, n.day, p.hours, p.minutes),
    durationMin: Math.round((new Date(s.ends_at).getTime() - start.getTime()) / 60000),
    recurrence: 'none',
    venueName: s.venue_name,
    address: s.address ?? '',
    lat: s.lat,
    lng: s.lng,
    minPlayers: s.min_players,
    maxPlayers: s.max_players,
    level: s.level,
    priceCents: s.price_cents,
    cancellationPolicy: s.cancellation_policy,
    coverUrl: s.cover_url,
    groupId: s.group?.id ?? null,
  };
}

export type DraftStep = 'what' | 'when' | 'where' | 'details';
export type DraftErrors = Partial<Record<'category' | 'title' | 'startsAt' | 'place' | 'players' | 'price', string>>;

/** Validation côté client (le serveur revalide tout dans create_session). Renvoie des clés i18n. */
export function validateDraft(d: SessionDraft, now: Date = new Date()): DraftErrors {
  const e: DraftErrors = {};
  if (!d.categoryId) e.category = 'create.activity';
  if (d.title.trim().length < 4) e.title = 'create.errorTitle';
  if (new Date(d.startsAt).getTime() <= now.getTime() + 15 * 60 * 1000) e.startsAt = 'create.errorPast';
  if (d.venueName.trim().length < 2 || d.lat == null || d.lng == null) e.place = 'create.errorPlace';
  if (d.minPlayers < 1 || d.maxPlayers < 2 || d.maxPlayers > 100 || d.maxPlayers < d.minPlayers) e.players = 'create.errorPlayers';
  if (d.priceCents !== 0 && (d.priceCents < 100 || d.priceCents > 50000)) e.price = 'create.errorPrice';
  return e;
}

export function stepOfError(e: DraftErrors): DraftStep | null {
  if (e.category || e.title) return 'what';
  if (e.startsAt) return 'when';
  if (e.place) return 'where';
  if (e.players || e.price) return 'details';
  return null;
}

export const recurrenceRule = (r: Recurrence) => (r === 'weekly' ? 'FREQ=WEEKLY' : r === 'biweekly' ? 'FREQ=WEEKLY;INTERVAL=2' : null);
