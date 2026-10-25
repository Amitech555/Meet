import { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { AvatarStack } from '../ui/Avatar';
import { CategoryChip } from '../ui/CategoryChip';
import { PriceBadge, SpotsBadge } from '../ui/PriceBadge';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { Icons } from '../ui/icons';
import { ActivityIcon } from '../ui/ActivityIcon';
import { GeneratedCover } from './GeneratedCover';
import { JoinButton, joinStateFor } from './JoinButton';
import { TimeBlock, useDayLabel } from './TimeBlock';
import { palette, tintFor } from '@design/tokens';
import { useTheme } from '@/design/theme';
import { formatDistance } from '@/lib/geo';
import { formatStartTime } from '@/lib/time';
import { formatPrice } from '@/lib/money';
import { currentLocale } from '@/i18n';
import { spotsLeft, type SessionSummary } from '@/features/sessions/types';
import { cn } from '@/lib/cn';
import { useNow } from '@/lib/useNow';

export type SessionCardProps = {
  session: SessionSummary;
  onPress: () => void;
  onJoin: () => void;
  onManage?: () => void;
  currentUserId?: string | null;
  variant?: 'compact' | 'featured' | 'carousel';
  joining?: boolean;
  className?: string;
};

function useA11yLabel(s: SessionSummary) {
  const { t, i18n } = useTranslation();
  const dayLabel = useDayLabel();
  const left = spotsLeft(s);
  const name = i18n.language === 'en' ? s.category.name_en : s.category.name_fr;
  return [
    s.title,
    name,
    t('a11y.startsAt', { day: dayLabel(s.starts_at), time: formatStartTime(s.starts_at, currentLocale()) }),
    s.venue_name,
    left > 0 ? t('a11y.spots', { count: left }) : t('common.full'),
    s.price_cents > 0 ? t('a11y.price', { price: formatPrice(s.price_cents, i18n.language, s.currency) }) : t('common.free'),
  ].join(', ');
}

function Meta({ s }: { s: SessionSummary }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const dist = s.distance_m != null ? formatDistance(s.distance_m, t, i18n.language) : null;
  return (
    <View className="flex-row items-center gap-1">
      <Icons.MapPin size={14} weight="bold" color={colors.inkSoft} />
      <Text variant="caption" tone="soft" numberOfLines={1} className="flex-shrink">
        {s.venue_name}
        {dist ? ` · ${dist}` : ''}
      </Text>
    </View>
  );
}

/**
 * Carte de session — composant central du feed.
 * compact : bloc heure coloré à gauche ; featured : grande couverture ; carousel : pour la vue carte.
 */
export const SessionCard = memo(function SessionCard({
  session: s,
  onPress,
  onJoin,
  onManage,
  currentUserId,
  variant = 'compact',
  joining,
  className,
}: SessionCardProps) {
  const tint = tintFor(s.category.tint);
  const left = spotsLeft(s);
  const now = useNow();
  const open = s.status === 'published' && new Date(s.starts_at).getTime() > now;
  const priorityLocked = !!s.priority_until && !s.i_have_priority;
  const state = joinStateFor(s.my_status, left, open, currentUserId === s.host.id || !!s.can_manage, priorityLocked);
  const a11y = useA11yLabel(s);
  const { t } = useTranslation();

  const spots =
    left > 0 && left <= 3 ? (
      <SpotsBadge left={left} />
    ) : (
      <Text variant="caption" tone="soft" tabular className="font-semibold">
        {left > 0 ? t('common.spotsLeft', { count: left }) : t('common.full')}
      </Text>
    );

  const footer = (
    <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <AvatarStack people={s.participants_preview} total={s.joined_count} max={3} size={28} />
      <JoinButton state={state} onJoin={onJoin} onManage={onManage ?? onPress} loading={joining} priorityUntil={s.priority_until} />
    </View>
  );

  if (variant === 'featured') {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} className={cn('overflow-hidden rounded-card border border-line bg-surface', className)} scaleTo={0.985}>
        <View>
          {s.cover_url ? (
            <Image source={{ uri: s.cover_url }} placeholder={s.cover_blurhash ? { blurhash: s.cover_blurhash } : undefined} style={{ height: 180 }} contentFit="cover" transition={200} />
          ) : (
            <GeneratedCover seed={s.id} tint={s.category.tint} icon={s.category.icon} height={180} iconPosition="right" />
          )}
          {/* Voile léger sur les photos pour la lisibilité de l'heure */}
          {s.cover_url ? <View className="absolute bottom-0 left-0 right-0 top-0 bg-ink/30" /> : null}
          <View className="absolute bottom-3 left-4">
            <TimeBlock iso={s.starts_at} fg={s.cover_url ? palette.white : tint.fg} size="lg" />
          </View>
          <View className="absolute right-3 top-3">
            <PriceBadge cents={s.price_cents} currency={s.currency} />
          </View>
        </View>
        <View className="gap-3 p-4">
          <View className="gap-1">
            <Text variant="title" numberOfLines={2}>
              {s.title}
            </Text>
            <Meta s={s} />
          </View>
          <View className="flex-row items-center gap-2">
            <CategoryChip category={s.category} size="sm" />
            {spots}
          </View>
          {footer}
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      className={cn('overflow-hidden rounded-card border border-line bg-surface', variant === 'carousel' && 'w-[320px]', className)}
      scaleTo={0.985}
    >
      <View className="flex-row">
        <View className="w-[104px] justify-between gap-3 p-3" style={{ backgroundColor: tint.bg }}>
          <TimeBlock iso={s.starts_at} fg={tint.fg} />
          <ActivityIcon name={s.category.icon} size={26} color={tint.fg} />
        </View>
        <View className="flex-1 gap-1 p-4 pb-3">
          <View className="flex-row items-start justify-between gap-2">
            <Text variant="heading" numberOfLines={2} className="flex-1 text-lg leading-[24px]">
              {s.title}
            </Text>
            <PriceBadge cents={s.price_cents} currency={s.currency} />
          </View>
          <Meta s={s} />
          <View className="mt-1 flex-row">{spots}</View>
        </View>
      </View>
      <View className="border-t border-line px-4 py-3">{footer}</View>
    </PressableScale>
  );
});
