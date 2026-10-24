import { ActivityIndicator, View, type PressableProps } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { Icon } from './icons';
import { useTheme } from '@/design/theme';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import type { ThemeColorName } from '@design/tokens';

type Variant = 'primary' | 'ink' | 'outline' | 'ghost' | 'citron' | 'danger';
type Size = 'md' | 'lg';

const containers: Record<Variant, string> = {
  primary: 'bg-signal',
  ink: 'bg-ink',
  outline: 'bg-surface border border-line',
  ghost: 'bg-transparent',
  citron: 'bg-citron',
  danger: 'bg-surface border border-danger',
};

const labelTone = {
  primary: 'onSignal',
  ink: 'inherit',
  outline: 'ink',
  ghost: 'ink',
  citron: 'onCitron',
  danger: 'danger',
} as const;

const iconColor: Record<Variant, ThemeColorName> = {
  primary: 'onSignal',
  ink: 'bg',
  outline: 'ink',
  ghost: 'ink',
  citron: 'onCitron',
  danger: 'danger',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: Icon;
  iconRight?: Icon;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  haptic?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: LeadIcon,
  iconRight: TrailIcon,
  loading,
  disabled,
  fullWidth,
  className,
  haptic = true,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const color = colors[iconColor[variant]];
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic) haptics.light();
        onPress?.(e);
      }}
      className={cn(
        'flex-row items-center justify-center rounded-pill px-5',
        size === 'lg' ? 'min-h-[56px] px-6' : 'min-h-tap',
        containers[variant],
        fullWidth && 'self-stretch',
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View className="flex-row items-center gap-2">
          {LeadIcon ? <LeadIcon size={size === 'lg' ? 22 : 20} weight="bold" color={color} /> : null}
          <Text
            variant="bodyStrong"
            tone={labelTone[variant]}
            className={cn(size === 'lg' && 'text-lg', variant === 'ink' && 'text-bg')}
            numberOfLines={1}
          >
            {label}
          </Text>
          {TrailIcon ? <TrailIcon size={20} weight="bold" color={color} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

/** Bouton icône rond (≥ 48 px) — toujours avec un label pour les lecteurs d'écran. */
export function IconButton({
  icon: I,
  label,
  onPress,
  variant = 'outline',
  className,
  badge,
}: {
  icon: Icon;
  label: string;
  onPress?: () => void;
  variant?: 'outline' | 'ghost' | 'ink' | 'overlay';
  className?: string;
  badge?: boolean;
}) {
  const { colors } = useTheme();
  const bg = {
    outline: 'bg-surface border border-line',
    ghost: 'bg-transparent',
    ink: 'bg-ink',
    overlay: 'bg-surface/90',
  }[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      className={cn('h-12 w-12 items-center justify-center rounded-pill', bg, className)}
    >
      <I size={22} weight="bold" color={variant === 'ink' ? colors.bg : colors.ink} />
      {badge ? <View className="absolute right-3 top-3 h-2 w-2 rounded-pill bg-signal" /> : null}
    </PressableScale>
  );
}
