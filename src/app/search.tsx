import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/Button';
import { Icons } from '@/components/ui/icons';
import { SessionCard } from '@/components/session/SessionCard';
import { SessionCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useFeed } from '@/features/sessions/hooks';
import { useJoinFlow } from '@/features/sessions/useJoinFlow';
import { defaultFilters } from '@/stores/prefs';
import { useUserId } from '@/stores/auth';
import { useTheme } from '@/design/theme';
import { useDebounced } from '@/lib/useDebounced';

/** Recherche texte : activité, lieu, organisateur (sans accents, côté serveur). */
export default function Search() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim(), 300);
  const feed = useFeed(defaultFilters, query);
  const rows = useMemo(() => (query.length >= 2 ? (feed.data?.pages.flat() ?? []) : []), [feed.data, query]);
  const userId = useUserId();
  const { requestJoin, joiningId, sheet } = useJoinFlow();

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2 px-4 pb-3">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View className="min-h-tap flex-1 flex-row items-center gap-2 rounded-pill border-2 border-ink bg-surface px-4">
          <Icons.MagnifyingGlass size={20} weight="bold" color={colors.inkSoft} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder={t('discover.searchPlaceholder')}
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel={t('discover.searchPlaceholder')}
            returnKeyType="search"
            className="flex-1 py-3 font-body text-md text-ink"
          />
          {q ? <IconButton icon={Icons.X} label={t('common.close')} variant="ghost" onPress={() => setQ('')} /> : null}
        </View>
      </View>
      <FlashList
        data={rows}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={rows.length ? <Text variant="caption" tone="soft" className="px-4 pb-3">{t('discover.resultCount', { count: rows.length })}</Text> : null}
        ListEmptyComponent={
          query.length < 2 ? null : feed.isLoading ? (
            <View className="gap-3 px-4">
              <SessionCardSkeleton index={0} />
              <SessionCardSkeleton index={1} />
            </View>
          ) : (
            <View className="px-4">
              <EmptyState title={t('discover.emptyFiltered')} variant={1} />
            </View>
          )
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <SessionCard
              session={item}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: item.id } })}
              onJoin={() => requestJoin(item)}
              currentUserId={userId}
              joining={joiningId === item.id}
            />
          </View>
        )}
      />
      {sheet}
    </View>
  );
}
