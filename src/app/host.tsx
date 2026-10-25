import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { BarChart } from '@/components/charts/BarChart';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useHostDashboard } from '@/features/host/hooks';
import { useAuth } from '@/stores/auth';
import { errorMessage } from '@/lib/errors';
import { formatDay, formatShortDate } from '@/lib/time';
import { currentLocale } from '@/i18n';

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View className="min-w-[46%] flex-1 gap-1 rounded-card border border-line bg-surface p-4">
      <Text variant="display" tabular>
        {value}
      </Text>
      <Text variant="caption" tone="soft">
        {label}
      </Text>
    </View>
  );
}

/** Tableau de bord organisateur : fréquentation, présence réelle, réguliers. */
export default function HostDashboardScreen() {
  const { t } = useTranslation();
  const lang = currentLocale();
  const signedIn = useAuth((s) => !!s.session);
  const q = useHostDashboard(90);
  const d = q.data;
  const pct = (v: number | null | undefined) => (v == null ? '—' : `${v} %`);

  return (
    <Screen scroll>
      <View className="flex-row items-center gap-3">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
        <View className="flex-1">
          <Text variant="title" accessibilityRole="header">
            {t('host.title')}
          </Text>
          <Text variant="caption" tone="soft">
            {t('host.period')}
          </Text>
        </View>
      </View>
      {!signedIn ? (
        <SignInPrompt />
      ) : q.isLoading ? (
        <View className="gap-3">
          <Skeleton className="h-24 rounded-card" tint="orange" />
          <Skeleton className="h-40 rounded-card" />
        </View>
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
      ) : !d || d.sessions_total === 0 ? (
        <EmptyState title={t('host.empty')} actionLabel={t('discover.emptyCta')} actionIcon={Icons.Plus} onAction={() => router.push('/create')} />
      ) : (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Tile value={pct(d.fill_rate)} label={t('host.fillRate')} />
            <Tile value={pct(d.attendance_rate)} label={t('host.attendance')} />
            <Tile value={String(d.sessions_total)} label={`${t('host.sessions')} · ${d.sessions_upcoming} ${t('host.upcoming').toLowerCase()}`} />
            <Tile value={String(d.unique_players)} label={t('host.players')} />
          </View>

          {d.weekly.length > 1 ? (
            <>
              <BarChart
                title={t('host.weeklySessions')}
                bars={d.weekly.map((w) => ({
                  key: w.week,
                  label: formatDay(w.week, lang),
                  value: w.sessions,
                  a11y: t('host.barValue', { week: formatDay(w.week, lang), value: w.sessions }),
                }))}
              />
              <BarChart
                title={t('host.weeklyFill')}
                unit=" %"
                max={100}
                bars={d.weekly.map((w) => ({
                  key: w.week,
                  label: formatDay(w.week, lang),
                  value: w.fill,
                  a11y: t('host.barValue', { week: formatDay(w.week, lang), value: w.fill == null ? '—' : `${w.fill} %` }),
                }))}
              />
            </>
          ) : null}

          <View className="gap-3">
            <Text variant="title">{t('host.regulars')}</Text>
            {d.regulars.length ? (
              <View className="gap-1 rounded-card border border-line bg-surface px-4 py-2">
                {d.regulars.map((r) => (
                  <PressableScale key={r.id} onPress={() => router.push({ pathname: '/u/[id]', params: { id: r.id } })} accessibilityRole="button" accessibilityLabel={r.display_name} className="min-h-tap flex-row items-center gap-3 py-1">
                    <Avatar person={r} size={36} />
                    <Text variant="bodyStrong" className="flex-1">
                      {r.display_name}
                    </Text>
                    <Text variant="caption" tone="soft" tabular>
                      {t('host.regularCount', { count: r.count })}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            ) : (
              <Text tone="soft">{t('host.regularsEmpty')}</Text>
            )}
          </View>

          <View className="gap-3">
            <Text variant="title">{t('host.recent')}</Text>
            {d.recent.map((s) => (
              <PressableScale key={s.id} onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })} accessibilityRole="button" accessibilityLabel={s.title} className="gap-1 rounded-card border border-line bg-surface p-4">
                <Text variant="heading" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text variant="caption" tone="soft" tabular>
                  {`${formatShortDate(s.starts_at, lang)} · ${t('host.recentLine', { taken: s.places_taken, max: s.max_players, attended: s.attended, noShow: s.no_show })}`}
                </Text>
              </PressableScale>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
