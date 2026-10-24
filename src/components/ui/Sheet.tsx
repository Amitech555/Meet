import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { springs, durations } from '@design/tokens';
import { useTheme } from '@/design/theme';

/** Feuille modale du bas. Le contenu reste dans le flux d'accessibilité (rôle dialogue). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(600);
  const fade = useSharedValue(0);

  // Monte la feuille dès l'ouverture (mise à jour pendant le rendu, pas dans un effet)
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      fade.set(withTiming(1, { duration: durations.fast }));
      y.set(reduced ? 0 : withSpring(0, springs.gentle));
    } else if (mounted) {
      fade.set(withTiming(0, { duration: durations.fast }));
      y.set(
        withTiming(600, { duration: reduced ? 0 : durations.base }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, mounted, fade, y, reduced]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[{ flex: 1, backgroundColor: colors.overlay }, backdropStyle]}>
        <Pressable className="flex-1" onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[sheetStyle, { paddingBottom: Math.max(insets.bottom, 16) }]}
        className="absolute bottom-0 left-0 right-0 rounded-t-card bg-bg px-5 pt-3"
      >
        <View className="mb-3 h-1 w-10 self-center rounded-pill bg-line" />
        {title ? (
          <Text variant="title" className="mb-4" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {children}
      </Animated.View>
    </Modal>
  );
}
