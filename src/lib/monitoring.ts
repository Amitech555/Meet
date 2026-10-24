import * as Sentry from '@sentry/react-native';
import { env } from './env';

let started = false;

/** Sentry (crashs). Aucune donnée personnelle : pas d'IP, pas de corps de requête. */
export function initMonitoring() {
  if (started || !env.sentryDsn) return;
  started = true;
  Sentry.init({
    dsn: env.sentryDsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  });
}

export function captureError(e: unknown) {
  if (started) Sentry.captureException(e);
  else if (__DEV__ && process.env.NODE_ENV !== 'test') console.error(e);
}
