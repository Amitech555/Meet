import { supabase } from './supabase';
import { toAppError } from './errors';
import type { Database } from './database.types';

type Fns = Database['public']['Functions'];

/**
 * Appel RPC typé : lève une AppError (code stable) en cas d'échec.
 * Le type de retour JSON est précisé par l'appelant (`as`), car les RPC renvoient du jsonb.
 */
export async function rpc<N extends keyof Fns, R = Fns[N]['Returns']>(name: N, args?: Fns[N]['Args']): Promise<R> {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw toAppError(error);
  return data as R;
}
