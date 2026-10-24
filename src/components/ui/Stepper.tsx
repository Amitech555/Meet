import { View } from 'react-native';
import { IconButton } from './Button';
import { Text } from './Text';
import { Icons } from './icons';

/** Compteur − valeur + (zones tactiles 48 px, ajustable au lecteur d'écran). */
export function Stepper({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <View
      className="flex-1 gap-2"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
      }}
    >
      <Text variant="caption" className="font-semibold">
        {label}
      </Text>
      <View className="flex-row items-center justify-between rounded-pill border border-line bg-surface p-1">
        <IconButton icon={Icons.Minus} label={`${label} −`} variant="ghost" onPress={() => onChange(Math.max(min, value - step))} />
        <Text variant="title" tabular>
          {value}
        </Text>
        <IconButton icon={Icons.Plus} label={`${label} +`} variant="ghost" onPress={() => onChange(Math.min(max, value + step))} />
      </View>
    </View>
  );
}
