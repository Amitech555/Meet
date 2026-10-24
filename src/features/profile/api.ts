import { rpc } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { PublicProfile } from '@/features/auth/types';
import type { SessionSummary } from '@/features/sessions/types';

export type MySession = SessionSummary & { needs_checkin: boolean; needs_review: boolean };
export type RosterEntry = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: 'joined' | 'attended' | 'no_show';
  guest_count: number;
  is_host: boolean;
  my_review: { rating: number; tags: string[] } | null;
};
export type ReviewInput = { reviewed_id: string; rating: 1 | -1; tags: string[] };

export const getProfile = (id: string) => rpc<'get_profile', PublicProfile | null>('get_profile', { p_user_id: id });
export const mySessions = (kind: 'upcoming' | 'past' | 'hosting') => rpc<'my_sessions', MySession[]>('my_sessions', { p_kind: kind });
export const sessionRoster = (id: string) => rpc<'session_roster', RosterEntry[]>('session_roster', { p_session_id: id });
export const recordAttendance = (id: string, attended: string[]) => rpc('record_attendance', { p_session_id: id, p_attended: attended });
export const submitReviews = (id: string, reviews: ReviewInput[]) => rpc<'submit_reviews', number>('submit_reviews', { p_session_id: id, p_reviews: reviews });

export async function updateMyProfile(userId: string, patch: { display_name?: string; bio?: string | null; avatar_url?: string | null; locale?: 'fr' | 'en'; city_id?: number }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw toAppError(error);
}
