import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { useRoster, useSubmitReviews } from '@/features/profile/hooks';
import type { ReviewInput } from '@/features/profile/api';
import { useUserId } from '@/stores/auth';
import { errorMessage } from '@/lib/errors';

const TAGS = ['punctual', 'fairplay', 'friendly', 'skilled', 'organized'] as const;

/** Avis rapides : 👍/👎 en un tap par personne + tags. Anonymes pour les autres. */
export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const uid = useUserId();
  const roster = useRoster(id);
  const submit = useSubmitReviews();
  const [reviews, setReviews] = useState<Record<string, ReviewInput>>({});
  const people = roster.data?.filter((p) => p.id !== uid && p.status === 'attended') ?? [];

  const setRating = (pid: string, rating: 1 | -1) => setReviews((r) => ({ ...r, [pid]: { reviewed_id: pid, rating, tags: r[pid]?.rating === rating ? r[pid]!.tags : [] } }));
  const toggleTag = (pid: string, tag: string) =>
    setReviews((r) => {
      const cur = r[pid] ?? { reviewed_id: pid, rating: 1 as const, tags: [] };
      return { ...r, [pid]: { ...cur, rating: 1, tags: cur.tags.includes(tag) ? cur.tags.filter((x) => x !== tag) : [...cur.tags, tag] } };
    });

  const done = () => (router.canGoBack() ? router.back() : router.replace('/sessions'));

  return (
    <Screen scroll>
      <IconButton icon={Icons.X} label={t('common.close')} onPress={done} />
      <View className="gap-2">
        <Text variant="display" accessibilityRole="header">
          {t('review.title')}
        </Text>
        <Text tone="soft">{t('review.body')}</Text>
      </View>
      {roster.isLoading ? (
        [0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)
      ) : roster.isError ? (
        <ErrorState message={errorMessage(roster.error, t)} retryLabel={t('common.retry')} onRetry={() => roster.refetch()} icon={Icons.WifiSlash} />
      ) : people.length === 0 ? (
        <EmptyState title={t('review.nothingToReview')} variant={1} />
      ) : (
        people.map((p) => {
          const r = reviews[p.id];
          return (
            <View key={p.id} className="gap-3 rounded-card border border-line bg-surface p-4">
              <View className="flex-row items-center gap-3">
                <Avatar person={p} size={44} />
                <Text variant="title" className="flex-1">
                  {p.display_name}
                </Text>
                <IconButton icon={Icons.ThumbsUp} label={`${t('review.thumbsUp')} : ${p.display_name}`} variant={r?.rating === 1 ? 'ink' : 'outline'} onPress={() => setRating(p.id, 1)} />
                <IconButton icon={Icons.ThumbsDown} label={`${t('review.thumbsDown')} : ${p.display_name}`} variant={r?.rating === -1 ? 'ink' : 'outline'} onPress={() => setRating(p.id, -1)} />
              </View>
              {r?.rating !== -1 ? (
                <View className="flex-row flex-wrap gap-2">
                  {TAGS.map((tag) => (
                    <Pill key={tag} size="sm" label={t(`review.tags.${tag}`)} selected={!!r?.tags.includes(tag)} onPress={() => toggleTag(p.id, tag)} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })
      )}
      {people.length ? (
        <Button
          label={t('review.submit')}
          size="lg"
          disabled={Object.keys(reviews).length === 0}
          loading={submit.isPending}
          onPress={() => submit.mutate({ sessionId: id, reviews: Object.values(reviews) }, { onSuccess: done })}
        />
      ) : null}
    </Screen>
  );
}
