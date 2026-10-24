import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../ui/Sheet';
import { Pill } from '../ui/Pill';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import type { FeedFilters, PriceFilter } from '@/stores/prefs';
import type { SessionLevel } from '@/features/sessions/types';

const levels: SessionLevel[] = ['beginner', 'intermediate', 'advanced'];
const radii = [null, 2, 5, 10] as const;

/** Filtres secondaires : prix, niveau, distance. */
export function FiltersSheet({
  open,
  onClose,
  filters,
  onChange,
  hasPosition,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  filters: FeedFilters;
  onChange: (f: Partial<FeedFilters>) => void;
  hasPosition: boolean;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const prices: { key: PriceFilter; label: string }[] = [
    { key: 'all', label: t('discover.priceAll') },
    { key: 'free', label: t('discover.priceFree') },
    { key: 'paid', label: t('discover.pricePaid') },
  ];
  return (
    <Sheet open={open} onClose={onClose} title={t('discover.filters')}>
      <View className="gap-5">
        <View className="gap-2">
          <Text variant="label" tone="soft">
            {t('create.price')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {prices.map((p) => (
              <Pill key={p.key} label={p.label} selected={filters.price === p.key} onPress={() => onChange({ price: p.key })} />
            ))}
          </View>
        </View>
        <View className="gap-2">
          <Text variant="label" tone="soft">
            {t('discover.level')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {levels.map((l) => (
              <Pill
                key={l}
                label={t(`levels.${l}`)}
                selected={filters.levels.includes(l)}
                onPress={() => onChange({ levels: filters.levels.includes(l) ? filters.levels.filter((x) => x !== l) : [...filters.levels, l] })}
              />
            ))}
          </View>
        </View>
        {hasPosition ? (
          <View className="gap-2">
            <Text variant="label" tone="soft">
              {t('discover.distance')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {radii.map((r) => (
                <Pill key={String(r)} label={r ? t('discover.distanceKm', { value: r }) : t('discover.distanceAny')} selected={filters.radiusKm === r} onPress={() => onChange({ radiusKm: r })} />
              ))}
            </View>
          </View>
        ) : null}
        <View className="flex-row gap-2">
          <Button label={t('discover.clearFilters')} variant="outline" onPress={onReset} />
          <Button label={t('discover.apply')} className="flex-1" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
