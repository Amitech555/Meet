import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc';
import { useUserId } from '@/stores/auth';
import { pushPermissionStatus, registerForPush } from './push';

export type AppNotification = {
  id: number;
  kind: 'spot_opened' | 'session_cancelled' | 'reminder_24h' | 'reminder_2h' | 'checkin' | 'new_from_followed' | 'review_request' | 'priority_access';
  payload: Record<string, string>;
  created_at: string;
  read_at: string | null;
  session_id: string | null;
};

export function useNotifications() {
  const uid = useUserId();
  return useQuery({ queryKey: ['notifications', uid], enabled: !!uid, queryFn: () => rpc<'list_notifications', AppNotification[]>('list_notifications', { p_limit: 50 }) });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => rpc('mark_notifications_read'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

/** Où mène une notification. */
export function notificationTarget(kind: AppNotification['kind'], sessionId: string | null) {
  if (!sessionId) return null;
  if (kind === 'checkin') return { pathname: '/session/[id]/checkin', params: { id: sessionId } } as const;
  if (kind === 'review_request') return { pathname: '/session/[id]/review', params: { id: sessionId } } as const;
  return { pathname: '/session/[id]', params: { id: sessionId } } as const;
}

/** À la racine : un tap sur une notification système ouvre le bon écran ; jeton rafraîchi si déjà autorisé. */
export function usePushRouting() {
  const uid = useUserId();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as { session_id?: string; kind?: AppNotification['kind'] };
      const target = data.kind ? notificationTarget(data.kind, data.session_id ?? null) : null;
      if (target) router.push(target);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!uid) return;
    void pushPermissionStatus().then((s) => {
      if (s === 'granted') void registerForPush(uid);
    });
  }, [uid]);
}
