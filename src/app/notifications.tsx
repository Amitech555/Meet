import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icons, type Icon } from '@/components/ui/icons';
import { SignInPrompt } from '@/components/SignInPrompt';
import { notificationTarget, useMarkAllRead, useNotifications, type AppNotification } from '@/features/notifications/hooks';
import { useAuth } from '@/stores/auth';
import { useTheme } from '@/design/theme';
import { categoryTints } from '@design/tokens';
import { errorMessage } from '@/lib/errors';
import { formatMessageTime, formatStartTime } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';

const look: Record<AppNotification['kind'], { icon: Icon; tint: keyof typeof categoryTints }> = {
  spot_opened: { icon: Icons.Lightning, tint: 'jaune' },
  session_cancelled: { icon: Icons.Prohibit, tint: 'rouge' },
  reminder_24h: { icon: Icons.CalendarBlank, tint: 'turquoise' },
  reminder_2h: { icon: Icons.Clock, tint: 'orange' },
  checkin: { icon: Icons.Check, tint: 'encre' },
  review_request: { icon: Icons.ThumbsUp, tint: 'mousse' },
  new_from_followed: { icon: Icons.Bell, tint: 'framboise' },
  priority_access: { icon: Icons.ShieldCheck, tint: 'sapin' },
};

function useText() {
  const { t } = useTranslation();
  return (n: AppNotification) => {
    const p = n.payload;
    const time = p.starts_at ? formatStartTime(p.starts_at, currentLocale()) : '';
    switch (n.kind) {
      case 'reminder_24h':
        return t('notifications.reminder24h', { title: p.title, time });
      case 'reminder_2h':
        return t('notifications.reminder2h', { title: p.title, venue: p.venue });
      case 'spot_opened':
        return t('notifications.spotOpened', { title: p.title });
      case 'session_cancelled':
        return t('notifications.sessionCancelled', { title: p.title });
      case 'checkin':
        return t('notifications.checkinReminder', { title: p.title });
      case 'review_request':
        return `${t('review.title')} — ${p.title}`;
      case 'priority_access':
        return t('notifications.priorityAccess', { title: p.title });
      case 'new_from_followed':
        return `${t('notifications.newFromFollowed', { name: p.host_name })} : ${p.title}`;
    }
  };
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const now = useNow();
  const signedIn = useAuth((s) => !!s.session);
  const q = useNotifications();
  const markRead = useMarkAllRead();
  const text = useText();
  const hasUnread = !!q.data?.some((n) => !n.read_at);

  useEffect(() => {
    if (hasUnread) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois quand des non-lues apparaissent
  }, [hasUnread]);

  return (
    <Screen scroll>
      <View className="flex-row items-center gap-3">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="title" accessibilityRole="header">
          {t('notifications.title')}
        </Text>
      </View>
      {!signedIn ? (
        <SignInPrompt />
      ) : q.isLoading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
      ) : !q.data?.length ? (
        <EmptyState title={t('notifications.empty')} variant={1} />
      ) : (
        <View className="gap-2">
          {q.data.map((n) => {
            const { icon: I, tint } = look[n.kind];
            const target = notificationTarget(n.kind, n.session_id);
            const label = text(n);
            return (
              <PressableScale
                key={n.id}
                disabled={!target}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => target && router.push(target)}
                className={cn('min-h-tap flex-row items-center gap-3 rounded-card border bg-surface p-3', n.read_at ? 'border-line' : 'border-2 border-ink')}
              >
                <View className="h-11 w-11 items-center justify-center rounded-field" style={{ backgroundColor: categoryTints[tint].bg }}>
                  <I size={22} weight="bold" color={categoryTints[tint].fg} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {label}
                  </Text>
                  <Text variant="caption" tone="soft" tabular>
                    {formatMessageTime(n.created_at, currentLocale(), new Date(now))}
                  </Text>
                </View>
                {target ? <Icons.CaretRight size={18} weight="bold" color={colors.inkSoft} /> : null}
              </PressableScale>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
