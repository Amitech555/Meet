import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Checkbox } from '@/components/ui/Checkbox';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { useRecordAttendance, useRoster } from '@/features/profile/hooks';
import { errorMessage } from '@/lib/errors';

/** « Qui était là ? » — l'organisateur coche les présents (tous cochés par défaut : on décoche les absents). */
export default function Checkin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const roster = useRoster(id);
  const save = useRecordAttendance();
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const people = roster.data?.filter((p) => !p.is_host) ?? [];

  return (
    <Screen scroll>
      <IconButton icon={Icons.X} label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/sessions'))} />
      <View className="gap-2">
        <Text variant="display" accessibilityRole="header">
          {t('review.checkinTitle')}
        </Text>
        <Text tone="soft">{t('review.checkinBody')}</Text>
      </View>
      {roster.isLoading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-card" />)
      ) : roster.isError ? (
        <ErrorState message={errorMessage(roster.error, t)} retryLabel={t('common.retry')} onRetry={() => roster.refetch()} icon={Icons.WifiSlash} />
      ) : (
        <View className="gap-1 rounded-card border border-line bg-surface px-4 py-2">
          {people.map((p) => (
            <Checkbox
              key={p.id}
              checked={!absent.has(p.id)}
              label={p.display_name}
              onChange={(present) =>
                setAbsent((s) => {
                  const n = new Set(s);
                  if (present) n.delete(p.id);
                  else n.add(p.id);
                  return n;
                })
              }
            >
              <View className="flex-row items-center gap-3">
                <Avatar person={p} size={36} />
                <Text variant="bodyStrong">{p.guest_count ? `${p.display_name} +1` : p.display_name}</Text>
              </View>
            </Checkbox>
          ))}
        </View>
      )}
      <Button
        label={t('review.checkinSave')}
        size="lg"
        loading={save.isPending}
        disabled={!roster.data}
        onPress={() =>
          save.mutate(
            { sessionId: id, attended: people.filter((p) => !absent.has(p.id)).map((p) => p.id) },
            { onSuccess: () => router.replace({ pathname: '/session/[id]/review', params: { id } }) },
          )
        }
      />
    </Screen>
  );
}
