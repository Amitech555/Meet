import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error' | 'celebrate';
type Toast = { id: number; message: string; tone: ToastTone };

type ToastState = {
  current: Toast | null;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
};

let seq = 0;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (message, tone = 'default') => set({ current: { id: ++seq, message, tone } }),
  hide: () => set({ current: null }),
}));

export const toast = (message: string, tone?: ToastTone) => useToast.getState().show(message, tone);
