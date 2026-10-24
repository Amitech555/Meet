/** Mini-client PostgREST (sans dépendance) : démarrage à froid plus rapide pour les Edge Functions. */
const URL_ = Deno.env.get('SUPABASE_URL')!;

export function rest(key: string) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  return {
    async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
      const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) });
      if (!res.ok) throw new Error(`rpc ${fn}: ${res.status} ${await res.text()}`);
      return (await res.json()) as T | null;
    },
    async select<T>(table: string, query: string): Promise<T[]> {
      const res = await fetch(`${URL_}/rest/v1/${table}?${query}`, { headers });
      if (!res.ok) throw new Error(`select ${table}: ${res.status} ${await res.text()}`);
      return (await res.json()) as T[];
    },
    async update(table: string, query: string, patch: Record<string, unknown>) {
      const res = await fetch(`${URL_}/rest/v1/${table}?${query}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error(`update ${table}: ${res.status} ${await res.text()}`);
    },
    async remove(table: string, query: string) {
      const res = await fetch(`${URL_}/rest/v1/${table}?${query}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error(`delete ${table}: ${res.status} ${await res.text()}`);
    },
  };
}

export const inList = (values: (string | number)[]) => `in.(${values.map((v) => `"${v}"`).join(',')})`;
