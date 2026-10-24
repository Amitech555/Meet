import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button, IconButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { ProfileView } from '@/components/profile/ProfileView';
import { ReportSheet } from '@/components/ReportSheet';
import { useProfile } from '@/features/profile/hooks';
import { setFollowHost } from '@/features/groups/api';
import { blockUser, unblockUser } from '@/features/safety/api';
import { useUserId } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';

/** Profil public : stats, avis en tags, suivre l'organisateur, bloquer, signaler. Pas de message privé. */
export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const uid = useUserId();
  const q = useProfile(id);
  const [reportOpen, setReportOpen] = useState(false);
  const p = q.data;

  const run = async (fn: () => Promise<void>, done?: string) => {
    try {
      await fn();
      if (done) toast(done);
      void qc.invalidateQueries({ queryKey: ['profile', id] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    }
  };

  return (
    <Screen scroll>
      <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      {q.isLoading ? (
        <View className="gap-4">
          <Skeleton className="h-24 w-24 rounded-pill" tint="jaune" />
          <Skeleton className="h-6 w-1/2" />
        </View>
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
      ) : !p ? (
        <EmptyState title={t('errors.notFound')} variant={1} />
      ) : (
        <>
          <ProfileView profile={p} />
          {!p.is_me ? (
            <View className="gap-2">
              {p.sessions_hosted > 0 ? (
                <Button
                  label={p.is_following ? t('profile.unfollow') : t('profile.follow')}
                  variant={p.is_following ? 'outline' : 'ink'}
                  icon={Icons.Bell}
                  onPress={() => {
                    if (!uid) router.push('/auth');
                    else void run(() => setFollowHost(uid, p.id, !p.is_following));
                  }}
                />
              ) : null}
              {uid ? (
                <>
                  <Button
                    label={p.is_blocked ? t('profile.unblock') : t('common.block')}
                    variant="ghost"
                    icon={Icons.Prohibit}
                    onPress={() =>
                      void run(
                        () => (p.is_blocked ? unblockUser(uid, p.id) : blockUser(uid, p.id)),
                        p.is_blocked ? undefined : t('profile.blocked', { name: p.display_name }),
                      )
                    }
                  />
                  <Button label={t('common.report')} variant="ghost" icon={Icons.Flag} onPress={() => setReportOpen(true)} />
                </>
              ) : null}
            </View>
          ) : null}
          <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={p.id} />
        </>
      )}
    </Screen>
  );
}
