// Web / défaut : pas de MapLibre ; un bloc graphique avec le repère suffit, « Ouvrir dans Plans » fait le reste.
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Icons } from '../ui/icons';
import { useTheme } from '@/design/theme';
import { tintFor } from '@design/tokens';

export function MiniMap({ tint }: { lat: number; lng: number; tint: string }) {
  const { colors } = useTheme();
  const t = tintFor(tint);
  return (
    <View className="h-36 items-center justify-center overflow-hidden rounded-card bg-night" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 300 140" style={{ position: 'absolute' }} preserveAspectRatio="xMidYMid slice">
        <Path d="M0 90 C 60 70, 120 120, 300 60" stroke={colors.onNight} strokeOpacity={0.18} strokeWidth={10} fill="none" />
        <Path d="M40 0 L 110 140 M 180 0 L 230 140 M 0 30 L 300 45" stroke={colors.onNight} strokeOpacity={0.1} strokeWidth={4} fill="none" />
      </Svg>
      <View className="h-12 w-12 items-center justify-center rounded-pill border-2 border-surface" style={{ backgroundColor: t.bg }}>
        <Icons.MapPin size={24} weight="fill" color={t.fg} />
      </View>
    </View>
  );
}
