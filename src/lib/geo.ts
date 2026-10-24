import type { TFunction } from 'i18next';

export type LatLng = { lat: number; lng: number };

/** Distance haversine en mètres (affichage seulement — le tri serveur utilise PostGIS). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(m: number, t: TFunction, lang: string): string {
  if (m < 1000) return t('common.m', { value: Math.max(50, Math.round(m / 50) * 50) });
  const km = m / 1000;
  return t('common.km', { value: km < 10 ? km.toFixed(1).replace('.', lang === 'en' ? '.' : ',') : Math.round(km) });
}

/** Centre de Montréal (Place des Arts) — repli quand la position n'est pas partagée. */
export const MONTREAL: LatLng = { lat: 45.5089, lng: -73.5617 };
