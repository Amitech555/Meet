import { TZDate } from '@date-fns/tz';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isSaturday,
  isSunday,
  nextSaturday,
  startOfDay,
} from 'date-fns';
import { enCA, frCA } from 'date-fns/locale';

/** Toutes les dates sont stockées en UTC et affichées dans ce fuseau. */
export const APP_TZ = 'America/Toronto';

export type AppLocale = 'fr' | 'en';

const locales = { fr: frCA, en: enCA } as const;

/** ISO UTC (« Z ») — TZDate.toISOString() garderait le décalage local. */
function utc(d: Date): string {
  return new Date(d.getTime()).toISOString();
}

export function inAppTz(date: Date | string | number): TZDate {
  return new TZDate(new Date(date).getTime(), APP_TZ);
}

/** Heure de début, l'info n°1 des cartes : « 18:30 » en français, « 6:30 PM » en anglais. */
export function formatStartTime(iso: string, locale: AppLocale = 'fr'): string {
  return format(inAppTz(iso), locale === 'fr' ? 'HH:mm' : 'h:mm a', { locale: locales[locale] });
}

export type DayKind = 'today' | 'tonight' | 'tomorrow' | 'thisWeek' | 'later' | 'past';

/** Classe une date par rapport à maintenant, en heure de Montréal. */
export function dayKind(iso: string, now: Date = new Date()): DayKind {
  const d = inAppTz(iso);
  const n = inAppTz(now);
  if (d.getTime() < n.getTime()) return 'past';
  const diff = differenceInCalendarDays(d, n);
  if (diff === 0) return d.getHours() >= 17 ? 'tonight' : 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 7) return 'thisWeek';
  return 'later';
}

/** « sam. 26 oct. » / « Sat, Oct 26 » */
export function formatShortDate(iso: string, locale: AppLocale = 'fr'): string {
  return format(inAppTz(iso), locale === 'fr' ? 'EEE d MMM' : 'EEE, MMM d', { locale: locales[locale] });
}

/** « samedi » / « Saturday » */
export function formatWeekday(iso: string, locale: AppLocale = 'fr'): string {
  return format(inAppTz(iso), 'EEEE', { locale: locales[locale] });
}

/** « samedi 26 octobre » / « Saturday, October 26 » */
export function formatLongDate(iso: string, locale: AppLocale = 'fr'): string {
  return format(inAppTz(iso), locale === 'fr' ? 'EEEE d MMMM' : 'EEEE, MMMM d', { locale: locales[locale] });
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

export type DateShortcut = 'tonight' | 'tomorrow' | 'weekend';

/** Bornes UTC (ISO) d'un raccourci de date du feed. */
export function rangeFor(shortcut: DateShortcut, now: Date = new Date()): { from: string; to: string } {
  const n = inAppTz(now);
  switch (shortcut) {
    case 'tonight':
      return { from: utc(n), to: utc(endOfDay(n)) };
    case 'tomorrow': {
      const t = addDays(n, 1);
      return { from: utc(startOfDay(t)), to: utc(endOfDay(t)) };
    }
    case 'weekend': {
      if (isSaturday(n) || isSunday(n)) {
        const sunday = isSunday(n) ? n : addDays(n, 1);
        return { from: utc(n), to: utc(endOfDay(sunday)) };
      }
      // Vendredi soir inclus : c'est déjà la fin de semaine au Québec.
      const sat = nextSaturday(n);
      const fridayEvening = new TZDate(sat.getFullYear(), sat.getMonth(), sat.getDate() - 1, 17, 0, 0, APP_TZ);
      const from = fridayEvening.getTime() > n.getTime() ? fridayEvening : n;
      return { from: utc(from), to: utc(endOfDay(addDays(sat, 1))) };
    }
  }
}

/** Construit un instant UTC à partir d'une heure « murale » à Montréal. */
export function zonedWallTimeToUtc(
  y: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
): string {
  return utc(new TZDate(y, monthIndex, day, hours, minutes, 0, APP_TZ));
}

/** Valeur par défaut de création : prochain samedi 10 h (heure de Montréal). */
export function defaultSessionStart(now: Date = new Date()): string {
  const n = inAppTz(now);
  const sat = nextSaturday(n);
  return zonedWallTimeToUtc(sat.getFullYear(), sat.getMonth(), sat.getDate(), 10, 0);
}

export function wallParts(iso: string) {
  const d = inAppTz(iso);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}
