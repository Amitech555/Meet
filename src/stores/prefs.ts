import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DateShortcut } from '@/lib/time';
import type { SessionLevel } from '@/features/sessions/types';

export type PriceFilter = 'all' | 'free' | 'paid';

export type FeedFilters = {
  categoryIds: number[];
  date: DateShortcut | 'any' | { from: string; to: string };
  price: PriceFilter;
  levels: SessionLevel[];
  radiusKm: number | null;
};

export const defaultFilters: FeedFilters = { categoryIds: [], date: 'any', price: 'all', levels: [], radiusKm: null };

type PrefsState = {
  onboarded: boolean;
  cityId: number | null;
  interests: number[];
  theme: 'system' | 'light' | 'dark';
  filters: FeedFilters;
  view: 'list' | 'map';
  setOnboarded: (v: boolean) => void;
  setCity: (id: number) => void;
  setInterests: (ids: number[]) => void;
  setTheme: (t: PrefsState['theme']) => void;
  setFilters: (f: Partial<FeedFilters>) => void;
  resetFilters: () => void;
  setView: (v: 'list' | 'map') => void;
};

/** Préférences locales (fonctionnent sans compte : explorer d'abord, se connecter ensuite). */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      onboarded: false,
      cityId: null,
      interests: [],
      theme: 'system',
      filters: defaultFilters,
      view: 'list',
      setOnboarded: (onboarded) => set({ onboarded }),
      setCity: (cityId) => set({ cityId }),
      setInterests: (interests) => set({ interests }),
      setTheme: (theme) => set({ theme }),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: defaultFilters }),
      setView: (view) => set({ view }),
    }),
    {
      name: 'partants-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ onboarded, cityId, interests, theme, view }) => ({ onboarded, cityId, interests, theme, view }),
    },
  ),
);
