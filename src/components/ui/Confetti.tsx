import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, palette } from '@design/tokens';

const COUNT = 14;

function Particle({ angle, distance, size, color, progress }: { angle: number; distance: number; size: number; color: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p + 30 * p * p },
        { rotate: `${p * 280}deg` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return <Animated.View style={[styles.particle, { width: size, height: size * 0.6, backgroundColor: color }, style]} />;
}

/**
 * Petite explosion de confettis citron (~600 ms), jamais bloquante (pointerEvents none).
 * Désactivée si « réduire les animations ».
 */
export function Confetti({ fire }: { fire: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        angle: (Math.PI * 2 * i) / COUNT - Math.PI / 2 + (i % 2 ? 0.2 : -0.1),
        distance: 46 + (i % 4) * 14,
        size: 7 + (i % 3) * 2,
        color: i % 4 === 0 ? palette.signal : i % 5 === 0 ? palette.ink : palette.citron,
      })),
    [],
  );
  useEffect(() => {
    if (!fire || reduced) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: durations.confetti, easing: Easing.out(Easing.cubic) }));
  }, [fire, reduced, progress]);
  if (reduced || !fire) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
      {particles.map((p, i) => (
        <Particle key={i} {...p} progress={progress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', borderRadius: 2 },
});
