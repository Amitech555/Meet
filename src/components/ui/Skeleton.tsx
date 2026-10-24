import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { categoryTints, type CategoryTint } from '@design/tokens';
import { cn } from '@/lib/cn';

/** Bloc de chargement pulsé ; `tint` le colore aux couleurs d'une catégorie. */
export function Skeleton({ className, tint, style }: { className?: string; tint?: CategoryTint; style?: object }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (!reduced) o.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [o, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View
      style={[animated, tint ? { backgroundColor: categoryTints[tint].pattern } : null, style]}
      className={cn(!tint && 'bg-surfaceAlt', 'rounded-field', className)}
    />
  );
}

const cycle: CategoryTint[] = ['orange', 'turquoise', 'jaune', 'encre', 'mousse', 'framboise'];

/** Squelette d'une carte de session compacte. */
export function SessionCardSkeleton({ index = 0 }: { index?: number }) {
  const tint = cycle[index % cycle.length];
  return (
    <View className="flex-row gap-4 rounded-card border border-line bg-surface p-4" accessibilityElementsHidden>
      <View className="w-16 gap-2">
        <Skeleton tint={tint} className="h-8 w-16" />
        <Skeleton className="h-3 w-12" />
      </View>
      <View className="flex-1 gap-2">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton tint={tint} className="mt-2 h-7 w-28 rounded-pill" />
      </View>
    </View>
  );
}
