import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { PriceBadge } from '@/components/ui/PriceBadge';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icons, type Icon } from '@/components/ui/icons';
import { GeneratedCover } from '@/components/session/GeneratedCover';
import { JoinButton, joinStateFor } from '@/components/session/JoinButton';
import { MiniMap } from '@/components/session/MiniMap';
import { useDayLabel } from '@/components/session/TimeBlock';
import { ReportSheet } from '@/components/ReportSheet';
import { useCancelSession, useJoinSeries, useLeaveSession, useSession, useSetGuest, useToggleSaved } from '@/features/sessions/hooks';
import { useJoinFlow } from '@/features/sessions/useJoinFlow';
import { useSessionRealtime } from '@/features/sessions/useSessionRealtime';
import { addSessionToCalendar, mapsUrl, shareSession } from '@/features/sessions/share';
import { spotsLeft, type SessionDetail } from '@/features/sessions/types';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { useUserId } from '@/stores/auth';
import { useTheme } from '@/design/theme';
import { elevation, tintFor } from '@design/tokens';
import { durationMinutes, formatDuration, formatLongDate, formatStartTime } from '@/lib/time';
import { formatDistance } from '@/lib/geo';
import { errorMessage } from '@/lib/errors';
import { useNow } from '@/lib/useNow';
import { track } from '@/lib/analytics';
import { currentLocale } from '@/i18n';

const COVER_H = 280;

function InfoBlock({ icon: I, label, children, tint }: { icon: Icon; label: string; children: ReactNode; tint: string }) {
  const t = tintFor(tint);
  return (
    <View className="flex-row gap-4">
      <View className="h-12 w-12 items-center justify-center rounded-field" style={{ backgroundColor: t.bg }}>
        <I size={24} weight="bold" color={t.fg} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="label" tone="soft">
          {label}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Banner({ tone, text }: { tone: 'danger' | 'ink'; text: string }) {
  return (
    <View className={tone === 'danger' ? 'rounded-card bg-danger px-4 py-3' : 'rounded-card bg-ink px-4 py-3'} accessibilityRole="alert">
      <Text variant="bodyStrong" tone="inherit" className="text-bg">
        {text}
      </Text>
    </View>
  );
}

export default function SessionScreen() {
  const { id, autojoin } = useLocalSearchParams<{ id: string; autojoin?: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const userId = useUserId();
  const now = useNow();
  const dayLabel = useDayLabel();
  const lang = currentLocale();
  const q = useSession(id);
  useSessionRealtime(id);
  const { requestJoin, joiningId, sheet: joinSheet } = useJoinFlow();
  const leave = useLeaveSession();
  const setGuest = useSetGuest();
  const cancel = useCancelSession();
  const joinSeries = useJoinSeries();
  const toggleSaved = useToggleSaved();
  const requireAuth = useRequireAuth();
  const [manageOpen, setManageOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const autoJoined = useRef(false);
  const viewed = useRef(false);

  const s = q.data;

  useEffect(() => {
    if (s && !viewed.current) {
      viewed.current = true;
      track('session_viewed', { category: s.category.slug, price_cents: s.price_cents, spots_left: spotsLeft(s) });
    }
  }, [s]);

  // Retour d'authentification différée : on rejoue « Je suis partant » une seule fois
  useEffect(() => {
    if (!s || !autojoin || autoJoined.current || !userId) return;
    autoJoined.current = true;
    if (s.my_status === 'joined' || s.my_status === 'waitlist' || s.host.id === userId) return;
    if (autojoin === 'series' && s.series_id) joinSeries.mutate(s.series_id);
    else requestJoin(s);
  }, [s, autojoin, userId, requestJoin, joinSeries]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => scrollY.set(e.contentOffset.y));
  const coverStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    const y = scrollY.get();
    return {
      transform: [{ translateY: interpolate(y, [-COVER_H, 0, COVER_H], [-COVER_H / 2, 0, COVER_H * 0.4]) }, { scale: interpolate(y, [-COVER_H, 0], [2, 1], 'clamp') }],
    };
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (q.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <Skeleton className="h-[280px] rounded-none" tint="orange" />
        <View className="gap-4 p-4">
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </View>
      </View>
    );
  }

  if (!s) {
    return (
      <View className="flex-1 justify-center gap-4 bg-bg p-4" style={{ paddingTop: insets.top }}>
        {q.isError ? (
          <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
        ) : (
          <EmptyState title={t('errors.sessionUnavailable')} actionLabel={t('mySessions.findSession')} onAction={() => router.replace('/')} variant={1} />
        )}
      </View>
    );
  }

  const detail: SessionDetail = s;
  const isHost = detail.host.id === userId;
  const started = new Date(detail.starts_at).getTime() <= now;
  const open = detail.status === 'published' && !started;
  const left = spotsLeft(detail);
  const state = joinStateFor(detail.my_status, left, open, isHost);
  const guestCount = detail.my_guest_count ?? 0;
  const policyKey = { flexible: 'session.policyFlexible', moderate: 'session.policyModerate', strict: 'session.policyStrict' } as const;

  return (
    <View className="flex-1 bg-bg">
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 140 }}>
        <Animated.View style={[{ height: COVER_H }, coverStyle]}>
          {detail.cover_url ? (
            <Image source={{ uri: detail.cover_url }} placeholder={detail.cover_blurhash ? { blurhash: detail.cover_blurhash } : undefined} style={{ height: COVER_H }} contentFit="cover" transition={200} />
          ) : (
            <GeneratedCover seed={detail.id} tint={detail.category.tint} icon={detail.category.icon} height={COVER_H} iconPosition="right" />
          )}
        </Animated.View>

        <View className="-mt-6 gap-6 rounded-t-card bg-bg px-4 pt-6">
          {detail.status === 'cancelled' ? <Banner tone="danger" text={detail.cancelled_reason ? `${t('session.cancelledBanner')} « ${detail.cancelled_reason} »` : t('session.cancelledBanner')} /> : null}
          {detail.status === 'completed' ? <Banner tone="ink" text={t('session.completedBanner')} /> : null}
          {detail.status === 'published' && started ? <Banner tone="ink" text={t('session.startedBanner')} /> : null}

          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <CategoryChip category={detail.category} size="sm" />
              <Pill size="sm" label={t(`levels.${detail.level}`)} />
              {detail.group ? <Pill size="sm" icon={Icons.UsersThree} label={detail.group.name} onPress={() => router.push({ pathname: '/group/[id]', params: { id: detail.group!.id } })} /> : null}
            </View>
            <Text variant="display" accessibilityRole="header">
              {detail.title}
            </Text>
            {detail.description ? <Text tone="soft">{detail.description}</Text> : null}
          </View>

          <View className="gap-5 rounded-card border border-line bg-surface p-4">
            <InfoBlock icon={Icons.Clock} label={t('session.when')} tint={detail.category.tint}>
              <Text variant="title" tabular>
                {`${dayLabel(detail.starts_at)} · ${formatStartTime(detail.starts_at, lang)}`}
              </Text>
              <Text variant="caption" tone="soft">
                {`${formatLongDate(detail.starts_at, lang)} · ${formatDuration(durationMinutes(detail.starts_at, detail.ends_at), lang)}`}
              </Text>
            </InfoBlock>
            <InfoBlock icon={Icons.MapPin} label={t('session.where')} tint={detail.category.tint}>
              <Text variant="heading">{detail.venue_name}</Text>
              <Text variant="caption" tone="soft">
                {[detail.address, detail.distance_m != null ? formatDistance(detail.distance_m, t, i18n.language) : null].filter(Boolean).join(' · ')}
              </Text>
            </InfoBlock>
            <InfoBlock icon={Icons.UsersThree} label={t('session.who')} tint={detail.category.tint}>
              <View className="flex-row items-baseline gap-1">
                <AnimatedNumber value={detail.joined_count} variant="title" />
                <Text variant="title" tabular>{`/${detail.max_players}`}</Text>
                <Text tone="soft">{` · ${left > 0 ? t('common.spotsLeft', { count: left }) : t('common.full')}`}</Text>
              </View>
              {detail.joined_count < detail.min_players ? (
                <Text variant="caption" tone="soft">
                  {t('session.minPlayers', { count: detail.min_players })}
                </Text>
              ) : null}
            </InfoBlock>
          </View>

          <View className="gap-3">
            <MiniMap lat={detail.lat} lng={detail.lng} tint={detail.category.tint} />
            <Button label={t('session.openInMaps')} variant="outline" icon={Icons.NavigationArrow} onPress={() => void Linking.openURL(mapsUrl(detail))} />
          </View>

          <View className="gap-3">
            <Text variant="label" tone="soft">
              {t('session.host')}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={detail.host.display_name}
              onPress={() => router.push({ pathname: '/u/[id]', params: { id: detail.host.id } })}
              className="flex-row items-center gap-4 rounded-card border border-line bg-surface p-4"
            >
              <Avatar person={detail.host} size={56} />
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1">
                  <Text variant="title">{detail.host.display_name}</Text>
                  {detail.host.verified ? (
                    <View accessible accessibilityLabel={t('common.verified')}>
                      <Icons.ShieldCheck size={18} weight="fill" color={colors.success} />
                    </View>
                  ) : null}
                </View>
                <Text variant="caption" tone="soft" tabular>
                  {detail.host.reliability != null
                    ? t('session.hostStats', { sessions: detail.host.sessions_hosted, reliability: detail.host.reliability })
                    : t('session.hostNew')}
                </Text>
              </View>
              <Icons.CaretRight size={20} weight="bold" color={colors.inkSoft} />
            </PressableScale>
          </View>

          <View className="gap-3">
            <Text variant="label" tone="soft">
              {t('session.participantsCount', { joined: detail.joined_count, max: detail.max_players })}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {detail.participants.map((p) => (
                <PressableScale key={p.id} onPress={() => router.push({ pathname: '/u/[id]', params: { id: p.id } })} accessibilityRole="button" accessibilityLabel={p.display_name} className="w-[64px] items-center gap-1">
                  <Avatar person={p} size={48} />
                  <Text variant="caption" numberOfLines={1} className="text-xs">
                    {p.guest_count ? `${p.display_name} +1` : p.display_name}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>

          <View className="gap-3 rounded-card border border-line bg-surface p-4">
            <View className="flex-row items-center gap-2">
              <Icons.ChatCircleDots size={22} weight="bold" color={colors.ink} />
              <Text variant="title">{t('session.chat')}</Text>
            </View>
            {detail.is_member ? (
              <>
                {detail.chat_preview?.length ? (
                  detail.chat_preview.map((m) => (
                    <View key={m.id} className="flex-row gap-2">
                      <Text variant="caption" className="font-bold">
                        {m.author?.display_name ?? t('chat.deletedUser')}
                      </Text>
                      <Text variant="caption" tone="soft" numberOfLines={2} className="flex-1">
                        {m.body}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text tone="soft">{t('session.chatPreviewEmpty')}</Text>
                )}
                <Button label={t('session.openChat')} variant="outline" onPress={() => router.push({ pathname: '/session/[id]/chat', params: { id: detail.id } })} />
              </>
            ) : (
              <View className="flex-row items-center gap-2">
                <Icons.LockSimple size={18} weight="bold" color={colors.inkSoft} />
                <Text tone="soft" className="flex-1">
                  {t('session.chatLocked')}
                </Text>
              </View>
            )}
          </View>

          <View className="gap-1">
            <Text variant="label" tone="soft">
              {t('session.cancellationPolicy')}
            </Text>
            <Text>{t(policyKey[detail.cancellation_policy])}</Text>
          </View>

          {detail.series_id && open && !isHost ? (
            <Button
              label={t('session.joinSeries')}
              variant="outline"
              icon={Icons.ArrowsClockwise}
              onPress={() => {
                if (requireAuth({ type: 'join', sessionId: detail.id, series: true })) joinSeries.mutate(detail.series_id!);
              }}
              loading={joinSeries.isPending}
            />
          ) : null}

          {!isHost ? <Button label={t('session.reportSession')} variant="ghost" icon={Icons.Flag} onPress={() => (requireAuth({ type: 'join', sessionId: detail.id }) ? setReportOpen(true) : undefined)} /> : null}
        </View>
      </Animated.ScrollView>

      {/* Barre du haut, par-dessus la couverture */}
      <View className="absolute left-0 right-0 flex-row justify-between px-4" style={{ top: insets.top + 8 }}>
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} variant="overlay" onPress={back} />
        <View className="flex-row gap-2">
          <IconButton
            icon={Icons.BookmarkSimple}
            label={detail.is_saved ? t('session.saved') : t('session.save')}
            variant={detail.is_saved ? 'ink' : 'overlay'}
            onPress={() => (userId ? toggleSaved.mutate({ id: detail.id, saved: !detail.is_saved }) : router.push('/auth'))}
          />
          <IconButton icon={Icons.ShareNetwork} label={t('common.share')} variant="overlay" onPress={() => void shareSession(detail, t)} />
        </View>
      </View>

      {/* Barre inférieure collante : prix + grand bouton */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-3 border-t border-line bg-surface px-4 pt-3" style={[elevation.sticky, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View className="min-w-[72px] gap-1">
          <PriceBadge cents={detail.price_cents} currency={detail.currency} className="self-start" />
          {detail.my_status === 'waitlist' && detail.my_waitlist_position ? (
            <Text variant="caption" tone="soft" tabular>
              {t('session.waitlistPosition', { position: detail.my_waitlist_position })}
            </Text>
          ) : null}
        </View>
        <View className="flex-1">
          <JoinButton
            state={state}
            size="lg"
            fullWidth
            loading={joiningId === detail.id || leave.isPending}
            onJoin={() => requestJoin(detail)}
            onManage={() => setManageOpen(true)}
          />
        </View>
      </View>

      {/* Gestion : inscrit, en attente ou organisateur */}
      <Sheet open={manageOpen} onClose={() => setManageOpen(false)} title={isHost ? t('session.youHost') : state === 'waitlisted' ? t('common.onWaitlist') : t('common.joined')}>
        <View className="gap-3">
          <Button label={t('common.addToCalendar')} variant="outline" icon={Icons.CalendarBlank} onPress={() => void addSessionToCalendar(detail).finally(() => setManageOpen(false))} />
          <Button label={t('common.invite')} variant="outline" icon={Icons.UserPlus} onPress={() => void shareSession(detail, t)} />
          {state === 'joined' && open ? (
            <Button
              label={guestCount ? `${t('session.bringGuest')} ✓` : t('session.bringGuest')}
              variant="outline"
              icon={Icons.Plus}
              loading={setGuest.isPending}
              onPress={() => setGuest.mutate({ session: detail, guest: !guestCount })}
            />
          ) : null}
          {isHost ? (
            <>
              {started && detail.status === 'published' ? (
                <Button label={t('session.checkin')} icon={Icons.Check} onPress={() => (setManageOpen(false), router.push({ pathname: '/session/[id]/checkin', params: { id: detail.id } }))} />
              ) : null}
              <Button label={t('session.duplicate')} variant="outline" icon={Icons.Copy} onPress={() => (setManageOpen(false), router.push({ pathname: '/create', params: { from: detail.id } }))} />
              {open ? <Button label={t('session.cancelSession')} variant="danger" onPress={() => (setManageOpen(false), setCancelOpen(true))} /> : null}
            </>
          ) : open ? (
            <Button
              label={state === 'waitlisted' ? t('common.leaveWaitlist') : t('common.leave')}
              variant="danger"
              onPress={() => {
                setManageOpen(false);
                leave.mutate({ session: detail, guestCount });
              }}
            />
          ) : null}
        </View>
      </Sheet>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={t('session.cancelSession')}>
        <View className="gap-4">
          <Text tone="soft">{t('session.cancelConfirm')}</Text>
          <TextField label={t('session.cancelReason')} value={reason} onChangeText={setReason} maxLength={300} multiline />
          <Button
            label={t('session.cancelSession')}
            variant="danger"
            loading={cancel.isPending}
            onPress={() => cancel.mutate({ session: detail, reason }, { onSuccess: () => setCancelOpen(false) })}
          />
          <Button label={t('common.back')} variant="ghost" onPress={() => setCancelOpen(false)} />
        </View>
      </Sheet>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="session" targetId={detail.id} />
      {joinSheet}
    </View>
  );
}
