import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icons } from './icons';
import { useTheme } from '@/design/theme';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

/** Case à cocher (≥ 48 px de zone tactile, état annoncé, coche visible — pas seulement la couleur). */
export function Checkbox({ checked, onChange, label, children }: { checked: boolean; onChange: (v: boolean) => void; label: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        onChange(!checked);
      }}
      className="min-h-tap flex-row items-start gap-3 py-2"
    >
      <View className={cn('mt-0.5 h-6 w-6 items-center justify-center rounded-[6px] border-2', checked ? 'border-ink bg-ink' : 'border-inkSoft bg-surface')}>
        {checked ? <Icons.Check size={16} weight="bold" color={colors.bg} /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
