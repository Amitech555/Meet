import type { SessionSummary } from './types';

/**
 * Données de démonstration (styleguide, tests). Le seed SQL reprend les mêmes lieux réels.
 * Les dates sont relatives à « maintenant » pour rester crédibles.
 */
function at(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  // heure de Montréal ≈ UTC-4 / -5 ; assez précis pour une démo
  d.setUTCHours(hour + 4, minute, 0, 0);
  return d.toISOString();
}

const people = [
  { id: 'u-camille', display_name: 'Camille Tremblay', avatar_url: null },
  { id: 'u-karim', display_name: 'Karim Haddad', avatar_url: null },
  { id: 'u-sophie', display_name: 'Sophie Gagnon', avatar_url: null },
  { id: 'u-jb', display_name: 'J-B Lavoie', avatar_url: null },
  { id: 'u-mai', display_name: 'Mai Nguyen', avatar_url: null },
  { id: 'u-olivier', display_name: 'Olivier Roy', avatar_url: null },
];

const base = {
  description: null,
  address: null,
  cover_url: null,
  cover_blurhash: null,
  status: 'published' as const,
  cancellation_policy: 'flexible' as const,
  currency: 'CAD',
  group: null,
  series_id: null,
  recurrence_rule: null,
  my_status: null,
  waitlist_count: 0,
  min_players: 2,
};

export const demoSessions: SessionSummary[] = [
  {
    ...base,
    id: 's-basket-lafontaine',
    title: 'Basket 3 contre 3 au parc La Fontaine',
    starts_at: at(0, 18, 30),
    ends_at: at(0, 20, 0),
    venue_name: 'Parc La Fontaine',
    lat: 45.5277,
    lng: -73.5695,
    distance_m: 850,
    category: { id: 2, slug: 'basketball', name_fr: 'Basket', name_en: 'Basketball', icon: 'basketball', tint: 'jaune' },
    level: 'intermediate',
    price_cents: 0,
    max_players: 8,
    joined_count: 6,
    host: { ...people[0]!, reliability: 96, sessions_hosted: 34, verified: true },
    participants_preview: people.slice(0, 4),
  },
  {
    ...base,
    id: 's-course-canal',
    title: 'Course du mardi sur le canal Lachine — 8 km',
    starts_at: at(1, 6, 30),
    ends_at: at(1, 7, 30),
    venue_name: 'Marché Atwater',
    lat: 45.4807,
    lng: -73.5772,
    distance_m: 3200,
    category: { id: 7, slug: 'running', name_fr: 'Course & marche', name_en: 'Running & walking', icon: 'running', tint: 'orange' },
    level: 'all',
    price_cents: 0,
    max_players: 25,
    joined_count: 14,
    host: { ...people[1]!, reliability: 92, sessions_hosted: 61, verified: true },
    participants_preview: people.slice(1, 6),
    group: { id: 'g-griffin-run', name: 'Course Griffintown mardi 6 h 30' },
  },
  {
    ...base,
    id: 's-jeux-griffintown',
    title: 'Soirée jeux de société : Catan, Azul et compagnie',
    starts_at: at(2, 19, 0),
    ends_at: at(2, 22, 0),
    venue_name: 'Café Ludik, Griffintown',
    lat: 45.4925,
    lng: -73.5605,
    distance_m: 1900,
    category: { id: 17, slug: 'board-games', name_fr: 'Jeux de société', name_en: 'Board games', icon: 'board-games', tint: 'encre' },
    level: 'beginner',
    price_cents: 800,
    max_players: 12,
    joined_count: 11,
    host: { ...people[2]!, reliability: 100, sessions_hosted: 12, verified: false },
    participants_preview: people.slice(2, 6),
  },
  {
    ...base,
    id: 's-pickleball-vieuxport',
    title: 'Pickleball débutant au Vieux-Port',
    starts_at: at(3, 10, 0),
    ends_at: at(3, 11, 30),
    venue_name: 'Quai de l’Horloge',
    lat: 45.5105,
    lng: -73.5469,
    distance_m: 2400,
    category: { id: 12, slug: 'pickleball', name_fr: 'Pickleball', name_en: 'Pickleball', icon: 'racket', tint: 'turquoise' },
    level: 'beginner',
    price_cents: 1200,
    max_players: 8,
    joined_count: 8,
    host: { ...people[3]!, reliability: 88, sessions_hosted: 7, verified: true },
    participants_preview: people.slice(0, 5),
  },
  {
    ...base,
    id: 's-rando-montroyal',
    title: 'Montée du mont Royal au lever du soleil',
    starts_at: at(4, 6, 45),
    ends_at: at(4, 8, 15),
    venue_name: 'Monument à sir George-Étienne Cartier',
    lat: 45.5141,
    lng: -73.5865,
    distance_m: 1500,
    category: { id: 16, slug: 'outdoors', name_fr: 'Plein air', name_en: 'Outdoors', icon: 'outdoors', tint: 'sapin' },
    level: 'all',
    price_cents: 0,
    max_players: 15,
    joined_count: 3,
    host: { ...people[4]!, reliability: null, sessions_hosted: 1, verified: false },
    participants_preview: people.slice(4, 6),
  },
];
