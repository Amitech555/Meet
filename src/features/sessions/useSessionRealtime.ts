import { useEffect, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { updateSessionEverywhere } from './cache';
import type { SessionStatus } from './types';

type Row = { id: string; places_taken: number; waitlist_count: number; status: SessionStatus; title: string };

/** Compteur de places en direct : écoute les mises à jour de la session (Realtime respecte la RLS). */
export function useSessionRealtime(id: string | undefined) {
  const qc = useQueryClient();
  // Nom unique par instance : un même écran peut être monté deux fois (retour d'auth) ;
  // réutiliser le nom renverrait un canal déjà abonné et supabase-js lèverait une erreur.
  const instance = useId();
  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`session:${id}:${instance}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` }, (payload) => {
        const row = payload.new as Row;
        updateSessionEverywhere(qc, id, (s) => ({ ...s, joined_count: row.places_taken, waitlist_count: row.waitlist_count, status: row.status, title: row.title }));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, qc, instance]);
}
