import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icons } from '@/components/ui/icons';
import { useGroup, useGroupMembers, useSetGroupMember } from '@/features/groups/hooks';
import type { GroupMember } from '@/features/groups/api';
import { useUserId } from '@/stores/auth';
import { errorMessage } from '@/lib/errors';

/** Membres du groupe : co-organisateurs (nommés par le propriétaire) et joueurs de confiance. */
export default function GroupMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const uid = useUserId();
  const group = useGroup({ id });
  const q = useGroupMembers(id);
  const update = useSetGroupMember(id);
  const [selected, setSelected] = useState<GroupMember | null>(null);
  const me = q.data?.find((m) => m.id === uid);
  const canManage = me?.role === 'admin';
  const isOwner = !!me?.is_owner;

  return (
    <Screen scroll>
      <View className="flex-row items-center gap-3">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/group/[id]', params: { id } }))} />
        <View className="flex-1">
          <Text variant="title" accessibilityRole="header">
            {t('members.title')}
          </Text>
          <Text variant="caption" tone="soft" numberOfLines={1}>
            {group.data?.name ?? ''}
          </Text>
        </View>
      </View>
      <Text tone="soft">{t('members.explain')}</Text>
      {q.isLoading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
      ) : (
        <View className="gap-2">
          {q.data?.map((m) => (
            <PressableScale
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={m.display_name}
              disabled={!canManage || m.is_owner}
              onPress={() => setSelected(m)}
              className="min-h-tap flex-row items-center gap-3 rounded-card border border-line bg-surface p-3"
            >
              <Avatar person={m} size={44} />
              <View className="flex-1 gap-1">
                <Text variant="bodyStrong">{m.display_name}</Text>
                <View className="flex-row flex-wrap gap-1">
                  {m.is_owner ? <Pill size="sm" label={t('members.owner')} /> : m.role === 'admin' ? <Pill size="sm" label={t('members.coOrganizer')} /> : null}
                  {m.trusted ? <Pill size="sm" icon={Icons.ShieldCheck} label={t('members.trusted')} /> : null}
                </View>
              </View>
              <View className="items-end">
                <Text variant="caption" tone="soft" tabular>
                  {t('members.attended', { count: m.sessions_attended })}
                </Text>
                {m.reliability != null ? (
                  <Text variant="caption" tone="soft" tabular>{`${t('profile.reliability')} ${m.reliability} %`}</Text>
                ) : null}
              </View>
            </PressableScale>
          ))}
        </View>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.display_name}>
        {selected ? (
          <View className="gap-3">
            <Button
              label={selected.trusted ? t('members.removeTrusted') : t('members.makeTrusted')}
              variant="outline"
              icon={Icons.ShieldCheck}
              onPress={() => {
                update.mutate({ userId: selected.id, trusted: !selected.trusted });
                setSelected(null);
              }}
            />
            {isOwner ? (
              <Button
                label={selected.role === 'admin' ? t('members.removeCo') : t('members.makeCo')}
                variant={selected.role === 'admin' ? 'danger' : 'ink'}
                icon={Icons.UsersThree}
                onPress={() => {
                  update.mutate({ userId: selected.id, role: selected.role === 'admin' ? 'member' : 'admin' });
                  setSelected(null);
                }}
              />
            ) : null}
            <Button label={t('members.viewProfile')} variant="ghost" onPress={() => (setSelected(null), router.push({ pathname: '/u/[id]', params: { id: selected.id } }))} />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
