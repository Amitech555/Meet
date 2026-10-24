import { rpc } from '@/lib/rpc';
import { rangeFor } from '@/lib/time';
import type { FeedFilters } from '@/stores/prefs';
import type { LatLng } from '@/lib/geo';
import type { ParticipantStatus, SessionDetail, SessionSummary } from './types';

export const FEED_PAGE = 30;

export type FeedCursor = { starts_at: string; id: string } | null;

export function filtersToRange(date: FeedFilters['date']): { from?: string; to?: string } {
  if (date === 'any') return {};
  if (typeof date === 'object') return date;
  return rangeFor(date);
}

export async function fetchFeed(args: { cityId: number; filters: FeedFilters; position: LatLng | null; query?: string; cursor: FeedCursor; limit?: number }) {
  const { cityId, filters, position, query, cursor } = args;
  const range = filtersToRange(filters.date);
  return rpc<'feed_sessions', SessionSummary[]>('feed_sessions', {
    p_city_id: cityId,
    p_lat: position?.lat,
    p_lng: position?.lng,
    p_from: range.from,
    p_to: range.to,
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : undefined,
    p_price: filters.price,
    p_levels: filters.levels.length ? filters.levels : undefined,
    p_radius_m: filters.radiusKm && position ? filters.radiusKm * 1000 : undefined,
    p_query: query?.trim() || undefined,
    p_limit: args.limit ?? FEED_PAGE,
    p_cursor_starts_at: cursor?.starts_at,
    p_cursor_id: cursor?.id,
  });
}

export function fetchSession(id: string, position: LatLng | null) {
  return rpc<'get_session', SessionDetail | null>('get_session', { p_session_id: id, p_lat: position?.lat, p_lng: position?.lng });
}

export type JoinResult = { status: ParticipantStatus; position: number | null; places_taken: number };

export function joinSession(id: string, bringGuest = false) {
  return rpc<'join_session', JoinResult>('join_session', { p_session_id: id, p_bring_guest: bringGuest });
}

export function leaveSession(id: string) {
  return rpc<'leave_session', { status: 'cancelled'; places_taken: number }>('leave_session', { p_session_id: id });
}

export function joinSeries(seriesId: string) {
  return rpc<'join_series', number>('join_series', { p_series_id: seriesId });
}

export function setGuest(id: string, guest: boolean) {
  return rpc<'set_guest', { guest_count: number; places_taken: number }>('set_guest', { p_session_id: id, p_guest: guest });
}

export function cancelSession(id: string, reason?: string) {
  return rpc('cancel_session', { p_session_id: id, p_reason: reason?.trim() || undefined });
}
