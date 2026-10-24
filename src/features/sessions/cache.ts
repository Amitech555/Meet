import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { SessionSummary } from './types';

/** Racines des caches qui contiennent des cartes de session. */
export const SESSION_CACHE_ROOTS = ['feed', 'session', 'my-sessions', 'group', 'profile', 'nearby'] as const;

function isSession(v: unknown, id: string): v is SessionSummary {
  return !!v && typeof v === 'object' && (v as { id?: unknown }).id === id && 'starts_at' in (v as object) && 'max_players' in (v as object);
}

/** Parcourt une valeur (tableaux, pages infinies, objets) et remplace chaque copie de la session. */
export function mapSessionDeep<T>(value: T, id: string, fn: (s: SessionSummary) => SessionSummary): T {
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const n = mapSessionDeep(v, id, fn);
      if (n !== v) changed = true;
      return n;
    });
    return (changed ? out : value) as T;
  }
  if (value && typeof value === 'object') {
    if (isSession(value, id)) return fn(value) as T;
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const n = mapSessionDeep(v, id, fn);
      if (n !== v) changed = true;
      out[k] = n;
    }
    return (changed ? out : value) as T;
  }
  return value;
}

export type CacheSnapshot = [QueryKey, unknown][];

/** Applique une mise à jour optimiste partout ; renvoie l'instantané pour le rollback. */
export function updateSessionEverywhere(qc: QueryClient, id: string, fn: (s: SessionSummary) => SessionSummary): CacheSnapshot {
  const snapshot: CacheSnapshot = [];
  for (const root of SESSION_CACHE_ROOTS) {
    for (const [key, data] of qc.getQueriesData({ queryKey: [root] })) {
      if (data === undefined) continue;
      snapshot.push([key, data]);
      const next = mapSessionDeep(data, id, fn);
      if (next !== data) qc.setQueryData(key, next);
    }
  }
  return snapshot;
}

export function restoreSnapshot(qc: QueryClient, snapshot: CacheSnapshot) {
  for (const [key, data] of snapshot) qc.setQueryData(key, data);
}
