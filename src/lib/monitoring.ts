import { env } from './env';

type SentryModule = typeof import('@sentry/react-native');
let sentry: SentryModule | null = null;

/** Sentry (crashs), chargé seulement si un DSN est configuré. Aucune donnée personnelle. */
export function initMonitoring() {
  if (sentry || !env.sentryDsn) return;
  void import('@sentry/react-native').then((S) => {
    sentry = S;
    S.init({ dsn: env.sentryDsn, sendDefaultPii: false, tracesSampleRate: 0.2, enabled: !__DEV__ });
  });
}

export function captureError(e: unknown) {
  if (sentry) sentry.captureException(e);
  else if (__DEV__ && process.env.NODE_ENV !== 'test') console.error(e);
}
