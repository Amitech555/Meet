import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { AvatarStack } from '../ui/Avatar';
import { Icons } from '../ui/icons';
import { GeneratedCover } from '../session/GeneratedCover';
import { useDayLabel } from '../session/TimeBlock';
import type { GroupCard as Group } from '@/features/groups/types';
import { useTheme } from '@/design/theme';
import { tintFor } from '@design/tokens';
import { formatStartTime } from '@/lib/time';
import { currentLocale } from '@/i18n';

/** Carte de groupe : couverture, rythme, prochaine session mise en évidence, membres. */
export function GroupCard({ group: g, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dayLabel = useDayLabel();
  const tint = tintFor(g.category.tint);
  const next = g.next_session;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${g.name}. ${g.rhythm_label ?? ''}`} className="overflow-hidden rounded-card border border-line bg-surface" scaleTo={0.985}>
      <View>
        {g.cover_url ? (
          <Image source={{ uri: g.cover_url }} style={{ height: 110 }} contentFit="cover" />
        ) : (
          <GeneratedCover seed={g.id} tint={g.category.tint} icon={g.category.icon} height={110} iconPosition="right" />
        )}
        {g.visibility === 'private' ? (
          <View className="absolute left-3 top-3 flex-row items-center gap-1 rounded-pill bg-ink px-3 py-1">
            <Icons.LockSimple size={14} weight="bold" color={colors.bg} />
            <Text variant="caption" tone="inherit" className="font-semibold text-bg">
              {t('groups.private')}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text variant="title" numberOfLines={2}>
            {g.name}
          </Text>
          {g.rhythm_label ? (
            <View className="flex-row items-center gap-1">
              <Icons.ArrowsClockwise size={14} weight="bold" color={colors.inkSoft} />
              <Text variant="caption" tone="soft">
                {g.rhythm_label}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center justify-between rounded-field px-3 py-2" style={{ backgroundColor: next ? tint.bg : undefined }}>
          {next ? (
            <>
              <Text variant="caption" tone="inherit" className="font-semibold" style={{ color: tint.fg }}>
                {t('groups.nextSession')}
              </Text>
              <Text variant="bodyStrong" tone="inherit" tabular style={{ color: tint.fg }}>
                {`${dayLabel(next.starts_at)} · ${formatStartTime(next.starts_at, currentLocale())}`}
              </Text>
            </>
          ) : (
            <Text variant="caption" tone="soft">
              {t('groups.noNextSession')}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <AvatarStack people={g.members_preview} total={g.member_count} max={4} size={26} />
          <Text variant="caption" tone="soft" tabular>
            {t('groups.members', { count: g.member_count })}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}
