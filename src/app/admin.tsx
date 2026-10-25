import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { useMe } from '@/features/auth/hooks';
import { useCityStats, useReports, useResolveReport, useUnban } from '@/features/admin/hooks';
import { actionsFor, type AdminReport, type ReportStatus } from '@/features/admin/api';
import { errorMessage } from '@/lib/errors';
import { formatDay, formatMessageTime } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { currentLocale } from '@/i18n';

function TargetPreview({ r }: { r: AdminReport }) {
  const { t } = useTranslation();
  const tg = r.target;
  if (!tg) return <Text tone="soft">—</Text>;
  if (r.target_type === 'user' && 'display_name' in tg) {
    return (
      <View className="flex-row items-center gap-2">
        <Avatar person={tg} size={32} />
        <Text variant="bodyStrong">{tg.display_name}</Text>
        {tg.is_banned ? <Pill size="sm" icon={Icons.Prohibit} label={t('admin.banned')} /> : null}
      </View>
    );
  }
  if ('title' in tg) {
    return (
      <Text variant="bodyStrong">
        {tg.title}
        <Text tone="soft">{` · ${tg.host?.display_name ?? ''} · ${tg.status}`}</Text>
      </Text>
    );
  }
  if ('name' in tg) return <Text variant="bodyStrong">{`${tg.name} · ${tg.visibility}`}</Text>;
  if ('body' in tg) {
    return (
      <View className="gap-1 rounded-field bg-surfaceAlt p-3">
        <Text variant="caption" className="font-bold">
          {tg.author?.display_name ?? '—'}
        </Text>
        <Text className={tg.deleted ? 'italic' : undefined}>{tg.deleted ? t('chat.deleted') : tg.body}</Text>
      </View>
    );
  }
  return null;
}

function Reports() {
  const { t } = useTranslation();
  const now = useNow();
  const [status, setStatus] = useState<ReportStatus>('open');
  const q = useReports(status);
  const resolve = useResolveReport();
  const unban = useUnban();
  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <Pill label={t('admin.statusOpen')} selected={status === 'open'} onPress={() => setStatus('open')} />
        <Pill label={t('admin.statusDone')} selected={status === 'actioned'} onPress={() => setStatus('actioned')} />
      </View>
      {q.isLoading ? (
        [0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-card" />)
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
      ) : !q.data?.length ? (
        <EmptyState title={t('admin.empty')} variant={1} />
      ) : (
        q.data.map((r) => (
          <View key={r.id} className="gap-3 rounded-card border border-line bg-surface p-4">
            <View className="flex-row flex-wrap items-center gap-2">
              <Pill size="sm" label={t(`admin.target.${r.target_type}`)} />
              <Pill size="sm" icon={Icons.Flag} label={t(`report.reasons.${r.reason}`)} />
              {r.reports_on_target > 1 ? <Pill size="sm" label={t('admin.onTarget', { count: r.reports_on_target })} /> : null}
            </View>
            <TargetPreview r={r} />
            {r.details ? <Text tone="soft">{`« ${r.details} »`}</Text> : null}
            <Text variant="caption" tone="soft">
              {`${t('admin.reportedBy', { name: r.reporter?.display_name ?? '—' })} · ${formatMessageTime(r.created_at, currentLocale(), new Date(now))}`}
            </Text>
            {status === 'open' ? (
              <View className="flex-row flex-wrap gap-2">
                {actionsFor(r.target_type).map((a) => (
                  <Button
                    key={a}
                    label={t(`admin.actions.${a}`)}
                    variant={a === 'none' ? 'ghost' : a === 'ban_user' ? 'danger' : 'outline'}
                    loading={resolve.isPending && resolve.variables?.id === r.id && resolve.variables.action === a}
                    onPress={() => resolve.mutate({ id: r.id, action: a })}
                  />
                ))}
              </View>
            ) : r.target_type === 'user' && r.target && 'is_banned' in r.target && r.target.is_banned ? (
              <Button label={t('admin.unban')} variant="outline" onPress={() => unban.mutate(r.target_id)} />
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

function Cell({ children, strong, wide }: { children: string; strong?: boolean; wide?: boolean }) {
  return (
    <Text variant="caption" tabular className={strong ? 'font-bold' : undefined} style={{ width: wide ? 110 : 86 }} numberOfLines={1}>
      {children}
    </Text>
  );
}

function Stats() {
  const { t } = useTranslation();
  const lang = currentLocale();
  const q = useCityStats();
  const pct = (v: number | null) => (v == null ? '—' : `${v} %`);
  if (q.isLoading) return <Skeleton className="h-60 rounded-card" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />;
  const d = q.data!;
  const totals: [string, number][] = [
    [t('admin.users'), d.totals.users],
    [t('admin.sessionsUpcoming'), d.totals.sessions_upcoming],
    [t('admin.groups'), d.totals.groups],
    [t('admin.openReports'), d.totals.open_reports],
    [t('admin.bannedCount'), d.totals.banned],
  ];
  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap gap-3">
        {totals.map(([label, v]) => (
          <View key={label} className="min-w-[30%] flex-1 gap-1 rounded-card border border-line bg-surface p-3">
            <Text variant="title" tabular>
              {String(v)}
            </Text>
            <Text variant="caption" tone="soft">
              {label}
            </Text>
          </View>
        ))}
      </View>
      {/* Tableau défilant : la vue tabulaire des métriques (pas de graphique à double axe) */}
      <Text variant="title">{t('admin.weekly')}</Text>
      <ScrollView horizontal className="rounded-card border border-line bg-surface">
        <View className="gap-2 p-4">
          <View className="flex-row border-b border-line pb-2">
            <Cell strong wide>{t('admin.week')}</Cell>
            <Cell strong>{t('admin.city')}</Cell>
            <Cell strong>{t('admin.published')}</Cell>
            <Cell strong>{t('admin.hosts')}</Cell>
            <Cell strong>{t('admin.fill')}</Cell>
            <Cell strong>{t('admin.attendance')}</Cell>
          </View>
          {d.weekly.map((w) => (
            <View key={`${w.week}-${w.city}`} className="flex-row">
              <Cell wide>{formatDay(w.week, lang)}</Cell>
              <Cell>{w.city}</Cell>
              <Cell>{String(w.sessions_published)}</Cell>
              <Cell>{String(w.active_hosts)}</Cell>
              <Cell>{pct(w.fill_rate_pct)}</Cell>
              <Cell>{pct(w.attendance_rate_pct)}</Cell>
            </View>
          ))}
        </View>
      </ScrollView>
      <Text variant="title">{t('admin.cohorts')}</Text>
      <ScrollView horizontal className="rounded-card border border-line bg-surface">
        <View className="gap-2 p-4">
          <View className="flex-row border-b border-line pb-2">
            <Cell strong wide>{t('admin.week')}</Cell>
            <Cell strong>{t('admin.signups')}</Cell>
            <Cell strong wide>{t('admin.activation')}</Cell>
            <Cell strong wide>{t('admin.retention')}</Cell>
          </View>
          {d.cohorts.map((c) => (
            <View key={c.cohort} className="flex-row">
              <Cell wide>{formatDay(c.cohort, lang)}</Cell>
              <Cell>{String(c.signups)}</Cell>
              <Cell wide>{pct(c.activation_48h_pct)}</Cell>
              <Cell wide>{pct(c.second_session_14d_pct)}</Cell>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** Back-office minimal : modération des signalements et stats par ville. Réservé à l'équipe (is_admin). */
export default function Admin() {
  const { t } = useTranslation();
  const me = useMe();
  const [tab, setTab] = useState<'reports' | 'stats'>('reports');
  return (
    <Screen scroll>
      <View className="flex-row items-center gap-3">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
        <Text variant="title" accessibilityRole="header" className="flex-1">
          {t('admin.title')}
        </Text>
      </View>
      {me.isLoading ? (
        <Skeleton className="h-40 rounded-card" />
      ) : !me.data?.is_admin ? (
        <EmptyState title={t('admin.forbidden')} variant={1} />
      ) : (
        <>
          <View className="flex-row gap-2" accessibilityRole="tablist">
            <Pill label={t('admin.reports')} icon={Icons.Flag} selected={tab === 'reports'} onPress={() => setTab('reports')} />
            <Pill label={t('admin.stats')} icon={Icons.ListBullets} selected={tab === 'stats'} onPress={() => setTab('stats')} />
          </View>
          {tab === 'reports' ? <Reports /> : <Stats />}
        </>
      )}
    </Screen>
  );
}
