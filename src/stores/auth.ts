import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

/** Action mise de côté pendant l'authentification différée, rejouée après connexion. */
export type PendingAction =
  | { type: 'join'; sessionId: string; series?: boolean }
  | { type: 'create' }
  | { type: 'createGroup' }
  | { type: 'joinGroup'; groupId: string; inviteCode?: string }
  | { type: 'chat'; sessionId: string };

type AuthState = {
  session: Session | null;
  ready: boolean;
  profileComplete: boolean | null; // null = inconnu (pas encore chargé)
  pending: PendingAction | null;
  setSession: (s: Session | null) => void;
  setProfileComplete: (v: boolean | null) => void;
  setPending: (a: PendingAction | null) => void;
  takePending: () => PendingAction | null;
};

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  ready: false,
  profileComplete: null,
  pending: null,
  setSession: (session) => set({ session, ready: true }),
  setProfileComplete: (profileComplete) => set({ profileComplete }),
  setPending: (pending) => set({ pending }),
  takePending: () => {
    const p = get().pending;
    set({ pending: null });
    return p;
  },
}));

export const useUserId = () => useAuth((s) => s.session?.user.id ?? null);
