import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/stores/auth';

/** Synchronise la session Supabase dans le store (monté une fois à la racine). */
export function useAuthListener() {
  const setSession = useAuth((s) => s.setSession);
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => data.subscription.unsubscribe();
  }, [setSession]);
}
