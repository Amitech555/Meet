export type SessionLevel = 'all' | 'beginner' | 'intermediate' | 'advanced';
export type SessionStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type ParticipantStatus = 'joined' | 'waitlist' | 'cancelled' | 'no_show' | 'attended';
export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export type Category = {
  id: number;
  slug: string;
  name_fr: string;
  name_en: string;
  icon: string;
  tint: string;
  parent_id: number | null;
  sort: number;
};

export type PersonPreview = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type HostPreview = PersonPreview & {
  reliability: number | null; // 0–100, null = pas assez d'historique
  sessions_hosted: number;
  verified: boolean;
};

/** Forme renvoyée par la RPC `feed_sessions` / `get_session` (voir supabase/migrations). */
export type SessionSummary = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string; // ISO UTC
  ends_at: string;
  venue_name: string;
  address: string | null;
  lat: number;
  lng: number;
  distance_m: number | null;
  category: Pick<Category, 'id' | 'slug' | 'name_fr' | 'name_en' | 'icon' | 'tint'>;
  level: SessionLevel;
  price_cents: number;
  currency: string;
  min_players: number;
  max_players: number;
  joined_count: number;
  waitlist_count: number;
  cover_url: string | null;
  cover_blurhash: string | null;
  status: SessionStatus;
  cancellation_policy: CancellationPolicy;
  host: HostPreview;
  participants_preview: PersonPreview[];
  my_status: ParticipantStatus | null;
  group: { id: string; name: string } | null;
  series_id: string | null;
  recurrence_rule: string | null;
};

export function spotsLeft(s: Pick<SessionSummary, 'max_players' | 'joined_count'>): number {
  return Math.max(0, s.max_players - s.joined_count);
}

export function isFillingFast(s: Pick<SessionSummary, 'max_players' | 'joined_count'>): boolean {
  const left = spotsLeft(s);
  return left > 0 && left <= 3;
}
