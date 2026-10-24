import { useSyncExternalStore } from 'react';
import { usePrefs } from '@/stores/prefs';

/** Vrai quand les préférences persistées (AsyncStorage) sont rechargées. */
export function usePrefsHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => usePrefs.persist.onFinishHydration(cb),
    () => usePrefs.persist.hasHydrated(),
    () => false,
  );
}
