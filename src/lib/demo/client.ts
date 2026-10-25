/**
 * Client « Supabase » du mode démo : même surface que supabase-js pour ce que l'app utilise
 * (auth, rpc, from, channel, storage), servi en mémoire dans le navigateur. Rien n'est envoyé ni enregistré.
 * Connexion : n'importe quel courriel, code 123456 — ou un des profils de démo (barre « Démo »).
 */
import { loadDb, nextId, uuid, type Row } from './db';
import { createServer, DemoError } from './server';

export const DEMO_CODE = '123456';

export const demoPersonas = [
  { id: null, label: 'Visiteur' },
  { id: 'a1000000-0000-4000-8000-000000000001', label: 'Camille · admin, organisatrice' },
  { id: 'a1000000-0000-4000-8000-000000000002', label: 'Karim · propriétaire de groupe' },
  { id: 'a1000000-0000-4000-8000-000000000010', label: 'Lucas · nouvel arrivant' },
] as const;

type AuthListener = (event: string, session: any) => void;
type Sub = { table: string; event: string; filter?: string; cb: (p: { new: Row }) => void };

const db = loadDb();
let session: any = null;
const authListeners = new Set<AuthListener>();
const channels = new Map<string, Sub[]>();
const emails = new Map<string, string>();
const blobs = new Map<string, string>();
let pendingEmail: string | null = null;

const server = createServer(db, () => session?.user.id ?? null);

function makeSession(userId: string) {
  return { access_token: 'demo', refresh_token: 'demo', token_type: 'bearer', expires_in: 3600 * 24, user: { id: userId, aud: 'authenticated', role: 'authenticated' } };
}

function setSession(s: any, event: string) {
  session = s;
  for (const l of authListeners) l(event, s);
}

export function demoSignInAs(userId: string | null) {
  setSession(userId ? makeSession(userId) : null, userId ? 'SIGNED_IN' : 'SIGNED_OUT');
}

export function demoCurrentUser(): string | null {
  return session?.user.id ?? null;
}

function matches(filter: string | undefined, row: Row) {
  if (!filter) return true;
  const [col, rest] = filter.split('=eq.');
  return String(row[col!]) === rest;
}

function emit(table: string, event: string, row: Row) {
  for (const subs of channels.values()) for (const s of subs) if (s.table === table && (s.event === event || s.event === '*') && matches(s.filter, row)) setTimeout(() => s.cb({ new: { ...row } }), 0);
}

/** Après une RPC : diffuse l'état des sessions écoutées (compteur de places en direct). */
function broadcastSessions() {
  for (const subs of channels.values())
    for (const s of subs)
      if (s.table === 'sessions') {
        const id = s.filter?.split('=eq.')[1];
        const row = db.sessions.find((x) => x.id === id);
        if (row) setTimeout(() => s.cb({ new: { ...row } }), 0);
      }
}

const ok = (data: any) => ({ data, error: null });
const err = (message: string) => ({ data: null, error: { message } });

class Query implements PromiseLike<any> {
  private filters: [string, string, any][] = [];
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;
  private columns = '*';
  private wantSingle = false;
  private orders: [string, boolean][] = [];
  constructor(private table: string) {}

  select(cols = '*') {
    if (this.op === 'select') this.columns = cols;
    return this;
  }
  insert(rows: any) {
    this.op = 'insert';
    this.payload = rows;
    return this;
  }
  update(patch: any) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }
  upsert(row: any) {
    this.op = 'upsert';
    this.payload = row;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(col: string, v: any) {
    this.filters.push(['eq', col, v]);
    return this;
  }
  match(obj: Row) {
    for (const [k, v] of Object.entries(obj)) this.filters.push(['eq', k, v]);
    return this;
  }
  in(col: string, vs: any[]) {
    this.filters.push(['in', col, vs]);
    return this;
  }
  is(col: string, v: any) {
    this.filters.push(['is', col, v]);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push([col, opts?.ascending !== false]);
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }

  private rows(): Row[] {
    return ((db as any)[this.table] as Row[] | undefined) ?? [];
  }
  private pass(r: Row) {
    return this.filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'in' ? v.includes(r[c]) : r[c] === v || (v === null && r[c] == null)));
  }

  private run(): { data: any; error: any } {
    const uid = demoCurrentUser();
    const t = this.table;
    if (this.op === 'select') {
      let out = this.rows().filter((r) => this.pass(r));
      if (t === 'categories') out = out.filter((c) => c.is_active !== false);
      for (const [c, asc] of [...this.orders].reverse()) out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      if (t === 'group_members' && this.columns.includes('groups(')) out = out.map((m) => ({ ...m, groups: { name: db.groups.find((g) => g.id === m.group_id)?.name } }));
      return ok(this.wantSingle ? (out[0] ?? null) : out);
    }
    if (!uid) return err('not_authenticated');
    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const inserted: Row[] = [];
      for (const raw of list) {
        const row: Row = { ...raw };
        if (t === 'messages') {
          const s = row.session_id ? db.sessions.find((x) => x.id === row.session_id) : null;
          const isMember = s
            ? s.host_id === uid || db.session_participants.some((p) => p.session_id === s.id && p.user_id === uid && ['joined', 'attended'].includes(p.status))
            : db.group_members.some((m) => m.group_id === row.group_id && m.user_id === uid);
          if (!isMember || row.user_id !== uid) return err('new row violates row-level security policy');
          Object.assign(row, { id: nextId(), created_at: new Date().toISOString(), deleted_at: null, body: String(row.body).trim() });
        }
        if (t === 'groups') {
          Object.assign(row, { id: uuid(), invite_code: Math.random().toString(16).slice(2, 14), created_at: new Date().toISOString(), cover_url: null });
          db.group_members.push({ group_id: row.id, user_id: uid, role: 'admin', trusted: false, joined_at: new Date().toISOString() });
        }
        if (t === 'reports') Object.assign(row, { id: nextId(), status: 'open', created_at: new Date().toISOString() });
        const key = t === 'saved_sessions' ? ['user_id', 'session_id'] : t === 'blocks' ? ['blocker_id', 'blocked_id'] : t === 'push_tokens' ? ['token'] : null;
        const existing = key ? this.rows().find((r) => key.every((k) => r[k] === row[k])) : undefined;
        if (existing) Object.assign(existing, row);
        else this.rows().push(row);
        inserted.push(row);
        if (t === 'messages') emit('messages', 'INSERT', row);
      }
      return ok(this.wantSingle ? inserted[0] : inserted);
    }
    if (this.op === 'update') {
      const targets = this.rows().filter((r) => this.pass(r));
      if (t === 'profiles' && targets.some((r) => r.id !== uid)) return err('forbidden');
      targets.forEach((r) => Object.assign(r, this.payload));
      return ok(null);
    }
    // delete
    const keep = this.rows().filter((r) => !this.pass(r));
    (db as any)[t] = keep;
    return ok(null);
  }

  then<A, B>(onfulfilled?: ((v: any) => A | PromiseLike<A>) | null, onrejected?: ((e: any) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}

export function createDemoClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: (cb: AuthListener) => {
        authListeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
      },
      signInWithOtp: async ({ email }: { email: string }) => {
        pendingEmail = email.toLowerCase();
        return { data: {}, error: null };
      },
      verifyOtp: async ({ email, token }: { email: string; token: string }) => {
        if (token !== DEMO_CODE) return { data: { user: null, session: null }, error: { message: 'invalid_code' } };
        const key = (email || pendingEmail || '').toLowerCase();
        let id = emails.get(key);
        if (!id) {
          id = uuid();
          emails.set(key, id);
          db.profiles.push({ id, display_name: '', avatar_url: null, bio: null, city_id: 1, locale: 'fr', adult_confirmed_at: null, terms_accepted_at: null, terms_version: null, phone_verified_at: null, is_banned: false, is_admin: false, created_at: new Date().toISOString() });
        }
        const s = makeSession(id);
        setSession(s, 'SIGNED_IN');
        return { data: { user: s.user, session: s }, error: null };
      },
      signInWithOAuth: async () => ({ data: { provider: 'google', url: null }, error: { message: 'demo_unavailable' } }),
      signInWithIdToken: async () => ({ data: { user: null, session: null }, error: { message: 'demo_unavailable' } }),
      exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => {
        setSession(null, 'SIGNED_OUT');
        return { error: null };
      },
      startAutoRefresh: async () => undefined,
      stopAutoRefresh: async () => undefined,
    },

    rpc: async (name: string, args: Row = {}) => {
      const fn = server.rpc[name];
      if (!fn) return err(`unknown_rpc:${name}`);
      try {
        const data = fn(args ?? {});
        broadcastSessions();
        return ok(JSON.parse(JSON.stringify(data ?? null)));
      } catch (e) {
        if (e instanceof DemoError) return err(e.message);
        console.error('[démo]', name, e);
        return err('generic');
      }
    },

    from: (table: string) => new Query(table),

    channel: (name: string) => {
      const subs: Sub[] = [];
      const ch = {
        name,
        on: (_type: string, opts: { event: string; table: string; filter?: string }, cb: Sub['cb']) => {
          subs.push({ table: opts.table, event: opts.event, filter: opts.filter, cb });
          return ch;
        },
        subscribe: () => {
          channels.set(name, subs);
          return ch;
        },
      };
      return ch;
    },
    removeChannel: async (ch: { name: string }) => {
      channels.delete(ch.name);
      return 'ok';
    },

    storage: {
      from: (_bucket: string) => ({
        upload: async (path: string, body: ArrayBuffer, opts?: { contentType?: string }) => {
          blobs.set(path, URL.createObjectURL(new Blob([body], { type: opts?.contentType ?? 'image/jpeg' })));
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: blobs.get(path) ?? '' } }),
      }),
    },
  };
}
