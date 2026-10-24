import { create } from 'zustand';
import { usePrefs } from './prefs';

type S = { open: boolean; maybeOpen: () => void; close: () => void };

export const usePushPromptStore = create<S>((set) => ({
  open: false,
  maybeOpen: () => {
    if (!usePrefs.getState().pushAsked) set({ open: true });
  },
  close: () => set({ open: false }),
}));
