import { rpc } from '@/lib/rpc';
import type { SessionSummary } from '@/features/sessions/types';
import { recurrenceRule, type SessionDraft } from './draft';

export function createSession(d: SessionDraft) {
  return rpc<'create_session', string>('create_session', {
    p_category_id: d.categoryId!,
    p_title: d.title.trim(),
    p_description: d.description.trim(),
    p_starts_at: d.startsAt,
    p_duration_minutes: d.durationMin,
    p_venue_name: d.venueName.trim(),
    p_address: d.address.trim(),
    p_lat: d.lat!,
    p_lng: d.lng!,
    p_min_players: d.minPlayers,
    p_max_players: d.maxPlayers,
    p_level: d.level,
    p_price_cents: d.priceCents,
    p_cancellation_policy: d.cancellationPolicy,
    p_cover_url: d.coverUrl ?? undefined,
    p_recurrence_rule: recurrenceRule(d.recurrence) ?? undefined,
    p_group_id: d.groupId ?? undefined,
  });
}

export function fetchPastHosted() {
  return rpc<'my_past_hosted', SessionSummary[]>('my_past_hosted', { p_limit: 10 });
}

export type AdminGroup = { id: string; name: string };
