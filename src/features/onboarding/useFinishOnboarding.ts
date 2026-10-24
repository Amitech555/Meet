import { useCallback } from 'react';
import { router } from 'expo-router';
import { usePrefs } from '@/stores/prefs';
import { useCities, MONTREAL_SLUG } from '@/features/catalog/hooks';
import { track } from '@/lib/analytics';

/** Termine (ou saute) l'onboarding : Montréal par défaut, puis le feed — sans compte. */
export function useFinishOnboarding() {
  const cities = useCities();
  const setOnboarded = usePrefs((s) => s.setOnboarded);
  const setCity = usePrefs((s) => s.setCity);
  return useCallback(
    (skipped: boolean) => {
      const { cityId, interests } = usePrefs.getState();
      if (!cityId) {
        const mtl = cities.data?.find((c) => c.slug === MONTREAL_SLUG);
        if (mtl) setCity(mtl.id);
      }
      setOnboarded(true);
      track('onboarding_completed', { skipped, interests: interests.length });
      router.replace('/');
    },
    [cities.data, setCity, setOnboarded],
  );
}
