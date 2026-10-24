import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { ReactNode } from 'react';

/** Bandeau qui défile en boucle (contenu doublé). Immobile si « réduire les animations ». */
export function Marquee({ children, speed = 30, reverse }: { children: ReactNode; speed?: number; reverse?: boolean }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!width || reduced) return;
    x.set(reverse ? -width : 0);
    x.set(withRepeat(withTiming(reverse ? 0 : -width, { duration: (width / speed) * 1000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [width, reduced, reverse, speed, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View className="overflow-hidden" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={style} className="flex-row">
        <View className="flex-row gap-2 pr-2" onLayout={onLayout}>
          {children}
        </View>
        <View className="flex-row gap-2 pr-2">{children}</View>
      </Animated.View>
    </View>
  );
}
