/**
 * Mode démo : réimplémentation en mémoire des fonctions SQL (supabase/migrations) utilisées par l'app.
 * Même contrat JSON, mêmes codes d'erreur. Sert uniquement l'aperçu web : la vérité reste en SQL,
 * couverte par les tests pgTAP.
 */
import { haversineMeters } from '../geo';
import { nextId, uuid, type DemoDb, type Row } from './db';

export class DemoError extends Error {}
const fail = (code: string): never => {
  throw new DemoError(code);
};

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const nowMs = () => Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : NaN);
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function createServer(db: DemoDb, getUid: () => string | null) {
  const profile = (id: string | null | undefined) => db.profiles.find((p) => p.id === id);
  const category = (id: number) => db.categories.find((c) => c.id === id)!;
  const session = (id: string) => db.sessions.find((s) => s.id === id);
  const group = (id: string | null | undefined) => db.groups.find((g) => g.id === id);
  const member = (gid: string, uid: string | null) => db.group_members.find((m) => m.group_id === gid && m.user_id === uid);
  const parts = (sid: string) => db.session_participants.filter((p) => p.session_id === sid);
  const part = (sid: string, uid: string | null) => db.session_participants.find((p) => p.session_id === sid && p.user_id === uid);

  const isGroupMember = (gid: string, uid: string | null) => !!uid && !!member(gid, uid);
  const isGroupAdmin = (gid: string, uid: string | null) => member(gid, uid)?.role === 'admin';
  const blockedBetween = (a: string | null, b: string | null) =>
    !!a && !!b && db.blocks.some((x) => (x.blocker_id === a && x.blocked_id === b) || (x.blocker_id === b && x.blocked_id === a));

  const canView = (s: Row, uid: string | null) => {
    if (s.host_id === uid) return true;
    if (s.status === 'draft') return false;
    const g = group(s.group_id);
    return !g || g.visibility === 'public' || isGroupMember(g.id, uid);
  };
  const canManage = (s: Row, uid: string | null) => !!uid && (s.host_id === uid || (!!s.group_id && isGroupAdmin(s.group_id, uid)));
  const isSessionMember = (s: Row, uid: string | null) =>
    !!uid && (s.host_id === uid || parts(s.id).some((p) => p.user_id === uid && ['joined', 'attended'].includes(p.status)) || (!!s.group_id && isGroupAdmin(s.group_id, uid)));

  const requireUser = () => getUid() ?? fail('not_authenticated');
  const requireReady = () => {
    const uid = requireUser();
    const p = profile(uid);
    if (!p || !p.adult_confirmed_at || !p.terms_accepted_at) fail('terms_required');
    if (p!.is_banned) fail('blocked');
    return uid;
  };

  const refreshCounts = (sid: string) => {
    const s = session(sid)!;
    const ps = parts(sid);
    s.places_taken = ps.filter((p) => ['joined', 'attended', 'no_show'].includes(p.status)).reduce((n, p) => n + 1 + (p.guest_count ?? 0), 0);
    s.waitlist_count = ps.filter((p) => p.status === 'waitlist').length;
  };

  const reliability = (uid: string) => {
    const done = db.session_participants.filter((p) => p.user_id === uid && ['attended', 'no_show'].includes(p.status));
    return done.length >= 3 ? Math.round((100 * done.filter((p) => p.status === 'attended').length) / done.length) : null;
  };
  const person = (uid: string | null) => {
    const p = profile(uid);
    return p ? { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url } : null;
  };
  const hostJson = (uid: string | null) => {
    const p = profile(uid);
    if (!p) return null;
    return {
      ...person(uid),
      reliability: reliability(p.id),
      sessions_hosted: db.sessions.filter((s) => s.host_id === p.id && ['published', 'completed'].includes(s.status)).length,
      verified: !!p.phone_verified_at,
    };
  };

  const notify = (user_id: string, kind: string, session_id: string | null, payload: Row) => {
    if (['reminder_24h', 'reminder_2h', 'checkin', 'review_request'].includes(kind) && db.notifications.some((n) => n.user_id === user_id && n.session_id === session_id && n.kind === kind)) return;
    db.notifications.push({ id: nextId(), user_id, kind, session_id, payload, created_at: iso(nowMs()), read_at: null });
  };

  const card = (s: Row, lat?: number | null, lng?: number | null) => {
    const uid = getUid();
    const c = category(s.category_id);
    const g = group(s.group_id);
    const preview = parts(s.id)
      .filter((p) => ['joined', 'attended'].includes(p.status))
      .sort((a, b) => Number(b.user_id === s.host_id) - Number(a.user_id === s.host_id) || ms(a.joined_at) - ms(b.joined_at))
      .slice(0, 5)
      .map((p) => person(p.user_id))
      .filter(Boolean);
    const priorityActive = !!s.priority_until && ms(s.priority_until) > nowMs();
    const m = s.group_id ? member(s.group_id, uid) : undefined;
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      venue_name: s.venue_name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      distance_m: lat != null && lng != null ? Math.round(haversineMeters({ lat, lng }, { lat: s.lat, lng: s.lng })) : null,
      category: { id: c.id, slug: c.slug, name_fr: c.name_fr, name_en: c.name_en, icon: c.icon, tint: c.tint },
      level: s.level,
      price_cents: s.price_cents,
      currency: s.currency,
      min_players: s.min_players,
      max_players: s.max_players,
      joined_count: s.places_taken,
      waitlist_count: s.waitlist_count,
      cover_url: s.cover_url,
      cover_blurhash: s.cover_blurhash,
      status: s.status,
      cancellation_policy: s.cancellation_policy,
      host: hostJson(s.host_id),
      participants_preview: preview,
      my_status: part(s.id, uid)?.status ?? null,
      group: g ? { id: g.id, name: g.name } : null,
      series_id: s.series_id,
      recurrence_rule: s.recurrence_rule,
      priority_until: priorityActive ? s.priority_until : null,
      i_have_priority: priorityActive && !!m && (m.trusted || m.role === 'admin'),
      can_manage: canManage(s, uid),
    };
  };

  const promote = (sid: string) => {
    const s = session(sid)!;
    if (s.status !== 'published' || ms(s.starts_at) <= nowMs()) return;
    let taken = parts(sid).filter((p) => p.status === 'joined').reduce((n, p) => n + 1 + p.guest_count, 0);
    for (const w of parts(sid).filter((p) => p.status === 'waitlist').sort((a, b) => ms(a.joined_at) - ms(b.joined_at))) {
      if (taken + 1 + w.guest_count > s.max_players) continue;
      w.status = 'joined';
      taken += 1 + w.guest_count;
      if (w.user_id !== getUid()) notify(w.user_id, 'spot_opened', sid, { title: s.title, starts_at: s.starts_at });
    }
    refreshCounts(sid);
  };

  const checkPriority = (s: Row, uid: string) => {
    if (!s.priority_until || ms(s.priority_until) <= nowMs() || uid === s.host_id) return;
    const m = member(s.group_id, uid);
    if (!m || !(m.trusted || m.role === 'admin')) fail('priority_window');
  };

  const joinSession = (sid: string, guest = false) => {
    const uid = requireReady();
    const s = session(sid);
    if (!s || !canView(s, uid) || s.status !== 'published') fail('session_unavailable');
    if (ms(s!.starts_at) <= nowMs()) fail('session_started');
    if (blockedBetween(uid, s!.host_id)) fail('blocked');
    const existing = part(sid, uid);
    if (existing && ['joined', 'waitlist'].includes(existing.status)) {
      return { status: existing.status, position: null, places_taken: s!.places_taken };
    }
    checkPriority(s!, uid);
    const taken = parts(sid).filter((p) => p.status === 'joined').reduce((n, p) => n + 1 + p.guest_count, 0);
    const hasQueue = parts(sid).some((p) => p.status === 'waitlist');
    const status = taken + 1 + (guest ? 1 : 0) <= s!.max_players && !hasQueue ? 'joined' : 'waitlist';
    const row = { session_id: sid, user_id: uid, status, payment_status: 'none', guest_count: guest ? 1 : 0, joined_at: iso(nowMs()) };
    if (existing) Object.assign(existing, row);
    else db.session_participants.push(row);
    if (status === 'waitlist' && taken < s!.max_players) promote(sid);
    refreshCounts(sid);
    const final = part(sid, uid)!;
    const position = final.status === 'waitlist' ? parts(sid).filter((p) => p.status === 'waitlist' && ms(p.joined_at) <= ms(final.joined_at)).length : null;
    return { status: final.status, position, places_taken: s!.places_taken };
  };

  const cancelInternal = (sid: string, reason: string | null) => {
    const s = session(sid);
    if (!s || s.status !== 'published') return;
    s.status = 'cancelled';
    s.cancelled_reason = reason?.trim() || null;
    for (const p of parts(sid)) if (['joined', 'waitlist'].includes(p.status) && p.user_id !== s.host_id) notify(p.user_id, 'session_cancelled', sid, { title: s.title, reason: s.cancelled_reason });
    if (s.cancelled_reason) db.messages.push({ id: nextId(), session_id: sid, group_id: null, user_id: s.host_id, body: s.cancelled_reason, created_at: iso(nowMs()), deleted_at: null });
  };

  const getProfile = (id: string) => {
    const uid = getUid();
    const p = profile(id);
    if (!p) return null;
    if (uid && id !== uid && db.blocks.some((b) => b.blocker_id === id && b.blocked_id === uid)) return null;
    const received = db.reviews.filter((r) => r.reviewed_id === id);
    const tagCounts = new Map<string, number>();
    for (const r of received.filter((r) => r.rating === 1)) for (const tg of r.tags) tagCounts.set(tg, (tagCounts.get(tg) ?? 0) + 1);
    const city = db.cities.find((c) => c.id === p.city_id);
    return {
      id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      bio: p.bio,
      city: city ? { id: city.id, name: city.name } : null,
      member_since: p.created_at,
      verified: !!p.phone_verified_at,
      reliability: reliability(p.id),
      sessions_played: db.session_participants.filter((x) => x.user_id === id && x.status === 'attended').length,
      sessions_hosted: db.sessions.filter((s) => s.host_id === id && ['published', 'completed'].includes(s.status)).length,
      thumbs_up: received.filter((r) => r.rating === 1).length,
      review_count: received.length,
      tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count })),
      interests: db.user_interests
        .filter((i) => i.user_id === id)
        .map((i): Row => ({ ...category(i.category_id), level: i.level }))
        .sort((a: Row, b: Row) => a.sort - b.sort),
      upcoming_hosted: db.sessions
        .filter((s) => s.host_id === id && s.status === 'published' && ms(s.starts_at) > nowMs() && canView(s, uid))
        .sort((a, b) => ms(a.starts_at) - ms(b.starts_at))
        .slice(0, 5)
        .map((s) => card(s)),
      is_me: id === uid,
      is_blocked: db.blocks.some((b) => b.blocker_id === uid && b.blocked_id === id),
      is_following: db.follows.some((f) => f.follower_id === uid && f.host_id === id),
    };
  };

  const groupCard = (g: Row) => {
    const uid = getUid();
    const members = db.group_members.filter((m) => m.group_id === g.id);
    const next = db.sessions.filter((s) => s.group_id === g.id && s.status === 'published' && ms(s.starts_at) > nowMs()).sort((a, b) => ms(a.starts_at) - ms(b.starts_at))[0];
    const c = category(g.category_id);
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      cover_url: g.cover_url,
      rhythm_label: g.rhythm_label,
      visibility: g.visibility,
      category: { id: c.id, slug: c.slug, name_fr: c.name_fr, name_en: c.name_en, icon: c.icon, tint: c.tint },
      member_count: members.length,
      members_preview: [...members].sort((a, b) => (a.role === b.role ? ms(a.joined_at) - ms(b.joined_at) : a.role === 'admin' ? -1 : 1)).slice(0, 4).map((m) => person(m.user_id)),
      my_role: member(g.id, uid)?.role ?? null,
      next_session: next ? card(next) : null,
    };
  };

  const rpc: Record<string, (a: Row) => unknown> = {
    feed_sessions: (a) => {
      const uid = getUid();
      const q = a.p_query ? fold(String(a.p_query).trim()) : '';
      const cats = a.p_category_ids ? new Set(db.categories.filter((c) => a.p_category_ids.includes(c.id) || a.p_category_ids.includes(c.parent_id)).map((c) => c.id)) : null;
      const from = a.p_from ? ms(a.p_from) : nowMs();
      return db.sessions
        .filter((s) => s.city_id === a.p_city_id && s.status === 'published' && ms(s.starts_at) > nowMs() && ms(s.starts_at) >= from)
        .filter((s) => !a.p_to || ms(s.starts_at) <= ms(a.p_to))
        .filter((s) => !cats || cats.has(s.category_id))
        .filter((s) => a.p_price === 'free' ? s.price_cents === 0 : a.p_price === 'paid' ? s.price_cents > 0 : true)
        .filter((s) => !a.p_levels || a.p_levels.includes(s.level) || s.level === 'all')
        .filter((s) => !a.p_radius_m || a.p_lat == null || haversineMeters({ lat: a.p_lat, lng: a.p_lng }, { lat: s.lat, lng: s.lng }) <= a.p_radius_m)
        .filter((s) => {
          if (!q) return true;
          const c = category(s.category_id);
          return fold(`${s.title} ${s.venue_name} ${s.address ?? ''} ${profile(s.host_id)?.display_name ?? ''} ${c.name_fr} ${c.name_en}`).includes(q);
        })
        .filter((s) => canView(s, uid) && !blockedBetween(uid, s.host_id))
        .sort((x, y) => ms(x.starts_at) - ms(y.starts_at) || x.id.localeCompare(y.id))
        .filter((s) => !a.p_cursor_starts_at || ms(s.starts_at) > ms(a.p_cursor_starts_at) || (ms(s.starts_at) === ms(a.p_cursor_starts_at) && s.id > a.p_cursor_id))
        .slice(0, Math.min(a.p_limit ?? 20, 50))
        .map((s) => card(s, a.p_lat, a.p_lng));
    },

    get_session: (a) => {
      const uid = getUid();
      const s = session(a.p_session_id);
      if (!s || !canView(s, uid)) return null;
      const memberOf = isSessionMember(s, uid);
      const me = part(s.id, uid);
      const msgs = db.messages.filter((m) => m.session_id === s.id && !m.deleted_at);
      return {
        ...card(s, a.p_lat, a.p_lng),
        participants: parts(s.id)
          .filter((p) => ['joined', 'attended'].includes(p.status))
          .sort((x, y) => Number(y.user_id === s.host_id) - Number(x.user_id === s.host_id) || ms(x.joined_at) - ms(y.joined_at))
          .map((p) => ({ ...person(p.user_id), guest_count: p.guest_count, is_host: p.user_id === s.host_id })),
        my_waitlist_position: me?.status === 'waitlist' ? parts(s.id).filter((p) => p.status === 'waitlist' && ms(p.joined_at) <= ms(me.joined_at)).length : 0,
        my_guest_count: me?.guest_count ?? null,
        is_member: memberOf,
        is_saved: db.saved_sessions.some((x) => x.user_id === uid && x.session_id === s.id),
        cancelled_reason: s.cancelled_reason,
        chat_preview: memberOf ? msgs.slice(-3).map((m) => ({ id: m.id, body: m.body, created_at: m.created_at, user_id: m.user_id, author: person(m.user_id) })) : null,
        message_count: memberOf ? msgs.length : null,
      };
    },

    join_session: (a) => joinSession(a.p_session_id, !!a.p_bring_guest),

    leave_session: (a) => {
      const uid = requireUser();
      const s = session(a.p_session_id) ?? fail('session_unavailable');
      if (s!.host_id === uid) fail('host_cannot_leave');
      if (ms(s!.starts_at) <= nowMs()) fail('session_started');
      const p = part(s!.id, uid);
      const prev = p?.status;
      if (p && ['joined', 'waitlist'].includes(p.status)) Object.assign(p, { status: 'cancelled', guest_count: 0 });
      if (prev === 'joined') promote(s!.id);
      refreshCounts(s!.id);
      return { status: 'cancelled', places_taken: s!.places_taken };
    },

    set_guest: (a) => {
      const uid = requireReady();
      const s = session(a.p_session_id) ?? fail('session_unavailable');
      const p = part(s!.id, uid);
      if (p?.status !== 'joined') fail('not_joined');
      if (a.p_guest && p!.guest_count === 0) {
        if (s!.places_taken + 1 > s!.max_players) fail('session_full');
        p!.guest_count = 1;
      } else if (!a.p_guest && p!.guest_count > 0) {
        p!.guest_count = 0;
        promote(s!.id);
      }
      refreshCounts(s!.id);
      return { guest_count: p!.guest_count, places_taken: s!.places_taken };
    },

    join_series: (a) => {
      requireReady();
      const list = db.sessions.filter((s) => s.series_id === a.p_series_id && s.status === 'published' && ms(s.starts_at) > nowMs());
      list.forEach((s) => joinSession(s.id));
      return list.length;
    },

    create_session: (a) => {
      const uid = requireReady();
      if (ms(a.p_starts_at) <= nowMs() + 15 * 60 * 1000) fail('starts_in_past');
      if (a.p_price_cents > 0 && a.p_price_cents < 100) fail('invalid_price');
      if (a.p_group_id && !isGroupAdmin(a.p_group_id, uid)) fail('not_group_admin');
      const series = a.p_recurrence_rule ? uuid() : null;
      const step = a.p_recurrence_rule === 'FREQ=WEEKLY;INTERVAL=2' ? 14 * DAY : 7 * DAY;
      const n = a.p_recurrence_rule ? 8 : 1;
      let first = '';
      for (let i = 0; i < n; i++) {
        const id = uuid();
        const start = ms(a.p_starts_at) + step * i;
        db.sessions.push({
          id, host_id: uid, group_id: a.p_group_id ?? null, category_id: a.p_category_id, title: String(a.p_title).trim(),
          description: a.p_description?.trim() || null, starts_at: iso(start), ends_at: iso(start + a.p_duration_minutes * 60000),
          venue_name: String(a.p_venue_name).trim(), address: a.p_address?.trim() || null, lat: a.p_lat, lng: a.p_lng, city_id: 1,
          min_players: a.p_min_players, max_players: a.p_max_players, level: a.p_level ?? 'all', price_cents: a.p_price_cents ?? 0,
          currency: 'CAD', cancellation_policy: a.p_cancellation_policy ?? 'flexible', cover_url: a.p_cover_url ?? null, cover_blurhash: null,
          status: 'published', recurrence_rule: a.p_recurrence_rule ?? null, series_id: series, cancelled_reason: null,
          places_taken: 0, waitlist_count: 0, priority_until: null, created_at: iso(nowMs()),
        });
        db.session_participants.push({ session_id: id, user_id: uid, status: 'joined', payment_status: 'none', guest_count: 0, joined_at: iso(nowMs()) });
        refreshCounts(id);
        if (i === 0) first = id;
      }
      return first;
    },

    cancel_session: (a) => {
      const uid = requireUser();
      const s = session(a.p_session_id);
      if (!s || !canManage(s, uid)) fail('not_host');
      cancelInternal(s!.id, a.p_reason ?? null);
      return null;
    },

    record_attendance: (a) => {
      const uid = requireUser();
      const s = session(a.p_session_id);
      if (!s || !canManage(s, uid)) fail('not_host');
      if (ms(s!.starts_at) > nowMs()) fail('session_not_started');
      for (const p of parts(s!.id)) if (['joined', 'attended', 'no_show'].includes(p.status)) p.status = a.p_attended.includes(p.user_id) || p.user_id === s!.host_id ? 'attended' : 'no_show';
      s!.status = 'completed';
      for (const p of parts(s!.id)) if (p.status === 'attended') notify(p.user_id, 'review_request', s!.id, { title: s!.title });
      refreshCounts(s!.id);
      return null;
    },

    submit_reviews: (a) => {
      const uid = requireUser();
      const s = session(a.p_session_id) ?? fail('session_unavailable');
      if (!parts(s!.id).some((p) => p.user_id === uid && p.status === 'attended') && s!.host_id !== uid) fail('not_attendee');
      let n = 0;
      for (const r of a.p_reviews as Row[]) {
        const ok = parts(s!.id).some((p) => p.user_id === r.reviewed_id && p.status === 'attended') || s!.host_id === r.reviewed_id;
        if (!ok || r.reviewed_id === uid) continue;
        const existing = db.reviews.find((x) => x.session_id === s!.id && x.reviewer_id === uid && x.reviewed_id === r.reviewed_id);
        if (existing) Object.assign(existing, { rating: r.rating, tags: r.tags });
        else db.reviews.push({ id: nextId(), session_id: s!.id, reviewer_id: uid, reviewed_id: r.reviewed_id, rating: r.rating, tags: r.tags, created_at: iso(nowMs()) });
        n++;
      }
      return n;
    },

    my_sessions: (a) => {
      const uid = getUid();
      if (!uid) return [];
      const now = nowMs();
      const mine = (s: Row, st: string[]) => parts(s.id).some((p) => p.user_id === uid && st.includes(p.status));
      const list = db.sessions.filter((s) => {
        switch (a.p_kind) {
          case 'hosting':
            return s.host_id === uid && s.status !== 'draft' && (ms(s.ends_at) > now || (s.status === 'published' && ms(s.starts_at) > now - 14 * DAY));
          case 'upcoming':
            return ms(s.ends_at) > now && ['published', 'cancelled'].includes(s.status) && mine(s, ['joined', 'waitlist']);
          case 'past':
            return ms(s.ends_at) <= now && s.status !== 'cancelled' && mine(s, ['joined', 'attended', 'no_show']);
          default:
            return false;
        }
      });
      list.sort((x, y) => (a.p_kind === 'past' ? ms(y.starts_at) - ms(x.starts_at) : ms(x.starts_at) - ms(y.starts_at)));
      return list.map((s) => ({
        ...card(s),
        needs_checkin: s.host_id === uid && ms(s.starts_at) <= now && s.status === 'published',
        needs_review: a.p_kind === 'past' && ms(s.starts_at) > now - 14 * DAY && !db.reviews.some((r) => r.session_id === s.id && r.reviewer_id === uid) && parts(s.id).some((p) => p.user_id === uid && p.status === 'attended'),
      }));
    },

    my_past_hosted: () => {
      const uid = getUid();
      const seen = new Set<string>();
      return db.sessions
        .filter((s) => s.host_id === uid && ms(s.starts_at) < nowMs() && ['completed', 'published'].includes(s.status))
        .sort((a, b) => ms(b.starts_at) - ms(a.starts_at))
        .filter((s) => {
          const k = s.series_id ?? s.title;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, 10)
        .map((s) => card(s));
    },

    my_saved_sessions: () => {
      const uid = getUid();
      return db.saved_sessions
        .filter((x) => x.user_id === uid)
        .map((x) => session(x.session_id))
        .filter((s): s is Row => !!s && ms(s.ends_at) > nowMs())
        .sort((a, b) => ms(a.starts_at) - ms(b.starts_at))
        .map((s) => card(s));
    },

    get_profile: (a) => getProfile(a.p_user_id),

    get_me: () => {
      const uid = getUid();
      const p = profile(uid);
      if (!p) return null;
      return {
        ...getProfile(p.id),
        locale: p.locale,
        city_id: p.city_id,
        profile_complete: !!p.adult_confirmed_at && !!p.terms_accepted_at && p.display_name !== '',
        terms_version: p.terms_version,
        interest_ids: db.user_interests.filter((i) => i.user_id === uid).map((i) => i.category_id),
        unread_notifications: db.notifications.filter((n) => n.user_id === uid && !n.read_at).length,
        is_admin: !!p.is_admin,
      };
    },

    complete_profile: (a) => {
      const uid = requireUser();
      const birth = new Date(a.p_birthdate);
      const limit = new Date();
      limit.setFullYear(limit.getFullYear() - 18);
      if (!(birth <= limit)) fail('underage');
      const p = profile(uid)!;
      Object.assign(p, { display_name: String(a.p_display_name).trim(), adult_confirmed_at: iso(nowMs()), terms_accepted_at: iso(nowMs()), terms_version: a.p_terms_version, city_id: a.p_city_id ?? p.city_id ?? 1 });
      for (const id of a.p_interest_ids ?? []) if (!db.user_interests.some((i) => i.user_id === uid && i.category_id === id)) db.user_interests.push({ user_id: uid, category_id: id, level: 'all' });
      return null;
    },

    set_interests: (a) => {
      const uid = requireUser();
      db.user_interests = db.user_interests.filter((i) => i.user_id !== uid).concat((a.p_interest_ids as number[]).map((id) => ({ user_id: uid, category_id: id, level: 'all' })));
      return null;
    },

    delete_my_account: () => {
      const uid = requireUser();
      db.sessions.filter((s) => s.host_id === uid && s.status === 'published' && ms(s.starts_at) > nowMs()).forEach((s) => cancelInternal(s.id, null));
      db.profiles = db.profiles.filter((p) => p.id !== uid);
      db.session_participants = db.session_participants.filter((p) => p.user_id !== uid);
      db.messages.filter((m) => m.user_id === uid).forEach((m) => (m.user_id = null));
      return null;
    },

    list_groups: (a) => {
      const uid = getUid();
      return db.groups
        .filter((g) => (a.p_scope === 'mine' ? isGroupMember(g.id, uid) : g.city_id === a.p_city_id && g.visibility === 'public' && !isGroupMember(g.id, uid)))
        .filter((g) => !blockedBetween(uid, g.owner_id))
        .sort((x, y) => ms(y.created_at) - ms(x.created_at))
        .map(groupCard);
    },

    get_group: (a) => {
      const uid = getUid();
      const g = a.p_invite_code ? db.groups.find((x) => x.invite_code === a.p_invite_code) : group(a.p_group_id);
      if (!g) return null;
      const open = g.visibility === 'public' || isGroupMember(g.id, uid) || a.p_invite_code === g.invite_code;
      return {
        ...groupCard(g),
        invite_code: isGroupMember(g.id, uid) ? g.invite_code : null,
        upcoming: open
          ? db.sessions.filter((s) => s.group_id === g.id && s.status === 'published' && ms(s.starts_at) > nowMs()).sort((x, y) => ms(x.starts_at) - ms(y.starts_at)).slice(0, 12).map((s) => card(s))
          : [],
        locked: g.visibility === 'private' && !isGroupMember(g.id, uid) && a.p_invite_code !== g.invite_code,
        is_following: db.follows.some((f) => f.follower_id === uid && f.group_id === g.id),
      };
    },

    join_group: (a) => {
      const uid = requireReady();
      const g = a.p_invite_code ? db.groups.find((x) => x.invite_code === a.p_invite_code) : group(a.p_group_id);
      if (!g) fail('group_unavailable');
      if (g!.visibility === 'private' && a.p_invite_code !== g!.invite_code) fail('group_private');
      if (!member(g!.id, uid)) db.group_members.push({ group_id: g!.id, user_id: uid, role: 'member', trusted: false, joined_at: iso(nowMs()) });
      return g!.id;
    },

    leave_group: (a) => {
      const uid = requireUser();
      if (group(a.p_group_id)?.owner_id === uid) fail('owner_cannot_leave');
      db.group_members = db.group_members.filter((m) => !(m.group_id === a.p_group_id && m.user_id === uid));
      return null;
    },

    group_members_list: (a) => {
      const uid = getUid();
      const g = group(a.p_group_id);
      if (!g || !isGroupMember(g.id, uid)) return [];
      return db.group_members
        .filter((m) => m.group_id === g.id)
        .map((m) => ({
          ...person(m.user_id),
          role: m.role,
          trusted: !!m.trusted,
          is_owner: m.user_id === g.owner_id,
          sessions_attended: db.session_participants.filter((p) => p.user_id === m.user_id && p.status === 'attended' && session(p.session_id)?.group_id === g.id).length,
          reliability: reliability(m.user_id),
        }))
        .sort((x, y) => Number(y.is_owner) - Number(x.is_owner) || (x.role === y.role ? Number(y.trusted) - Number(x.trusted) : x.role === 'admin' ? -1 : 1));
    },

    set_group_member: (a) => {
      const uid = requireUser();
      const g = group(a.p_group_id);
      if (!g || !isGroupAdmin(g.id, uid)) fail('not_group_admin');
      if (a.p_role && g!.owner_id !== uid) fail('owner_only');
      const m = member(g!.id, a.p_user_id) ?? fail('not_member');
      if (a.p_role) m!.role = a.p_role;
      if (a.p_trusted != null) m!.trusted = a.p_trusted;
      return null;
    },

    set_priority_window: (a) => {
      const uid = requireUser();
      const s = session(a.p_session_id);
      if (!s || !s.group_id || !canManage(s, uid)) fail('not_host');
      s!.priority_until = a.p_hours === 0 ? null : iso(Math.min(nowMs() + a.p_hours * HOUR, ms(s!.starts_at)));
      if (a.p_hours > 0) for (const m of db.group_members.filter((x) => x.group_id === s!.group_id && x.trusted && x.user_id !== uid)) notify(m.user_id, 'priority_access', s!.id, { title: s!.title, hours: a.p_hours });
      return null;
    },

    session_roster: (a) => {
      const uid = getUid();
      const s = session(a.p_session_id);
      if (!s || !(isSessionMember(s, uid) || canManage(s, uid))) return [];
      return parts(s.id)
        .filter((p) => ['joined', 'attended', 'no_show'].includes(p.status))
        .map((p) => {
          const r = db.reviews.find((x) => x.session_id === s.id && x.reviewer_id === uid && x.reviewed_id === p.user_id);
          return { ...person(p.user_id), status: p.status, guest_count: p.guest_count, is_host: p.user_id === s.host_id, my_review: r ? { rating: r.rating, tags: r.tags } : null };
        });
    },

    list_messages: (a) => {
      const uid = getUid();
      const s = a.p_session_id ? session(a.p_session_id) : null;
      const allowed = s ? isSessionMember(s, uid) : a.p_group_id ? isGroupMember(a.p_group_id, uid) : false;
      if (!allowed) return [];
      return db.messages
        .filter((m) => (a.p_session_id ? m.session_id === a.p_session_id : m.group_id === a.p_group_id))
        .filter((m) => !db.blocks.some((b) => b.blocker_id === uid && b.blocked_id === m.user_id))
        .sort((x, y) => x.id - y.id)
        .slice(-40)
        .map((m) => ({ id: m.id, body: m.body, created_at: m.created_at, user_id: m.user_id, deleted: !!m.deleted_at, author: person(m.user_id) }));
    },

    delete_message: (a) => {
      const uid = requireUser();
      const m = db.messages.find((x) => x.id === a.p_message_id);
      if (!m) return null;
      const s = m.session_id ? session(m.session_id) : null;
      if (m.user_id !== uid && !(s && s.host_id === uid) && !(m.group_id && isGroupAdmin(m.group_id, uid))) fail('forbidden');
      Object.assign(m, { deleted_at: iso(nowMs()), body: '·' });
      return null;
    },

    list_notifications: () => {
      const uid = getUid();
      return db.notifications.filter((n) => n.user_id === uid).sort((a, b) => ms(b.created_at) - ms(a.created_at)).slice(0, 50);
    },

    mark_notifications_read: () => {
      const uid = getUid();
      db.notifications.filter((n) => n.user_id === uid && !n.read_at).forEach((n) => (n.read_at = iso(nowMs())));
      return null;
    },

    host_dashboard: (a) => {
      const uid = getUid();
      const since = nowMs() - (a.p_days ?? 90) * DAY;
      const mine = db.sessions.filter((s) => s.host_id === uid && ['published', 'completed'].includes(s.status) && ms(s.starts_at) > since);
      const past = mine.filter((s) => ms(s.starts_at) <= nowMs());
      const att = db.session_participants.filter((p) => p.user_id !== uid && past.some((s) => s.id === p.session_id));
      const fill = (ss: Row[]) => (ss.length ? Math.round((100 * ss.reduce((n, s) => n + Math.min(s.places_taken, s.max_players) / s.max_players, 0)) / ss.length) : null);
      const done = att.filter((p) => ['attended', 'no_show'].includes(p.status));
      const weekKey = (iso_: string) => {
        const d = new Date(iso_);
        const day = (d.getUTCDay() + 6) % 7;
        const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
        return monday.toISOString().slice(0, 10);
      };
      const weeks = new Map<string, Row[]>();
      for (const s of mine) weeks.set(weekKey(s.starts_at), [...(weeks.get(weekKey(s.starts_at)) ?? []), s]);
      const counts = new Map<string, number>();
      for (const p of att.filter((x) => x.status === 'attended')) counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1);
      return {
        days: a.p_days ?? 90,
        sessions_total: mine.length,
        sessions_upcoming: mine.length - past.length,
        fill_rate: fill(past),
        attendance_rate: done.length ? Math.round((100 * done.filter((p) => p.status === 'attended').length) / done.length) : null,
        unique_players: new Set(att.filter((p) => ['attended', 'joined', 'no_show'].includes(p.status)).map((p) => p.user_id)).size,
        thumbs_up: db.reviews.filter((r) => r.reviewed_id === uid && r.rating === 1 && past.some((s) => s.id === r.session_id)).length,
        weekly: [...weeks.entries()].sort().map(([week, ss]) => ({ week, sessions: ss.length, fill: fill(ss.filter((s) => ms(s.starts_at) <= nowMs())) })),
        regulars: [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => ({ ...person(id), count: n })),
        recent: [...past]
          .sort((x, y) => ms(y.starts_at) - ms(x.starts_at))
          .slice(0, 8)
          .map((s) => ({
            id: s.id, title: s.title, starts_at: s.starts_at, status: s.status, places_taken: s.places_taken, max_players: s.max_players,
            attended: att.filter((p) => p.session_id === s.id && p.status === 'attended').length,
            no_show: att.filter((p) => p.session_id === s.id && p.status === 'no_show').length,
          })),
      };
    },

    admin_list_reports: (a) => {
      if (!profile(getUid())?.is_admin) fail('forbidden');
      return db.reports
        .filter((r) => r.status === (a.p_status ?? 'open'))
        .sort((x, y) => ms(y.created_at) - ms(x.created_at))
        .map((r) => {
          let target: Row | null = null;
          if (r.target_type === 'user') {
            const p = profile(r.target_id);
            target = p ? { ...person(p.id), is_banned: !!p.is_banned } : null;
          } else if (r.target_type === 'session') {
            const s = session(r.target_id);
            target = s ? { title: s.title, status: s.status, starts_at: s.starts_at, host: person(s.host_id) } : null;
          } else if (r.target_type === 'group') {
            const g = group(r.target_id);
            target = g ? { name: g.name, visibility: g.visibility, owner: person(g.owner_id) } : null;
          } else {
            const m = db.messages.find((x) => String(x.id) === r.target_id);
            target = m ? { body: m.body, deleted: !!m.deleted_at, author: person(m.user_id) } : null;
          }
          return { ...r, reporter: person(r.reporter_id), reports_on_target: db.reports.filter((x) => x.target_type === r.target_type && x.target_id === r.target_id).length, target };
        });
    },

    admin_resolve_report: (a) => {
      if (!profile(getUid())?.is_admin) fail('forbidden');
      const r = db.reports.find((x) => x.id === a.p_report_id) ?? fail('not_found');
      const authorOf = () =>
        r!.target_type === 'user' ? r!.target_id : r!.target_type === 'session' ? session(r!.target_id)?.host_id : r!.target_type === 'group' ? group(r!.target_id)?.owner_id : db.messages.find((m) => String(m.id) === r!.target_id)?.user_id;
      switch (a.p_action) {
        case 'ban_user': {
          const p = profile(authorOf());
          if (p) {
            p.is_banned = true;
            db.sessions.filter((s) => s.host_id === p.id && s.status === 'published' && ms(s.starts_at) > nowMs()).forEach((s) => cancelInternal(s.id, null));
          }
          break;
        }
        case 'cancel_session':
          cancelInternal(r!.target_id, null);
          break;
        case 'delete_message': {
          const m = db.messages.find((x) => String(x.id) === r!.target_id);
          if (m) Object.assign(m, { deleted_at: iso(nowMs()), body: '·' });
          break;
        }
        case 'hide_group': {
          const g = group(r!.target_id);
          if (g) g.visibility = 'private';
          break;
        }
      }
      db.reports.filter((x) => x.target_type === r!.target_type && x.target_id === r!.target_id && x.status === 'open').forEach((x) => (x.status = a.p_status));
      return null;
    },

    admin_unban: (a) => {
      if (!profile(getUid())?.is_admin) fail('forbidden');
      const p = profile(a.p_user_id);
      if (p) p.is_banned = false;
      return null;
    },

    admin_city_stats: () => {
      if (!profile(getUid())?.is_admin) fail('forbidden');
      const byWeek = new Map<string, Row[]>();
      for (const s of db.sessions.filter((x) => ['published', 'completed'].includes(x.status))) {
        const d = new Date(s.starts_at);
        const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
        byWeek.set(monday, [...(byWeek.get(monday) ?? []), s]);
      }
      return {
        totals: {
          users: db.profiles.filter((p) => p.terms_accepted_at).length,
          banned: db.profiles.filter((p) => p.is_banned).length,
          groups: db.groups.length,
          open_reports: db.reports.filter((r) => r.status === 'open').length,
          sessions_upcoming: db.sessions.filter((s) => s.status === 'published' && ms(s.starts_at) > nowMs()).length,
        },
        weekly: [...byWeek.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([week, ss]) => {
            const ps = db.session_participants.filter((p) => ss.some((s) => s.id === p.session_id) && ['attended', 'no_show'].includes(p.status));
            return {
              week,
              city: 'Montréal',
              sessions_published: ss.length,
              active_hosts: new Set(ss.map((s) => s.host_id)).size,
              fill_rate_pct: Math.round((1000 * ss.reduce((n, s) => n + Math.min(s.places_taken, s.max_players) / s.max_players, 0)) / ss.length) / 10,
              attendance_rate_pct: ps.length ? Math.round((1000 * ps.filter((p) => p.status === 'attended').length) / ps.length) / 10 : null,
            };
          }),
        // Même définition que la vue SQL metrics.cohorts (activation 48 h, 2e session en 14 jours)
        cohorts: (() => {
          const byCohort = new Map<string, Row[]>();
          for (const p of db.profiles.filter((x) => x.terms_accepted_at)) {
            const d = new Date(p.created_at);
            const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
            byCohort.set(monday, [...(byCohort.get(monday) ?? []), p]);
          }
          return [...byCohort.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([cohort, users]) => {
              const stats = users.map((u) => {
                const joins = db.session_participants.filter((p) => p.user_id === u.id).map((p) => ms(p.joined_at));
                const hosts = db.sessions.filter((s) => s.host_id === u.id).map((s) => ms(s.created_at));
                const firstJoin = joins.length ? Math.min(...joins) : null;
                const first = Math.min(firstJoin ?? Infinity, ...hosts);
                const within14 = firstJoin == null ? 0 : db.session_participants.filter((p) => p.user_id === u.id && ['joined', 'attended', 'no_show'].includes(p.status) && ms(p.joined_at) <= firstJoin + 14 * DAY).length;
                return { activated: first <= ms(u.created_at) + 2 * DAY, joined: firstJoin != null, second: within14 >= 2 };
              });
              const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : null);
              return {
                cohort,
                signups: users.length,
                activation_48h_pct: pct(stats.filter((x) => x.activated).length, users.length),
                second_session_14d_pct: pct(stats.filter((x) => x.second).length, stats.filter((x) => x.joined).length),
              };
            });
        })(),
      };
    },
  };

  return { rpc, db, refreshCounts };
}
