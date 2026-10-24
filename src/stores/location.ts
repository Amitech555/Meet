import { create } from 'zustand';
import type { LatLng } from '@/lib/geo';

/** Position approximative de la session courante (jamais persistée ni envoyée en analytics). */
type LocationState = { position: LatLng | null; setPosition: (p: LatLng | null) => void };

export const useLocationStore = create<LocationState>((set) => ({
  position: null,
  setPosition: (position) => set({ position }),
}));
