import { featureFlag } from './analytics';

/**
 * Drapeaux de fonctionnalités. Valeur PostHog si disponible, sinon défaut local.
 * Côté serveur, les mêmes interrupteurs existent dans platform_settings (ex. payments_enabled).
 */
const defaults = {
  payments: false, // Phase 2 : Stripe Connect
  p2_features: false, // tableau de bord organisateur, badges, tournois…
  map_view: true,
  new_cities: false, // Laval, Québec
} as const;

export type FlagKey = keyof typeof defaults;

export function isEnabled(key: FlagKey): boolean {
  return featureFlag(key) ?? defaults[key];
}
