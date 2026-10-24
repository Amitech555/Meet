import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { ActivityIcon } from './ActivityIcon';
import { tintFor } from '@design/tokens';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

export type CategoryLike = { icon: string; tint: string; name_fr: string; name_en: string };

export function categoryName(c: Pick<CategoryLike, 'name_fr' | 'name_en'>, lang: string) {
  return lang === 'en' ? c.name_en : c.name_fr;
}

/**
 * Pastille de catégorie colorée. Non sélectionnée : point de couleur + pictogramme
 * sur surface ; sélectionnée : aplat de la teinte (l'état ne repose pas que sur la couleur :
 * le contour change et l'état est annoncé aux lecteurs d'écran).
 */
export function CategoryChip({
  category,
  selected,
  onPress,
  size = 'md',
  className,
}: {
  category: CategoryLike;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const tint = tintFor(category.tint);
  const name = categoryName(category, i18n.language);
  const filled = selected || !onPress;
  const inner = (
    <>
      <View
        className={cn('items-center justify-center rounded-pill', size === 'sm' ? 'h-5 w-5' : 'h-8 w-8')}
        style={{ backgroundColor: filled ? 'transparent' : tint.bg }}
      >
        <ActivityIcon name={category.icon} size={size === 'sm' ? 14 : 18} color={tint.fg} />
      </View>
      <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} tone="inherit" className={cn('font-semibold', !filled && 'text-ink')} style={filled ? { color: tint.fg } : undefined}>
        {name}
      </Text>
    </>
  );
  const cls = cn(
    'flex-row items-center gap-1 rounded-pill border',
    size === 'sm' ? 'min-h-[28px] pl-2 pr-3' : 'min-h-tap pl-2 pr-4 gap-2',
    !filled && 'border-line bg-surface',
    selected && 'border-2 border-ink',
    className,
  );
  const style = filled ? { backgroundColor: tint.bg, borderColor: selected ? undefined : tint.bg } : undefined;
  if (!onPress) {
    return (
      <View className={cls} style={style} accessibilityLabel={t('a11y.category', { name })}>
        {inner}
      </View>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={name}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      className={cls}
      style={style}
    >
      {inner}
    </PressableScale>
  );
}
