import { View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { Icon } from './icons';
import { useTheme } from '@/design/theme';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

export type PillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: Icon;
  trailingIcon?: Icon;
  size?: 'sm' | 'md';
  className?: string;
  accessibilityLabel?: string;
};

/** Pastille sélectionnable (filtres, raccourcis de date, choix). Sélection = aplat encre + coche implicite. */
export function Pill({ label, selected, onPress, icon: I, trailingIcon: T, size = 'md', className, accessibilityLabel }: PillProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.bg : colors.ink;
  const content = (
    <>
      {I ? <I size={size === 'sm' ? 14 : 18} weight="bold" color={fg} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} tone="inherit" className={cn(selected ? 'text-bg' : 'text-ink', size === 'sm' && 'font-medium')}>
        {label}
      </Text>
      {T ? <T size={14} weight="bold" color={fg} /> : null}
    </>
  );
  const cls = cn(
    'flex-row items-center gap-2 rounded-pill border',
    size === 'sm' ? 'min-h-[32px] px-3' : 'min-h-tap px-4',
    selected ? 'border-ink bg-ink' : 'border-line bg-surface',
    className,
  );
  if (!onPress) return <View className={cls}>{content}</View>;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      className={cls}
      hitSlop={size === 'sm' ? 8 : 0}
    >
      {content}
    </PressableScale>
  );
}
