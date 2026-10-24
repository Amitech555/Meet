import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SessionCardSkeleton } from '@/components/ui/Skeleton';
import { Icons } from '@/components/ui/icons';
import { SessionCard } from '@/components/session/SessionCard';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useMySessions } from '@/features/profile/hooks';
import { useJoinFlow } from '@/features/sessions/useJoinFlow';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { useAuth, useUserId } from '@/stores/auth';
import { useTheme } from '@/design/theme';
import { errorMessage } from '@/lib/errors';
import type { MySession } from '@/features/profile/api';

type Kind = 'upcoming' | 'past' | 'hosting';

function ActionBanner({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="min-h-tap flex-row items-center gap-3 rounded-card bg-citron px-4 py-3">
      <Icons.Lightning size={22} weight="fill" color={colors.onCitron} />
      <Text variant="bodyStrong" tone="onCitron" className="flex-1">
        {label}
      </Text>
      <Icons.CaretRight size={20} weight="bold" color={colors.onCitron} />
    </PressableScale>
  );
}

/** Mes sessions : à venir / passées / j'organise. */
export default function MySessions() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const signedIn = useAuth((s) => !!s.session);
  const uid = useUserId();
  const requireAuth = useRequireAuth();
  const [kind, setKind] = useState<Kind>('upcoming');
  const q = useMySessions(kind);
  const hosting = useMySessions('hosting');
  const past = useMySessions('past');
  const { requestJoin, sheet } = useJoinFlow();

  const toCheckin = hosting.data?.filter((s) => s.needs_checkin) ?? [];
  const toReview = past.data?.filter((s) => s.needs_review) ?? [];
  const open = (s: MySession) => router.push({ pathname: '/session/[id]', params: { id: s.id } });

  const empty = {
    upcoming: { title: t('mySessions.emptyUpcoming'), action: t('mySessions.findSession'), onPress: () => router.push('/') },
    past: { title: t('mySessions.emptyPast'), action: undefined, onPress: undefined },
    hosting: { title: t('mySessions.emptyHosting'), action: t('discover.emptyCta'), onPress: () => requireAuth({ type: 'create' }) && router.push('/create') },
  }[kind];

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-5 px-4"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.signal} />}
    >
      <Text variant="display" accessibilityRole="header">
        {t('tabs.mySessions')}
      </Text>
      {!signedIn ? (
        <SignInPrompt />
      ) : (
        <>
          {toCheckin.map((s) => (
            <ActionBanner key={`c-${s.id}`} label={t('mySessions.toCheckin', { title: s.title })} onPress={() => router.push({ pathname: '/session/[id]/checkin', params: { id: s.id } })} />
          ))}
          {toReview.slice(0, 1).map((s) => (
            <ActionBanner key={`r-${s.id}`} label={t('mySessions.toReview')} onPress={() => router.push({ pathname: '/session/[id]/review', params: { id: s.id } })} />
          ))}
          <View className="flex-row gap-2" accessibilityRole="tablist">
            {(['upcoming', 'past', 'hosting'] as Kind[]).map((k) => (
              <Pill key={k} label={t(`mySessions.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </View>
          {q.isLoading ? (
            [0, 1, 2].map((i) => <SessionCardSkeleton key={i} index={i} />)
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
          ) : q.data?.length ? (
            q.data.map((s) => (
              <View key={s.id} className="gap-2">
                <SessionCard session={s} onPress={() => open(s)} onJoin={() => requestJoin(s)} onManage={() => open(s)} currentUserId={uid} />
                {kind === 'past' && s.needs_review ? (
                  <Pill size="sm" icon={Icons.ThumbsUp} label={t('review.title')} onPress={() => router.push({ pathname: '/session/[id]/review', params: { id: s.id } })} />
                ) : null}
                {kind === 'hosting' && s.status === 'completed' ? (
                  <Pill size="sm" icon={Icons.Copy} label={t('session.duplicate')} onPress={() => router.push({ pathname: '/create', params: { from: s.id } })} />
                ) : null}
              </View>
            ))
          ) : (
            <EmptyState title={empty.title} actionLabel={empty.action} onAction={empty.onPress} variant={kind === 'past' ? 1 : 0} />
          )}
        </>
      )}
      {sheet}
    </ScrollView>
  );
}
