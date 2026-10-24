import { Text as RNText, type TextProps } from 'react-native';
import { cn } from '@/lib/cn';

type Variant = 'hero' | 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'time';
type Tone = 'ink' | 'soft' | 'signal' | 'onSignal' | 'onCitron' | 'onNight' | 'danger' | 'success' | 'inherit';

const variants: Record<Variant, string> = {
  hero: 'font-display text-xxl',
  display: 'font-display text-xl',
  title: 'font-display-bold text-lg',
  heading: 'font-semibold text-md',
  body: 'font-body text-md',
  bodyStrong: 'font-semibold text-md',
  caption: 'font-body text-sm',
  label: 'font-medium text-xs uppercase tracking-wide',
  // Chiffres tabulaires pour heures, prix et places
  time: 'font-display text-xl',
};

const tones: Record<Tone, string> = {
  ink: 'text-ink',
  soft: 'text-inkSoft',
  signal: 'text-signal',
  onSignal: 'text-onSignal',
  onCitron: 'text-onCitron',
  onNight: 'text-onNight',
  danger: 'text-danger',
  success: 'text-success',
  inherit: '',
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  tabular?: boolean;
  className?: string;
};

export function Text({ variant = 'body', tone = 'ink', tabular, className, style, ...rest }: AppTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      className={cn(variants[variant], tones[tone], className)}
      style={[tabular || variant === 'time' ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
}
