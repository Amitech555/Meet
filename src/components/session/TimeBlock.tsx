import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../ui/Text';
import { dayKind, formatShortDate, formatStartTime, formatWeekday } from '@/lib/time';
import { currentLocale } from '@/i18n';

/** Libellé de jour humain : « Ce soir », « Demain », « samedi », « sam. 2 nov. ». */
export function useDayLabel() {
  const { t } = useTranslation();
  return (iso: string, now?: Date) => {
    const lang = currentLocale();
    const k = dayKind(iso, now);
    if (k === 'tonight') return t('days.tonight');
    if (k === 'today') return t('days.today');
    if (k === 'tomorrow') return t('days.tomorrow');
    if (k === 'thisWeek') return formatWeekday(iso, lang);
    return formatShortDate(iso, lang);
  };
}

/** L'heure de début en très grand : l'info n°1. */
export function TimeBlock({ iso, fg, size = 'md' }: { iso: string; fg: string; size?: 'md' | 'lg' }) {
  const dayLabel = useDayLabel();
  const lang = currentLocale();
  const time = formatStartTime(iso, lang);
  return (
    <View>
      <Text
        variant={size === 'lg' ? 'hero' : 'time'}
        tone="inherit"
        tabular
        style={{ color: fg, letterSpacing: -0.5 }}
        numberOfLines={1}
      >
        {time}
      </Text>
      <Text variant="caption" tone="inherit" className="font-semibold" style={{ color: fg }} numberOfLines={1}>
        {dayLabel(iso)}
      </Text>
    </View>
  );
}
