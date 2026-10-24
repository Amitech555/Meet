import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc';
import { useAuth, useUserId } from '@/stores/auth';
import type { Me } from './types';

export const meKey = (uid: string | null) => ['me', uid] as const;

/** Mon profil (null si non connecté). Synchronise `profileComplete` dans le store d'auth. */
export function useMe() {
  const uid = useUserId();
  const setProfileComplete = useAuth((s) => s.setProfileComplete);
  const q = useQuery({
    queryKey: meKey(uid),
    queryFn: () => rpc<'get_me', Me | null>('get_me'),
    enabled: !!uid,
  });
  useEffect(() => {
    if (!uid) setProfileComplete(null);
    else if (q.data) setProfileComplete(q.data.profile_complete);
  }, [uid, q.data, setProfileComplete]);
  return q;
}
