import type { TFunction } from 'i18next';

/** Codes d'erreur stables renvoyés par les fonctions SQL (raise exception '<code>'). */
const knownCodes = {
  session_full: 'errors.sessionFull',
  session_started: 'errors.sessionStarted',
  session_unavailable: 'errors.sessionUnavailable',
  blocked: 'errors.blocked',
  terms_required: 'errors.termsRequired',
  rate_limited: 'errors.rateLimited',
  underage: 'auth.underage',
  starts_in_past: 'create.errorPast',
  invalid_price: 'create.errorPrice',
  group_private: 'groups.privateLocked',
  priority_window: 'priority.error',
  forbidden: 'admin.forbidden',
  demo_unavailable: 'demo.unavailable',
} as const;

export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

type PgLikeError = { message?: string; code?: string } | null | undefined;

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const err = e as PgLikeError & { name?: string };
  const msg = err?.message ?? '';
  if (/Failed to fetch|Network request failed|NetworkError|fetch failed/i.test(msg)) return new AppError('offline', msg);
  if (msg in knownCodes) return new AppError(msg, msg);
  return new AppError('generic', msg);
}

/** Message humain traduit pour une erreur. */
export function errorMessage(e: unknown, t: TFunction): string {
  const err = toAppError(e);
  if (err.code === 'offline') return t('errors.offline');
  const key = knownCodes[err.code as keyof typeof knownCodes];
  return key ? t(key) : t('errors.generic');
}
