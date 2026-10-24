import { Platform, Share } from 'react-native';
import { createEventInCalendarAsync } from 'expo-calendar/legacy';
import type { TFunction } from 'i18next';
import { env } from '@/lib/env';
import { buildIcs } from '@/lib/ics';
import { formatShortDate, formatStartTime } from '@/lib/time';
import { currentLocale } from '@/i18n';
import { track } from '@/lib/analytics';
import type { SessionSummary } from './types';

export const sessionUrl = (id: string) => `${env.shareBaseUrl}/s/${id}`;

/** Partage (WhatsApp, SMS, Instagram…) : lien universel + aperçu riche via la page Open Graph. */
export async function shareSession(s: SessionSummary, t: TFunction) {
  const lang = currentLocale();
  const url = sessionUrl(s.id);
  const message = t('session.shareMessage', {
    title: s.title,
    date: formatShortDate(s.starts_at, lang),
    time: formatStartTime(s.starts_at, lang),
    venue: s.venue_name,
    url,
  });
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) {
    await navigator.clipboard?.writeText(message);
  } else {
    await Share.share(Platform.OS === 'ios' ? { message, url } : { message });
  }
  track('session_shared', { category: s.category.slug });
}

export async function addSessionToCalendar(s: SessionSummary) {
  const location = [s.venue_name, s.address].filter(Boolean).join(', ');
  if (Platform.OS === 'web') {
    const ics = buildIcs({ uid: s.id, title: s.title, startsAt: s.starts_at, endsAt: s.ends_at, location, description: s.description ?? undefined, url: sessionUrl(s.id) });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'partants.ics';
    a.click();
    return;
  }
  await createEventInCalendarAsync({
    title: s.title,
    startDate: new Date(s.starts_at),
    endDate: new Date(s.ends_at),
    location,
    notes: [s.description, sessionUrl(s.id)].filter(Boolean).join('\n\n'),
    url: sessionUrl(s.id),
  });
}

export function mapsUrl(s: Pick<SessionSummary, 'lat' | 'lng' | 'venue_name'>) {
  const q = encodeURIComponent(s.venue_name);
  return Platform.OS === 'ios' ? `http://maps.apple.com/?ll=${s.lat},${s.lng}&q=${q}` : `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
}
