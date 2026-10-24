import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { DiscoverHeader } from '@/components/discover/DiscoverHeader';
import { CategoryRail } from '@/components/discover/CategoryRail';
import { DateRail } from '@/components/discover/DateRail';
import { FiltersSheet } from '@/components/discover/FiltersSheet';
import { ViewToggle } from '@/components/discover/ViewToggle';
import { SessionMap } from '@/components/discover/SessionMap';
import { SessionCard } from '@/components/session/SessionCard';
import { SessionCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { Icons } from '@/components/ui/icons';
import { useFeed } from '@/features/sessions/hooks';
import { useJoinFlow } from '@/features/sessions/useJoinFlow';
import { deriveSections } from '@/features/sessions/sections';
import { useCategories, useTopCategories } from '@/features/catalog/hooks';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { defaultFilters, usePrefs } from '@/stores/prefs';
import { useLocationStore } from '@/stores/location';
import { useUserId } from '@/stores/auth';
import { useTheme } from '@/design/theme';
import { errorMessage } from '@/lib/errors';
import { MONTREAL } from '@/lib/geo';
import { isEnabled } from '@/lib/flags';
import type { SessionSummary } from '@/features/sessions/types';

// L'entrée en cascade ne se joue qu'au tout premier affichage du feed dans la vie de l'app.
const cascade = { played: false };

function Section({ title, sessions, featured, onOpen, onJoin, userId, joiningId }: {
  title: string;
  sessions: SessionSummary[];
  featured?: boolean;
  onOpen: (s: SessionSummary) => void;
  onJoin: (s: SessionSummary) => void;
  userId: string | null;
  joiningId?: string;
}) {
  if (!sessions.length) return null;
  return (
    <View className="gap-3">
      <Text variant="title" accessibilityRole="header" className="px-4">
        {title}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4" snapToInterval={featured ? 312 : 332} decelerationRate="fast">
        {sessions.map((s) => (
          <View key={s.id} style={{ width: featured ? 300 : 320 }}>
            <SessionCard
              session={s}
              variant={featured ? 'featured' : 'carousel'}
              onPress={() => onOpen(s)}
              onJoin={() => onJoin(s)}
              currentUserId={userId}
              joining={joiningId === s.id}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function Discover() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const filters = usePrefs((s) => s.filters);
  const setFilters = usePrefs((s) => s.setFilters);
  const resetFilters = usePrefs((s) => s.resetFilters);
  const view = usePrefs((s) => s.view);
  const setView = usePrefs((s) => s.setView);
  const interests = usePrefs((s) => s.interests);
  const position = useLocationStore((s) => s.position);
  const userId = useUserId();
  const requireAuth = useRequireAuth();
  const top = useTopCategories();
  const categories = useCategories();
  const feed = useFeed(filters);
  const { requestJoin, joiningId, sheet } = useJoinFlow();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters);
  const sections = useMemo(
    () => (filtersActive ? null : deriveSections(feed.data?.pages[0] ?? [], interests, categories.data)),
    [filtersActive, feed.data, interests, categories.data],
  );
  const secondaryCount = (filters.price !== 'all' ? 1 : 0) + filters.levels.length + (filters.radiusKm ? 1 : 0);

  const open = (s: SessionSummary) => router.push({ pathname: '/session/[id]', params: { id: s.id } });
  const create = () => {
    if (requireAuth({ type: 'create' })) router.push('/create');
  };

  const [animate] = useState(() => !cascade.played);
  useEffect(() => {
    cascade.played = true;
  }, []);

  const header = (
    <View className="gap-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
      <DiscoverHeader />
      <View className="gap-3">
        <CategoryRail categories={top.data} selected={filters.categoryIds} onChange={(categoryIds) => setFilters({ categoryIds })} />
        <DateRail
          value={filters.date}
          onChange={(date) => setFilters({ date })}
          leading={
            <>
              <Pill size="sm" icon={Icons.SlidersHorizontal} label={secondaryCount ? `${t('discover.filters')} · ${secondaryCount}` : t('discover.filters')} selected={secondaryCount > 0} onPress={() => setFiltersOpen(true)} />
              {filtersActive ? <Pill size="sm" icon={Icons.X} label={t('discover.clearFilters')} onPress={resetFilters} accessibilityLabel={t('discover.clearFilters')} /> : null}
            </>
          }
        />
      </View>

      {feed.isError && rows.length === 0 ? (
        <View className="px-4">
          <ErrorState message={errorMessage(feed.error, t)} retryLabel={t('common.retry')} onRetry={() => feed.refetch()} icon={Icons.WifiSlash} />
        </View>
      ) : feed.isError ? (
        <View className="px-4">
          <ErrorState message={t('errors.offline')} retryLabel={t('common.retry')} onRetry={() => feed.refetch()} icon={Icons.WifiSlash} />
        </View>
      ) : null}

      {sections ? (
        <>
          <Section title={t('discover.tonightNearYou')} sessions={sections.tonight} featured onOpen={open} onJoin={requestJoin} userId={userId} joiningId={joiningId} />
          <Section title={t('discover.fillingFast')} sessions={sections.fillingFast} onOpen={open} onJoin={requestJoin} userId={userId} joiningId={joiningId} />
          <Section title={t('discover.forYou')} sessions={sections.forYou} onOpen={open} onJoin={requestJoin} userId={userId} joiningId={joiningId} />
        </>
      ) : null}

      {rows.length > 0 ? (
        <Text variant="title" accessibilityRole="header" className="px-4">
          {filtersActive ? t('discover.resultCount', { count: rows.length }) : t('discover.upcoming')}
        </Text>
      ) : null}
    </View>
  );

  const empty = feed.isLoading ? (
    <View className="gap-3 px-4">
      {[0, 1, 2, 3].map((i) => (
        <SessionCardSkeleton key={i} index={i} />
      ))}
    </View>
  ) : feed.isError ? null : (
    <View className="px-4">
      {filtersActive ? (
        <EmptyState title={t('discover.emptyFiltered')} actionLabel={t('discover.clearFilters')} onAction={resetFilters} variant={1} />
      ) : (
        <EmptyState title={t('discover.emptyTitle')} body={t('discover.emptyBody')} actionLabel={t('discover.emptyCta')} actionIcon={Icons.Plus} onAction={create} />
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      {view === 'map' && isEnabled('map_view') ? (
        <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
          <View className="gap-3 pb-3">
            <DiscoverHeader />
            <CategoryRail categories={top.data} selected={filters.categoryIds} onChange={(categoryIds) => setFilters({ categoryIds })} />
          </View>
          <SessionMap
            sessions={rows}
            selectedId={selectedId ?? rows[0]?.id ?? null}
            onSelect={setSelectedId}
            onOpen={open}
            onJoin={requestJoin}
            currentUserId={userId}
            joiningId={joiningId}
            center={position ?? MONTREAL}
          />
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: 180 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={colors.signal} colors={[colors.signal]} />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              className="px-4"
              entering={animate && index < 6 ? FadeInDown.delay(index * 50).springify().damping(20).reduceMotion(ReduceMotion.System) : undefined}
            >
              <SessionCard session={item} onPress={() => open(item)} onJoin={() => requestJoin(item)} currentUserId={userId} joining={joiningId === item.id} />
            </Animated.View>
          )}
          ListFooterComponent={feed.isFetchingNextPage ? <View className="px-4 pt-3"><SessionCardSkeleton index={2} /></View> : null}
        />
      )}
      <ViewToggle view={view} onChange={setView} />
      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        hasPosition={!!position}
        onReset={() => {
          resetFilters();
          setFiltersOpen(false);
        }}
      />
      {sheet}
    </View>
  );
}
