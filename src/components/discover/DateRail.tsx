import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pill } from '../ui/Pill';
import { Sheet } from '../ui/Sheet';
import { Icons } from '../ui/icons';
import type { FeedFilters } from '@/stores/prefs';
import { formatShortDate, nextDays } from '@/lib/time';
import { currentLocale } from '@/i18n';

const shortcuts = ['tonight', 'tomorrow', 'weekend'] as const;

/** Raccourcis « Ce soir · Demain · Cette fin de semaine · Choisir ». */
export function DateRail({ value, onChange, leading }: { value: FeedFilters['date']; onChange: (d: FeedFilters['date']) => void; leading?: ReactNode }) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const custom = typeof value === 'object' ? value : null;
  const days = nextDays(14);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
        {leading}
        {shortcuts.map((k) => (
          <Pill key={k} size="sm" label={t(`days.${k}`)} selected={value === k} onPress={() => onChange(value === k ? 'any' : k)} />
        ))}
        <Pill
          size="sm"
          icon={Icons.CalendarBlank}
          label={custom ? formatShortDate(custom.from, currentLocale()) : t('days.pick')}
          selected={!!custom}
          onPress={() => setPicking(true)}
        />
      </ScrollView>
      <Sheet open={picking} onClose={() => setPicking(false)} title={t('days.pick')}>
        <View className="flex-row flex-wrap gap-2">
          <Pill label={t('days.anyDate')} selected={value === 'any'} onPress={() => (onChange('any'), setPicking(false))} />
          {days.map((d) => (
            <Pill
              key={d.from}
              label={formatShortDate(d.from, currentLocale())}
              selected={custom?.from === d.from}
              onPress={() => {
                onChange(d);
                setPicking(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}
