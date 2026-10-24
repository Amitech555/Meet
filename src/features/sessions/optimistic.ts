import { spotsLeft, type PersonPreview, type SessionSummary } from './types';

/** Rejoindre, côté client : place libre → inscrit (avatar ajouté), sinon liste d'attente. */
export function optimisticJoin(s: SessionSummary, me: PersonPreview | null, guest = false): SessionSummary {
  if (s.my_status === 'joined' || s.my_status === 'waitlist') return s;
  const need = guest ? 2 : 1;
  const fits = spotsLeft(s) >= need && s.waitlist_count === 0;
  if (!fits) return { ...s, my_status: 'waitlist', waitlist_count: s.waitlist_count + 1 };
  return {
    ...s,
    my_status: 'joined',
    joined_count: s.joined_count + need,
    participants_preview: me && !s.participants_preview.some((p) => p.id === me.id) ? [...s.participants_preview, me] : s.participants_preview,
  };
}

/** Se désister, côté client. */
export function optimisticLeave(s: SessionSummary, meId: string | null, guestCount = 0): SessionSummary {
  if (s.my_status === 'joined') {
    return {
      ...s,
      my_status: 'cancelled',
      joined_count: Math.max(0, s.joined_count - 1 - guestCount),
      participants_preview: s.participants_preview.filter((p) => p.id !== meId),
    };
  }
  if (s.my_status === 'waitlist') return { ...s, my_status: 'cancelled', waitlist_count: Math.max(0, s.waitlist_count - 1) };
  return s;
}

/** Réconcilie avec la réponse serveur (statut réel + compteur exact). */
export function reconcileJoin(s: SessionSummary, status: SessionSummary['my_status'], placesTaken: number): SessionSummary {
  return { ...s, my_status: status, joined_count: placesTaken };
}
