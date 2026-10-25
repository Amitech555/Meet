import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cancelSession, mySavedSessions, setSaved, fetchFeed, fetchSession, joinSeries, joinSession, leaveSession, setGuest, FEED_PAGE, type FeedCursor } from './api';
import { restoreSnapshot, updateSessionEverywhere } from './cache';
import { optimisticJoin, optimisticLeave, reconcileJoin } from './optimistic';
import type { SessionSummary , SessionDetail } from './types';
import { useCities, MONTREAL_SLUG } from '@/features/catalog/hooks';
import { useUserId } from '@/stores/auth';
import { useMe } from '@/features/auth/hooks';
import { usePrefs, type FeedFilters } from '@/stores/prefs';
import { useLocationStore } from '@/stores/location';
import { toast } from '@/stores/toast';
import { usePushPromptStore } from '@/stores/pushPrompt';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { track, trackDuration } from '@/lib/analytics';

/** Ville courante : préférence, sinon Montréal. */
export function useCityId(): number | null {
  const cityId = usePrefs((s) => s.cityId);
  const cities = useCities();
  return cityId ?? cities.data?.find((c) => c.slug === MONTREAL_SLUG)?.id ?? null;
}

export function useFeed(filters: FeedFilters, query = '') {
  const cityId = useCityId();
  const position = useLocationStore((s) => s.position);
  return useInfiniteQuery({
    queryKey: ['feed', cityId, filters, query, position ? [position.lat.toFixed(2), position.lng.toFixed(2)] : null],
    enabled: cityId != null,
    initialPageParam: null as FeedCursor,
    queryFn: async ({ pageParam }) => {
      const started = Date.now();
      const rows = await fetchFeed({ cityId: cityId!, filters, position, query, cursor: pageParam });
      if (!pageParam) trackDuration('feed_loaded', started, { count: rows.length });
      return rows;
    },
    getNextPageParam: (last) => {
      const tail = last.at(-1);
      return last.length === FEED_PAGE && tail ? { starts_at: tail.starts_at, id: tail.id } : undefined;
    },
  });
}

export const sessionKey = (id: string) => ['session', id] as const;

export function useSession(id: string | undefined) {
  const position = useLocationStore((s) => s.position);
  return useQuery({
    queryKey: sessionKey(id ?? ''),
    enabled: !!id,
    // Places et droits changent vite : le cache (y compris hors-ligne) sert à l'affichage immédiat, on revalide toujours
    refetchOnMount: 'always',
    queryFn: () => fetchSession(id!, position),
  });
}

function invalidateAfterChange(qc: ReturnType<typeof useQueryClient>, id: string) {
  void qc.invalidateQueries({ queryKey: sessionKey(id) });
  void qc.invalidateQueries({ queryKey: ['my-sessions'] });
}

/** Rejoindre : mise à jour optimiste instantanée partout, rollback + message humain si échec. */
export function useJoinSession() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const me = useMe().data;
  return useMutation({
    mutationFn: ({ session, guest }: { session: SessionSummary; guest?: boolean }) => joinSession(session.id, guest),
    onMutate: async ({ session, guest }) => {
      await qc.cancelQueries({ queryKey: sessionKey(session.id) });
      const person = me ? { id: me.id, display_name: me.display_name, avatar_url: me.avatar_url } : null;
      return updateSessionEverywhere(qc, session.id, (s) => optimisticJoin(s, person, guest));
    },
    onError: (e, _vars, snapshot) => {
      if (snapshot) restoreSnapshot(qc, snapshot);
      haptics.error();
      toast(errorMessage(e, t), 'error');
    },
    onSuccess: (res, { session }) => {
      updateSessionEverywhere(qc, session.id, (s) => reconcileJoin(s, res.status, res.places_taken));
      if (res.status === 'joined') {
        toast(t('session.joinedToast'), 'celebrate');
        usePushPromptStore.getState().maybeOpen();
        track('session_joined', { category: session.category.slug, price_cents: session.price_cents });
      } else {
        toast(t('session.waitlistToast'));
        track('session_waitlisted', { category: session.category.slug });
      }
    },
    onSettled: (_r, _e, { session }) => invalidateAfterChange(qc, session.id),
  });
}

export function useLeaveSession() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const me = useMe().data;
  return useMutation({
    mutationFn: ({ session }: { session: SessionSummary; guestCount?: number }) => leaveSession(session.id),
    onMutate: async ({ session, guestCount }) => {
      await qc.cancelQueries({ queryKey: sessionKey(session.id) });
      return updateSessionEverywhere(qc, session.id, (s) => optimisticLeave(s, me?.id ?? null, guestCount ?? 0));
    },
    onError: (e, _v, snapshot) => {
      if (snapshot) restoreSnapshot(qc, snapshot);
      toast(errorMessage(e, t), 'error');
    },
    onSuccess: (_r, { session }) => {
      toast(t('session.leftToast'));
      track('session_left', { category: session.category.slug });
    },
    onSettled: (_r, _e, { session }) => invalidateAfterChange(qc, session.id),
  });
}

export function useJoinSeries() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (seriesId: string) => joinSeries(seriesId),
    onSuccess: () => {
      toast(t('session.joinedToast'), 'celebrate');
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['session'] });
      void qc.invalidateQueries({ queryKey: ['my-sessions'] });
    },
    onError: (e) => toast(errorMessage(e, t), 'error'),
  });
}

export function useSetGuest() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ session, guest }: { session: SessionSummary; guest: boolean }) => setGuest(session.id, guest),
    onSuccess: (res, { session }) => updateSessionEverywhere(qc, session.id, (s) => ({ ...s, joined_count: res.places_taken })),
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: (_r, _e, { session }) => invalidateAfterChange(qc, session.id),
  });
}

export function useCancelSession() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ session, reason }: { session: SessionSummary; reason?: string }) => cancelSession(session.id, reason),
    onSuccess: (_r, { session }) => {
      updateSessionEverywhere(qc, session.id, (s) => ({ ...s, status: 'cancelled' }));
      track('session_cancelled', { category: session.category.slug });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: (_r, _e, { session }) => invalidateAfterChange(qc, session.id),
  });
}

export function useSavedSessions() {
  const uid = useUserId();
  return useQuery({ queryKey: ['my-sessions', 'saved', uid], enabled: !!uid, queryFn: mySavedSessions });
}

/** Favori : bascule optimiste sur le détail, liste rafraîchie. */
export function useToggleSaved() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const uid = useUserId();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => setSaved(uid!, id, saved),
    onMutate: ({ id, saved }) => {
      const prev = qc.getQueryData<SessionDetail | null>(sessionKey(id));
      if (prev) qc.setQueryData(sessionKey(id), { ...prev, is_saved: saved });
      return prev;
    },
    onSuccess: (_r, { saved }) => toast(saved ? t('session.saved') : t('session.save')),
    onError: (e, { id }, prev) => {
      if (prev) qc.setQueryData(sessionKey(id), prev);
      toast(errorMessage(e, t), 'error');
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['my-sessions', 'saved'] }),
  });
}
