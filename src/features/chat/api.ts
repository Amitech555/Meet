import { rpc } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { ChatMessage } from '@/features/sessions/types';

export type ThreadRef = { sessionId: string } | { groupId: string };

export const threadKey = (t: ThreadRef) => ['chat', 'sessionId' in t ? `s:${t.sessionId}` : `g:${t.groupId}`] as const;

export function listMessages(t: ThreadRef, before?: number) {
  return rpc<'list_messages', ChatMessage[]>('list_messages', {
    p_session_id: 'sessionId' in t ? t.sessionId : undefined,
    p_group_id: 'groupId' in t ? t.groupId : undefined,
    p_before: before,
    p_limit: 40,
  });
}

export async function sendMessage(t: ThreadRef, userId: string, body: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id: userId, body: body.trim(), session_id: 'sessionId' in t ? t.sessionId : null, group_id: 'groupId' in t ? t.groupId : null })
    .select('id, created_at')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export const deleteMessage = (id: number) => rpc('delete_message', { p_message_id: id });
