import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { OnboardingFrame, OnboardingTitle } from '@/components/onboarding/OnboardingFrame';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { useCities } from '@/features/catalog/hooks';
import { useFinishOnboarding } from '@/features/onboarding/useFinishOnboarding';
import { usePrefs } from '@/stores/prefs';
import { useLocationStore } from '@/stores/location';
import { useTheme } from '@/design/theme';
import { haptics } from '@/lib/haptics';
import { errorMessage } from '@/lib/errors';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';

/** Écran 2 : ville (Montréal par défaut), géolocalisation facultative. */
export default function CityStep() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const finish = useFinishOnboarding();
  const cities = useCities();
  const cityId = usePrefs((s) => s.cityId);
  const setCity = usePrefs((s) => s.setCity);
  const setPosition = useLocationStore((s) => s.setPosition);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const montreal = cities.data?.find((c) => c.slug === 'montreal');
  const selected = cityId ?? montreal?.id ?? null;

  const locate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (montreal) setCity(montreal.id); // seule ville ouverte pour l'instant
    } catch {
      setDenied(true);
    } finally {
      setLocating(false);
    }
  };

  return (
    <OnboardingFrame
      step={2}
      onSkip={() => finish(true)}
      footer={
        <Button
          label={t('common.continue')}
          size="lg"
          disabled={!selected}
          onPress={() => {
            if (selected) {
              setCity(selected);
              track('city_selected', { city_id: selected });
            }
            router.push('/onboarding/interests');
          }}
        />
      }
    >
      <ScrollView contentContainerClassName="gap-5 px-4 py-6">
        <OnboardingTitle title={t('onboarding.cityTitle')} body={t('onboarding.cityBody')} />
        <Button label={t('onboarding.useLocation')} variant="outline" icon={Icons.NavigationArrow} loading={locating} onPress={locate} />
        {denied ? <Text tone="soft">{t('onboarding.locationDenied')}</Text> : null}

        {cities.isError ? <ErrorState message={errorMessage(cities.error, t)} retryLabel={t('common.retry')} onRetry={() => cities.refetch()} icon={Icons.WifiSlash} /> : null}
        <View className="gap-3" accessibilityRole="radiogroup">
          {cities.isLoading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)
            : cities.data?.map((c) => {
                const isSel = c.id === selected;
                return (
                  <PressableScale
                    key={c.id}
                    disabled={!c.is_active}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSel, disabled: !c.is_active }}
                    accessibilityLabel={c.is_active ? c.name : `${c.name}, ${t('onboarding.comingSoon')}`}
                    onPress={() => {
                      haptics.tap();
                      setCity(c.id);
                    }}
                    className={cn(
                      'min-h-[64px] flex-row items-center justify-between rounded-card px-5',
                      isSel ? 'border-2 border-ink bg-surface' : 'border border-line bg-surface',
                      !c.is_active && 'opacity-60',
                    )}
                  >
                    <View>
                      <Text variant="title">{c.name}</Text>
                      <Text variant="caption" tone="soft">
                        {c.region}
                      </Text>
                    </View>
                    {c.is_active ? (
                      isSel ? (
                        <View className="h-8 w-8 items-center justify-center rounded-pill bg-ink">
                          <Icons.Check size={18} weight="bold" color={colors.bg} />
                        </View>
                      ) : null
                    ) : (
                      <View className="rounded-pill bg-surfaceAlt px-3 py-1">
                        <Text variant="caption" className="font-semibold">
                          {t('onboarding.comingSoon')}
                        </Text>
                      </View>
                    )}
                  </PressableScale>
                );
              })}
        </View>
      </ScrollView>
    </OnboardingFrame>
  );
}
