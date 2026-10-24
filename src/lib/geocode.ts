import { env } from './env';
import { MONTREAL, type LatLng } from './geo';

export type Place = { id: string; name: string; address: string; lat: number; lng: number };

/** Lieux de Montréal fréquents : repli hors-ligne ou sans jeton Mapbox. */
export const knownPlaces: Place[] = [
  { id: 'k-lafontaine', name: 'Parc La Fontaine', address: '3933 av. du Parc-La Fontaine, Montréal', lat: 45.5277, lng: -73.5695 },
  { id: 'k-atwater', name: 'Marché Atwater', address: '138 av. Atwater, Montréal', lat: 45.4807, lng: -73.5772 },
  { id: 'k-lachine', name: 'Canal de Lachine — Square Gallery', address: 'Rue Ottawa, Griffintown, Montréal', lat: 45.4955, lng: -73.562 },
  { id: 'k-montroyal', name: 'Mont Royal — Monument Cartier', address: 'Av. du Parc, Montréal', lat: 45.5141, lng: -73.5865 },
  { id: 'k-vieuxport', name: 'Vieux-Port — Quai de l’Horloge', address: 'Quai de l’Horloge, Montréal', lat: 45.5105, lng: -73.5469 },
  { id: 'k-jarry', name: 'Parc Jarry', address: '285 rue Faillon O., Montréal', lat: 45.5338, lng: -73.6286 },
  { id: 'k-laurier', name: 'Parc Laurier', address: 'Rue Brébeuf, Montréal', lat: 45.5317, lng: -73.5836 },
  { id: 'k-jeannemance', name: 'Parc Jeanne-Mance', address: 'Av. du Parc, Montréal', lat: 45.5145, lng: -73.584 },
  { id: 'k-jeandrapeau', name: 'Parc Jean-Drapeau', address: 'Île Sainte-Hélène, Montréal', lat: 45.5085, lng: -73.532 },
  { id: 'k-maisonneuve', name: 'Parc Maisonneuve', address: '4601 rue Sherbrooke E., Montréal', lat: 45.5608, lng: -73.5585 },
];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function searchKnownPlaces(query: string): Place[] {
  const q = fold(query.trim());
  if (!q) return knownPlaces.slice(0, 5);
  return knownPlaces.filter((p) => fold(`${p.name} ${p.address}`).includes(q));
}

type MapboxFeature = {
  id: string;
  properties: { name: string; full_address?: string; place_formatted?: string; coordinates: { latitude: number; longitude: number } };
};

/** Recherche d'adresses (Mapbox Geocoding v6), biaisée autour de Montréal ; repli local sinon. */
export async function geocode(query: string, near: LatLng = MONTREAL, lang = 'fr'): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3 || !env.mapboxToken) return searchKnownPlaces(q);
  const url =
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}` +
    `&proximity=${near.lng},${near.lat}&country=ca&language=${lang}&limit=6&access_token=${env.mapboxToken}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return searchKnownPlaces(q);
    const json = (await res.json()) as { features: MapboxFeature[] };
    const remote = json.features.map((f) => ({
      id: f.id,
      name: f.properties.name,
      address: f.properties.full_address ?? f.properties.place_formatted ?? f.properties.name,
      lat: f.properties.coordinates.latitude,
      lng: f.properties.coordinates.longitude,
    }));
    return [...searchKnownPlaces(q).slice(0, 2), ...remote];
  } catch {
    return searchKnownPlaces(q);
  }
}
