// Version web / par défaut : MapLibre n'existe qu'en natif. On garde le carrousel et on l'explique.
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../ui/Text';
import { Icons } from '../ui/icons';
import { useTheme } from '@/design/theme';
import { MapCarousel } from './MapCarousel';
import type { SessionMapProps } from './types';

export function SessionMap(props: SessionMapProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View className="flex-1 justify-end gap-4 bg-night pb-28">
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Icons.MapTrifold size={48} weight="bold" color={colors.onNight} />
        <Text tone="onNight" className="text-center">
          {t('discover.mapUnavailable')}
        </Text>
      </View>
      <MapCarousel {...props} />
    </View>
  );
}
