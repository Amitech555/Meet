import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { cssInterop } from 'nativewind';
import { springs } from '@design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: 'style' });

export type PressableScaleProps = PressableProps & { className?: string; scaleTo?: number };

/** Pressable avec léger enfoncement au toucher (désactivé si « réduire les animations »). */
export function PressableScale({ scaleTo = 0.97, onPressIn, onPressOut, style, ...rest }: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      onPressIn={(e) => {
        if (!reduced) scale.set(withSpring(scaleTo, springs.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) scale.set(withSpring(1, springs.snappy));
        onPressOut?.(e);
      }}
      style={[animated, style as object]}
      {...rest}
    />
  );
}
