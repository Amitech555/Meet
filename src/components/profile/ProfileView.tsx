import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { CategoryChip } from '../ui/CategoryChip';
import { Pill } from '../ui/Pill';
import { Icons } from '../ui/icons';
import { SessionCard } from '../session/SessionCard';
import type { PublicProfile } from '@/features/auth/types';
import { useTheme } from '@/design/theme';
import { useJoinFlow } from '@/features/sessions/useJoinFlow';
import { useUserId } from '@/stores/auth';
import { formatMonthYear } from '@/lib/time';
import { currentLocale } from '@/i18n';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 gap-1 rounded-card border border-line bg-surface p-4">
      <Text variant="display" tabular>
        {value}
      </Text>
      <Text variant="caption" tone="soft">
        {label}
      </Text>
    </View>
  );
}

/** En-tête + stats + activités + avis en tags + sessions à venir organisées. */
export function ProfileView({ profile: p, avatarAction }: { profile: PublicProfile; avatarAction?: React.ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const uid = useUserId();
  const { requestJoin, sheet } = useJoinFlow();
  const since = formatMonthYear(p.member_since, currentLocale());
  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-4">
        <View>
          <Avatar person={p} size={88} />
          {avatarAction}
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1">
            <Text variant="display" numberOfLines={1} className="flex-shrink">
              {p.display_name}
            </Text>
            {p.verified ? (
              <View accessible accessibilityLabel={t('common.verified')}>
                <Icons.ShieldCheck size={22} weight="fill" color={colors.success} />
              </View>
            ) : null}
          </View>
          <Text variant="caption" tone="soft">
            {[p.city?.name, t('profile.memberSince', { date: since })].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {p.bio ? <Text>{p.bio}</Text> : null}

      <View className="flex-row gap-3">
        <Stat value={String(p.sessions_played)} label={t('profile.playedLabel')} />
        <Stat value={p.reliability != null ? `${p.reliability} %` : '—'} label={p.reliability != null ? t('profile.reliability') : t('profile.reliabilityNew')} />
        <Stat value={String(p.sessions_hosted)} label={t('profile.hostedLabel')} />
      </View>

      {p.interests.length ? (
        <View className="gap-2">
          <Text variant="label" tone="soft">
            {t('profile.activities')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {p.interests.map((c) => (
              <CategoryChip key={c.id} category={c} size="sm" />
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-2">
        <Text variant="label" tone="soft">
          {t('profile.reviews')}
        </Text>
        {p.tags.length ? (
          <View className="flex-row flex-wrap gap-2">
            {p.tags.map((tag) => (
              <Pill key={tag.tag} icon={Icons.ThumbsUp} label={`${t(`review.tags.${tag.tag}`)} · ${tag.count}`} />
            ))}
          </View>
        ) : (
          <Text tone="soft">{t('profile.noReviews')}</Text>
        )}
      </View>

      {p.upcoming_hosted.length ? (
        <View className="gap-3">
          <Text variant="title">{t('profile.upcoming')}</Text>
          {p.upcoming_hosted.map((s) => (
            <SessionCard key={s.id} session={s} onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })} onJoin={() => requestJoin(s)} currentUserId={uid} />
          ))}
        </View>
      ) : null}
      {sheet}
    </View>
  );
}
