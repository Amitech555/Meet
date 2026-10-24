import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth, type PendingAction } from '@/stores/auth';

/**
 * Authentification différée : renvoie true si l'utilisateur peut agir tout de suite,
 * sinon mémorise l'action et ouvre la modale de connexion (l'action est rejouée après).
 */
export function useRequireAuth() {
  const setPending = useAuth((s) => s.setPending);
  return useCallback(
    (action: PendingAction): boolean => {
      const { session, profileComplete } = useAuth.getState();
      if (session && profileComplete !== false) return true;
      setPending(action);
      router.push({ pathname: '/auth', params: { intent: action.type } });
      return false;
    },
    [setPending],
  );
}
