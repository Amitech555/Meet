import { useEffect, useRef, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '../ui/Text';
import { Button, IconButton } from '../ui/Button';
import { Pill } from '../ui/Pill';
import { AvatarStack } from '../ui/Avatar';
import { CategoryChip } from '../ui/CategoryChip';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState, ErrorState } from '../ui/EmptyState';
import { Icons } from '../ui/icons';
import { GeneratedCover } from '../session/GeneratedCover';
import { SessionCard } from '../session/SessionCard';
import { ChatThread } from '../chat/ChatThread';
import { ReportSheet } from '../ReportSheet';
import { useFollowGroup, useGroup, useJoinGroup, useLeaveGroup } from '@/features/groups/hooks';
import { groupInviteUrl } from '@/features/groups/api';
import { useJoinFlow } from '@/features/sessions/useJoinFlow';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { useMe } from '@/features/auth/hooks';
import { useUserId } from '@/stores/auth';
import { errorMessage } from '@/lib/errors';
import { formatLongDate } from '@/lib/time';
import { currentLocale } from '@/i18n';

/** Écran de groupe : prochaine session en tête, calendrier, discussion, invitation WhatsApp. */
export function GroupScreen({ id, code, autojoin }: { id?: string; code?: string; autojoin?: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uid = useUserId();
  const me = useMe().data;
  const q = useGroup({ id, code });
  const join = useJoinGroup();
  const leave = useLeaveGroup();
  const follow = useFollowGroup();
  const requireAuth = useRequireAuth();
  const { requestJoin, joiningId, sheet } = useJoinFlow();
  const [tab, setTab] = useState<'calendar' | 'chat'>('calendar');
  const [reportOpen, setReportOpen] = useState(false);
  const autoDone = useRef(false);
  const g = q.data;
  const isMember = !!g?.my_role;

  const doJoin = () => {
    if (!g) return;
    if (requireAuth({ type: 'joinGroup', groupId: g.id, inviteCode: code })) join.mutate({ id: code ? undefined : g.id, code });
  };

  useEffect(() => {
    if (autojoin && g && !isMember && uid && !autoDone.current) {
      autoDone.current = true;
      join.mutate({ id: code ? undefined : g.id, code });
    }
  }, [autojoin, g, isMember, uid, code, join]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/groups'));

  if (q.isLoading) {
    return (
      <View className="flex-1 gap-4 bg-bg">
        <Skeleton className="h-[200px] rounded-none" tint="turquoise" />
        <View className="gap-3 px-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-40 rounded-card" />
        </View>
      </View>
    );
  }
  if (!g) {
    return (
      <View className="flex-1 justify-center bg-bg p-4">
        {q.isError ? (
          <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
        ) : (
          <EmptyState title={t('errors.notFound')} actionLabel={t('common.back')} onAction={back} variant={1} />
        )}
      </View>
    );
  }

  const invite = async () => {
    if (!g.invite_code) return;
    await Share.share({ message: t('groups.inviteMessage', { name: g.name, url: groupInviteUrl(g.invite_code) }) });
  };

  const header = (
    <View>
      <GeneratedCover seed={g.id} tint={g.category.tint} icon={g.category.icon} height={200} iconPosition="right" />
      <View className="absolute left-0 right-0 flex-row justify-between px-4" style={{ top: insets.top + 8 }}>
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} variant="overlay" onPress={back} />
        {isMember && g.invite_code ? <IconButton icon={Icons.UserPlus} label={t('groups.invite')} variant="overlay" onPress={() => void invite()} /> : null}
      </View>
      <View className="-mt-5 gap-4 rounded-t-card bg-bg px-4 pt-5">
        <View className="flex-row flex-wrap gap-2">
          <CategoryChip category={g.category} size="sm" />
          {g.visibility === 'private' ? <Pill size="sm" icon={Icons.LockSimple} label={t('groups.private')} /> : null}
          {g.my_role === 'admin' ? <Pill size="sm" label={t('groups.admin')} /> : null}
        </View>
        <Text variant="display" accessibilityRole="header">
          {g.name}
        </Text>
        {g.rhythm_label ? <Text variant="title">{g.rhythm_label}</Text> : null}
        {g.description ? <Text tone="soft">{g.description}</Text> : null}
        <View className="flex-row items-center gap-2">
          <AvatarStack people={g.members_preview} total={g.member_count} size={30} />
          <Text tone="soft" tabular>
            {t('groups.members', { count: g.member_count })}
          </Text>
        </View>
        {g.locked ? (
          <EmptyState title={t('groups.privateLocked')} variant={1} />
        ) : isMember ? (
          <View className="flex-row flex-wrap gap-2">
            {g.my_role === 'admin' ? <Button label={t('groups.newSession')} icon={Icons.Plus} onPress={() => router.push('/create')} /> : null}
            <Button label={t('groups.invite')} variant="outline" icon={Icons.LinkSimple} onPress={() => void invite()} />
            <Button label={g.is_following ? t('groups.following') : t('groups.follow')} variant="outline" icon={Icons.Bell} onPress={() => follow.mutate({ groupId: g.id, follow: !g.is_following })} />
          </View>
        ) : (
          <Button label={t('groups.join')} size="lg" loading={join.isPending} onPress={doJoin} />
        )}
        {!g.locked ? (
          <View className="flex-row gap-2" accessibilityRole="tablist">
            <Pill label={t('groups.calendar')} icon={Icons.CalendarBlank} selected={tab === 'calendar'} onPress={() => setTab('calendar')} />
            {isMember ? <Pill label={t('groups.chat')} icon={Icons.ChatCircleDots} selected={tab === 'chat'} onPress={() => setTab('chat')} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  if (tab === 'chat' && isMember) {
    return (
      <View className="flex-1 bg-bg">
        <View className="flex-row items-center gap-3 border-b border-line px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
          <IconButton icon={Icons.ArrowLeft} label={t('groups.calendar')} onPress={() => setTab('calendar')} />
          <Text variant="heading" numberOfLines={1} className="flex-1">
            {g.name}
          </Text>
        </View>
        <ChatThread thread={{ groupId: g.id }} me={me ? { id: me.id, display_name: me.display_name, avatar_url: me.avatar_url } : null} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {header}
        <View className="gap-4 px-4 pt-5">
          {g.upcoming.length ? (
            g.upcoming.map((s, i) => (
              <View key={s.id} className="gap-2">
                {i === 0 ? (
                  <Text variant="label" tone="soft">
                    {t('groups.nextSession')}
                  </Text>
                ) : g.upcoming[i - 1] && formatLongDate(g.upcoming[i - 1]!.starts_at, currentLocale()) !== formatLongDate(s.starts_at, currentLocale()) ? (
                  <Text variant="label" tone="soft">
                    {formatLongDate(s.starts_at, currentLocale())}
                  </Text>
                ) : null}
                <SessionCard
                  session={s}
                  variant={i === 0 ? 'featured' : 'compact'}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })}
                  onJoin={() => requestJoin(s)}
                  currentUserId={uid}
                  joining={joiningId === s.id}
                />
              </View>
            ))
          ) : !g.locked ? (
            <EmptyState title={t('groups.noNextSession')} variant={0} />
          ) : null}
          {isMember && g.my_role !== 'admin' ? <Button label={t('groups.leave')} variant="ghost" onPress={() => leave.mutate(g.id)} /> : null}
          {uid && g.my_role !== 'admin' ? <Button label={t('common.report')} variant="ghost" icon={Icons.Flag} onPress={() => setReportOpen(true)} /> : null}
        </View>
      </ScrollView>
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="group" targetId={g.id} />
      {sheet}
    </View>
  );
}
