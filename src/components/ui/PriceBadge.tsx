import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/money';

/** « Gratuit » en citron, « 12 $ » en encre. */
export function PriceBadge({ cents, currency = 'CAD', className }: { cents: number; currency?: string; className?: string }) {
  const { t, i18n } = useTranslation();
  const free = cents <= 0;
  const label = free ? t('common.free') : formatPrice(cents, i18n.language, currency);
  return (
    <View
      accessibilityLabel={t('a11y.price', { price: label })}
      className={cn('min-h-[28px] justify-center rounded-pill px-3', free ? 'bg-citron' : 'bg-ink', className)}
    >
      <Text variant="caption" tone={free ? 'onCitron' : 'inherit'} tabular className={cn('font-bold', !free && 'text-bg')}>
        {label}
      </Text>
    </View>
  );
}

/** « Plus que 2 places » (citron) / « Complet » (encre) / « 5 places » (neutre). */
export function SpotsBadge({ left, className }: { left: number; className?: string }) {
  const { t } = useTranslation();
  if (left <= 0) {
    return (
      <View className={cn('min-h-[28px] justify-center rounded-pill bg-ink px-3', className)}>
        <Text variant="caption" tone="inherit" className="font-bold text-bg">
          {t('common.full')}
        </Text>
      </View>
    );
  }
  const urgent = left <= 3;
  return (
    <View
      accessibilityLabel={t('a11y.spots', { count: left })}
      className={cn('min-h-[28px] justify-center rounded-pill px-3', urgent ? 'bg-citron' : 'border border-line bg-surface', className)}
    >
      <Text variant="caption" tone={urgent ? 'onCitron' : 'ink'} tabular className="font-bold">
        {urgent ? t('common.onlySpotsLeft', { count: left }) : t('common.spotsLeft', { count: left })}
      </Text>
    </View>
  );
}
