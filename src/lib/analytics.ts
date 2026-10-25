import type PostHog from 'posthog-react-native';
import { env } from './env';

/**
 * Événements produit (aucune donnée sensible : pas de nom, courriel, position précise ni contenu de message).
 * Les métriques du tableau de bord PostHog (activation 48 h, remplissage, présence, rétention 14 j)
 * se calculent à partir de ces événements — voir docs/ANALYTICS.md.
 */
export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'city_selected'
  | 'signup_method'
  | 'signup_completed'
  | 'feed_loaded'
  | 'session_viewed'
  | 'session_joined'
  | 'session_waitlisted'
  | 'session_left'
  | 'session_created'
  | 'session_shared'
  | 'session_cancelled'
  | 'attendance_recorded'
  | 'review_submitted'
  | 'group_joined'
  | 'group_created'
  | 'message_sent';

type Props = Record<string, string | number | boolean | null | undefined>;

let client: PostHog | null = null;
let loading = false;

// PostHog est chargé seulement si une clé est configurée (ni en dev local ni dans l'aperçu démo)
function getClient(): PostHog | null {
  if (!env.posthogKey) return null;
  if (!client && !loading) {
    loading = true;
    void import('posthog-react-native').then(({ default: P }) => {
      client = new P(env.posthogKey, { host: env.posthogHost, captureAppLifecycleEvents: true });
    });
  }
  return client;
}

export function track(event: AnalyticsEvent, props?: Props) {
  const c = getClient();
  if (!c) {
    if (__DEV__ && process.env.NODE_ENV !== 'test') console.log('[analytics]', event, props ?? '');
    return;
  }
  c.capture(event, props as Record<string, string | number | boolean | null>);
}

/** Identifiant opaque Supabase uniquement. */
export function identify(userId: string | null) {
  const c = getClient();
  if (!c) return;
  if (userId) c.identify(userId);
  else c.reset();
}

/** Mesure de performance (ex. temps de chargement du feed, cible < 2 s). */
export function trackDuration(event: AnalyticsEvent, startedAt: number, props?: Props) {
  track(event, { ...props, duration_ms: Math.round(Date.now() - startedAt) });
}

export function featureFlag(key: string): boolean | undefined {
  return getClient()?.isFeatureEnabled(key);
}
