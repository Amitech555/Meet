import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProfile, mySessions, recordAttendance, sessionRoster, submitReviews, updateMyProfile, type ReviewInput } from './api';
import { useUserId } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';
import { track } from '@/lib/analytics';

export function useProfile(id: string | undefined) {
  return useQuery({ queryKey: ['profile', id], enabled: !!id, queryFn: () => getProfile(id!) });
}

export function useMySessions(kind: 'upcoming' | 'past' | 'hosting') {
  const uid = useUserId();
  return useQuery({ queryKey: ['my-sessions', kind, uid], enabled: !!uid, queryFn: () => mySessions(kind) });
}

export function useRoster(sessionId: string | undefined) {
  return useQuery({ queryKey: ['roster', sessionId], enabled: !!sessionId, queryFn: () => sessionRoster(sessionId!) });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    for (const k of ['my-sessions', 'roster', 'session', 'profile', 'me']) void qc.invalidateQueries({ queryKey: [k] });
  };
}

export function useRecordAttendance() {
  const { t } = useTranslation();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ sessionId, attended }: { sessionId: string; attended: string[] }) => recordAttendance(sessionId, attended),
    onSuccess: (_r, v) => {
      toast(t('review.checkinDone'));
      track('attendance_recorded', { attended: v.attended.length });
    },
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: invalidate,
  });
}

export function useSubmitReviews() {
  const { t } = useTranslation();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ sessionId, reviews }: { sessionId: string; reviews: ReviewInput[] }) => submitReviews(sessionId, reviews),
    onSuccess: (n) => {
      toast(t('review.thanks'), 'celebrate');
      track('review_submitted', { count: n });
    },
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: invalidate,
  });
}

export function useUpdateProfile() {
  const { t } = useTranslation();
  const uid = useUserId();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (patch: Parameters<typeof updateMyProfile>[1]) => updateMyProfile(uid!, patch),
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: invalidate,
  });
}
