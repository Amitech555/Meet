import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Category } from '@/features/sessions/types';

export type City = { id: number; slug: string; name: string; region: string; is_active: boolean };

const DAY = 24 * 60 * 60 * 1000;

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    staleTime: DAY,
    queryFn: async () => {
      const { data, error } = await supabase.from('cities').select('id, slug, name, region, is_active').order('is_active', { ascending: false }).order('name');
      if (error) throw toAppError(error);
      return data as City[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: DAY,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, slug, name_fr, name_en, icon, tint, parent_id, sort').order('sort');
      if (error) throw toAppError(error);
      return data as Category[];
    },
  });
}

/** Familles d'activités (catégories de premier niveau), dans l'ordre d'affichage. */
export function useTopCategories() {
  const q = useCategories();
  return { ...q, data: q.data?.filter((c) => c.parent_id === null) };
}

export const MONTREAL_SLUG = 'montreal';
