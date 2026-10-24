import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icons } from '@/components/ui/icons';
import { GroupCard } from '@/components/group/GroupCard';
import { useGroups } from '@/features/groups/hooks';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { useAuth } from '@/stores/auth';
import { errorMessage } from '@/lib/errors';
import type { GroupCard as Group } from '@/features/groups/types';

function List({ title, q, empty, emptyAction }: { title: string; q: ReturnType<typeof useGroups>; empty: string; emptyAction?: { label: string; onPress: () => void } }) {
  const { t } = useTranslation();
  return (
    <View className="gap-3">
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {q.isLoading ? (
        [0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-card" tint={i ? 'turquoise' : 'orange'} />)
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
      ) : q.data?.length ? (
        q.data.map((g: Group) => <GroupCard key={g.id} group={g} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })} />)
      ) : (
        <EmptyState title={empty} actionLabel={emptyAction?.label} onAction={emptyAction?.onPress} actionIcon={Icons.Plus} variant={1} />
      )}
    </View>
  );
}

export default function Groups() {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => !!s.session);
  const requireAuth = useRequireAuth();
  const mine = useGroups('mine');
  const discover = useGroups('discover');
  const create = () => {
    if (requireAuth({ type: 'createGroup' })) router.push('/group/new');
  };
  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between">
        <Text variant="display" accessibilityRole="header">
          {t('groups.title')}
        </Text>
        <Button label={t('groups.create')} variant="outline" icon={Icons.Plus} onPress={create} />
      </View>
      {signedIn ? <List title={t('groups.mine')} q={mine} empty={t('groups.emptyMine')} /> : null}
      <List title={t('groups.discover')} q={discover} empty={t('groups.emptyDiscover')} emptyAction={{ label: t('groups.create'), onPress: create }} />
    </Screen>
  );
}
