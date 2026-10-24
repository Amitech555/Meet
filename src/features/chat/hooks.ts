import { useEffect, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { deleteMessage, listMessages, sendMessage, threadKey, type ThreadRef } from './api';
import type { ChatMessage, PersonPreview } from '@/features/sessions/types';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';
import { track } from '@/lib/analytics';

export function useMessages(t: ThreadRef) {
  return useQuery({ queryKey: threadKey(t), queryFn: () => listMessages(t) });
}

/** Nouveaux messages en direct ; l'auteur est retrouvé dans le fil, sinon on recharge. */
export function useChatRealtime(t: ThreadRef) {
  const qc = useQueryClient();
  const instance = useId();
  const key = threadKey(t);
  const filter = 'sessionId' in t ? `session_id=eq.${t.sessionId}` : `group_id=eq.${t.groupId}`;
  const keyStr = key.join(':');
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel(`chat:${keyStr}:${instance}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (payload) => {
        const row = payload.new as { id: number; body: string; created_at: string; user_id: string | null };
        const current = qc.getQueryData<ChatMessage[]>(key) ?? [];
        if (current.some((m) => m.id === row.id)) return;
        const author = current.find((m) => m.user_id === row.user_id)?.author;
        if (row.user_id && !author) {
          void qc.invalidateQueries({ queryKey: key });
          return;
        }
        qc.setQueryData<ChatMessage[]>(key, [...current.filter((m) => m.id > 0 || m.body !== row.body), { ...row, author: author ?? null }]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clé stable dérivée de keyStr
  }, [keyStr, filter, instance, qc]);
}

let tempId = -1;

export function useSendMessage(t: ThreadRef, me: PersonPreview | null) {
  const qc = useQueryClient();
  const { t: tr } = useTranslation();
  const key = threadKey(t);
  return useMutation({
    mutationFn: (body: string) => sendMessage(t, me!.id, body),
    onMutate: (body) => {
      const optimistic: ChatMessage = { id: tempId--, body: body.trim(), created_at: new Date().toISOString(), user_id: me?.id ?? null, author: me };
      qc.setQueryData<ChatMessage[]>(key, (cur) => [...(cur ?? []), optimistic]);
      return optimistic.id;
    },
    onSuccess: (row, _body, optimisticId) => {
      qc.setQueryData<ChatMessage[]>(key, (cur) => {
        const list = cur ?? [];
        // Le message a pu arriver par Realtime avant la réponse : on évite le doublon
        if (list.some((m) => m.id === row.id)) return list.filter((m) => m.id !== optimisticId);
        return list.map((m) => (m.id === optimisticId ? { ...m, id: row.id, created_at: row.created_at } : m));
      });
      track('message_sent', { thread: 'sessionId' in t ? 'session' : 'group' });
    },
    onError: (e, _body, optimisticId) => {
      qc.setQueryData<ChatMessage[]>(key, (cur) => (cur ?? []).filter((m) => m.id !== optimisticId));
      toast(errorMessage(e, tr), 'error');
    },
  });
}

export function useDeleteMessage(t: ThreadRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: (_r, id) => qc.setQueryData<ChatMessage[]>(threadKey(t), (cur) => (cur ?? []).map((m) => (m.id === id ? { ...m, deleted: true } : m))),
  });
}
