import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';

export type ReportTarget = 'user' | 'session' | 'group' | 'message';
export type ReportReason = 'spam' | 'harassment' | 'unsafe' | 'fake' | 'dating' | 'other';

export async function report(reporterId: string, targetType: ReportTarget, targetId: string, reason: ReportReason, details?: string) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details?.trim() || null,
  });
  if (error) throw toAppError(error);
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw toAppError(error);
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocks').delete().match({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw toAppError(error);
}
