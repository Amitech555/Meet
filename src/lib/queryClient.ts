import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, onlineManager, focusManager, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // garde 24 h pour la lecture hors-ligne des sessions déjà vues
      retry: 2,
      networkMode: 'offlineFirst',
    },
    // 'always' : hors-ligne, la mutation échoue tout de suite → rollback + « Pas de réseau » (pas de faux « Tu y es »)
    mutations: { networkMode: 'always', retry: 0 },
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
}

export { onlineManager };


/** Lecture hors-ligne : on persiste le feed, les sessions vues et « Mes sessions » (pas le chat ni le profil). */
export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'partants-cache', throttleTime: 2000 });

const PERSISTED_ROOTS = new Set(['feed', 'session', 'my-sessions', 'categories', 'cities', 'group']);

export const persistOptions = {
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (q: Query) => q.state.status === 'success' && PERSISTED_ROOTS.has(String(q.queryKey[0])),
  },
};
