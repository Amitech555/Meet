import { rpc } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { env } from '@/lib/env';
import type { GroupCard, GroupDetail } from './types';

export const groupInviteUrl = (code: string) => `${env.shareBaseUrl}/g/${code}`;

export const listGroups = (cityId: number, scope: 'mine' | 'discover') =>
  rpc<'list_groups', GroupCard[]>('list_groups', { p_city_id: cityId, p_scope: scope });

export const getGroup = (args: { id?: string; code?: string }) =>
  rpc<'get_group', GroupDetail | null>('get_group', { p_group_id: args.id, p_invite_code: args.code });

export const joinGroup = (args: { id?: string; code?: string }) => rpc<'join_group', string>('join_group', { p_group_id: args.id, p_invite_code: args.code });

export const leaveGroup = (id: string) => rpc('leave_group', { p_group_id: id });

export async function createGroup(input: { ownerId: string; name: string; description: string; categoryId: number; cityId: number; rhythm: string; visibility: 'public' | 'private' }) {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      owner_id: input.ownerId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      category_id: input.categoryId,
      city_id: input.cityId,
      rhythm_label: input.rhythm.trim() || null,
      visibility: input.visibility,
    })
    .select('id')
    .single();
  if (error) throw toAppError(error);
  return data.id;
}

export async function setFollowGroup(userId: string, groupId: string, follow: boolean) {
  const { error } = follow
    ? await supabase.from('follows').insert({ follower_id: userId, group_id: groupId })
    : await supabase.from('follows').delete().match({ follower_id: userId, group_id: groupId });
  if (error && error.code !== '23505') throw toAppError(error);
}

export async function setFollowHost(userId: string, hostId: string, follow: boolean) {
  const { error } = follow
    ? await supabase.from('follows').insert({ follower_id: userId, host_id: hostId })
    : await supabase.from('follows').delete().match({ follower_id: userId, host_id: hostId });
  if (error && error.code !== '23505') throw toAppError(error);
}

export type GroupMember = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  trusted: boolean;
  is_owner: boolean;
  sessions_attended: number;
  reliability: number | null;
};

export const groupMembers = (groupId: string) => rpc<'group_members_list', GroupMember[]>('group_members_list', { p_group_id: groupId });

export const setGroupMember = (groupId: string, userId: string, patch: { role?: 'admin' | 'member'; trusted?: boolean }) =>
  rpc('set_group_member', { p_group_id: groupId, p_user_id: userId, p_role: patch.role, p_trusted: patch.trusted });

export const setPriorityWindow = (sessionId: string, hours: number) => rpc('set_priority_window', { p_session_id: sessionId, p_hours: hours });
