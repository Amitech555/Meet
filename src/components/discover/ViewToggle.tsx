import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { Icons } from '../ui/icons';
import { useTheme } from '@/design/theme';
import { elevation } from '@design/tokens';
import { haptics } from '@/lib/haptics';

/** Pastille flottante Liste ⇄ Carte. */
export function ViewToggle({ view, onChange }: { view: 'list' | 'map'; onChange: (v: 'list' | 'map') => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const next = view === 'list' ? 'map' : 'list';
  const I = view === 'list' ? Icons.MapTrifold : Icons.ListBullets;
  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 items-center" style={{ bottom: Math.max(insets.bottom, 8) + 84 }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t(next === 'map' ? 'discover.map' : 'discover.list')}
        onPress={() => {
          haptics.tap();
          onChange(next);
        }}
        className="min-h-tap flex-row items-center gap-2 rounded-pill bg-ink px-5"
        style={elevation.raised}
      >
        <I size={20} weight="bold" color={colors.bg} />
        <Text variant="bodyStrong" tone="inherit" className="text-bg">
          {t(next === 'map' ? 'discover.map' : 'discover.list')}
        </Text>
      </PressableScale>
    </View>
  );
}
