/** Logs structurés (JSON une ligne) pour les Edge Functions — lisibles dans les logs Supabase. */
export function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({ level, event, at: new Date().toISOString(), ...data }));
}
