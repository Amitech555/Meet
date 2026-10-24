import { QueryClient, onlineManager, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // garde 24 h pour la lecture hors-ligne des sessions déjà vues
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online', retry: 0 },
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
}

export { onlineManager };
