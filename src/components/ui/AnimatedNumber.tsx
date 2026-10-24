import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, SlideInDown, SlideInUp, SlideOutDown, SlideOutUp } from 'react-native-reanimated';
import { Text, type AppTextProps } from './Text';

/** Compteur qui glisse vers le haut/bas quand la valeur change (places restantes). */
export function AnimatedNumber({ value, ...textProps }: { value: number } & AppTextProps) {
  const prev = useRef(value);
  const [dir, setDir] = useState<'up' | 'down'>('down');
  useEffect(() => {
    if (value !== prev.current) {
      setDir(value > prev.current ? 'up' : 'down');
      prev.current = value;
    }
  }, [value]);
  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View
        key={value}
        entering={(dir === 'up' ? SlideInDown : SlideInUp).duration(220).reduceMotion(ReduceMotion.System)}
        exiting={(dir === 'up' ? SlideOutUp : SlideOutDown).duration(220).reduceMotion(ReduceMotion.System)}
      >
        <Text tabular {...textProps}>
          {value}
        </Text>
      </Animated.View>
    </View>
  );
}
