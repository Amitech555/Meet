import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useToast } from '@/stores/toast';
import { cn } from '@/lib/cn';

/** Message court, non bloquant, en bas de l'écran (au-dessus de la barre d'onglets). */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const id = setTimeout(hide, 3200);
    return () => clearTimeout(id);
  }, [current, hide]);

  if (!current) return null;
  const bg = { default: 'bg-ink', success: 'bg-ink', error: 'bg-danger', celebrate: 'bg-citron' }[current.tone];
  return (
    <Animated.View
      key={current.id}
      entering={FadeInDown.springify().damping(20).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96 }}
      className={cn('rounded-card px-5 py-4', bg)}
    >
      <Text variant="bodyStrong" tone="inherit" className={current.tone === 'celebrate' ? 'text-onCitron' : 'text-bg'}>
        {current.message}
      </Text>
    </Animated.View>
  );
}
