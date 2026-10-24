import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Button } from './Button';
import { Text } from './Text';
import type { Icon } from './icons';
import { categoryTints } from '@design/tokens';
import { cn } from '@/lib/cn';

/** Composition géométrique aux couleurs des catégories (pas d'illustration générique). */
function Shapes({ variant = 0 }: { variant?: number }) {
  const a = categoryTints.orange.bg;
  const b = categoryTints.turquoise.bg;
  const c = categoryTints.jaune.bg;
  const d = categoryTints.encre.bg;
  return (
    <Svg width={168} height={96} viewBox="0 0 168 96" accessibilityElementsHidden>
      {variant % 2 === 0 ? (
        <>
          <Circle cx={36} cy={52} r={34} fill={a} />
          <Rect x={62} y={22} width={52} height={52} rx={12} fill={b} transform="rotate(12 88 48)" />
          <Path d="M118 86 L144 30 L168 86 Z" fill={c} />
          <Circle cx={92} cy={50} r={8} fill={d} />
        </>
      ) : (
        <>
          <Rect x={4} y={30} width={60} height={60} rx={30} fill={c} />
          <Path d="M58 90 L92 10 L126 90 Z" fill={d} />
          <Circle cx={140} cy={60} r={26} fill={a} />
          <Rect x={86} y={60} width={22} height={22} rx={4} fill={b} />
        </>
      )}
    </Svg>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  actionIcon,
  variant = 0,
  className,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: Icon;
  variant?: number;
  className?: string;
}) {
  return (
    <View className={cn('items-start gap-4 rounded-card border border-line bg-surface p-6', className)}>
      <Shapes variant={variant} />
      <View className="gap-1">
        <Text variant="title">{title}</Text>
        {body ? (
          <Text variant="body" tone="soft">
            {body}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon={actionIcon} /> : null}
    </View>
  );
}

/** Erreur humaine avec action « Réessayer ». */
export function ErrorState({ message, onRetry, retryLabel, icon: I }: { message: string; onRetry?: () => void; retryLabel: string; icon?: Icon }) {
  return (
    <View className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-4" accessibilityRole="alert">
      {I ? <I size={24} weight="bold" color={categoryTints.rouge.bg} /> : null}
      <Text variant="caption" className="flex-1">
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}
