import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getGroup, joinGroup, leaveGroup, listGroups, setFollowGroup } from './api';
import { useCityId } from '@/features/sessions/hooks';
import { useUserId } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';
import { track } from '@/lib/analytics';

export function useGroups(scope: 'mine' | 'discover') {
  const cityId = useCityId();
  const uid = useUserId();
  return useQuery({
    queryKey: ['group', 'list', scope, cityId, uid],
    enabled: cityId != null && (scope === 'discover' || !!uid),
    queryFn: () => listGroups(cityId!, scope),
  });
}

export function useGroup(args: { id?: string; code?: string }) {
  const uid = useUserId();
  return useQuery({
    queryKey: ['group', 'detail', args.id ?? null, args.code ?? null, uid],
    enabled: !!(args.id || args.code),
    queryFn: () => getGroup(args),
  });
}

function useInvalidateGroups() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['group'] });
    void qc.invalidateQueries({ queryKey: ['feed'] });
  };
}

export function useJoinGroup() {
  const { t } = useTranslation();
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: joinGroup,
    onSuccess: () => {
      toast(t('groups.joinedToast'), 'celebrate');
      track('group_joined');
    },
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: invalidate,
  });
}

export function useLeaveGroup() {
  const { t } = useTranslation();
  const invalidate = useInvalidateGroups();
  return useMutation({ mutationFn: leaveGroup, onError: (e) => toast(errorMessage(e, t), 'error'), onSettled: invalidate });
}

export function useFollowGroup() {
  const { t } = useTranslation();
  const uid = useUserId();
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: ({ groupId, follow }: { groupId: string; follow: boolean }) => setFollowGroup(uid!, groupId, follow),
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: invalidate,
  });
}
