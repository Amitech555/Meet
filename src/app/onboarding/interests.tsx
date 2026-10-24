import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OnboardingFrame, OnboardingTitle } from '@/components/onboarding/OnboardingFrame';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { ActivityIcon } from '@/components/ui/ActivityIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icons } from '@/components/ui/icons';
import { categoryName } from '@/components/ui/CategoryChip';
import { useTopCategories } from '@/features/catalog/hooks';
import { useFinishOnboarding } from '@/features/onboarding/useFinishOnboarding';
import { usePrefs } from '@/stores/prefs';
import { useAuth } from '@/stores/auth';
import { rpc } from '@/lib/rpc';
import { tintFor } from '@design/tokens';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

const MIN = 3;

/** Écran 3 : grandes tuiles colorées, au moins 3 intérêts, retour tactile à chaque sélection. */
export default function InterestsStep() {
  const { t, i18n } = useTranslation();
  const finish = useFinishOnboarding();
  const { data, isLoading } = useTopCategories();
  const interests = usePrefs((s) => s.interests);
  const setInterests = usePrefs((s) => s.setInterests);
  const signedIn = useAuth((s) => !!s.session);

  const toggle = (id: number) => {
    haptics.tap();
    setInterests(interests.includes(id) ? interests.filter((x) => x !== id) : [...interests, id]);
  };

  const missing = Math.max(0, MIN - interests.length);

  return (
    <OnboardingFrame
      step={3}
      onSkip={() => finish(true)}
      footer={
        <>
          <Text variant="caption" tone="soft" className="text-center" accessibilityLiveRegion="polite">
            {missing > 0 ? t('onboarding.interestsMin', { count: missing }) : t('onboarding.interestsCount', { count: interests.length })}
          </Text>
          <Button
            label={t('onboarding.done')}
            size="lg"
            disabled={missing > 0}
            onPress={() => {
              if (signedIn) void rpc('set_interests', { p_interest_ids: interests }).catch(() => undefined);
              finish(false);
            }}
          />
        </>
      }
    >
      <ScrollView contentContainerClassName="gap-5 px-4 py-6">
        <OnboardingTitle title={t('onboarding.interestsTitle')} body={t('onboarding.interestsBody')} />
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {isLoading
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 w-[48.5%] rounded-card" tint={(['orange', 'jaune', 'turquoise', 'encre'] as const)[i % 4]} />)
            : data
                ?.filter((c) => c.slug !== 'other')
                .map((c, i) => {
                  const tint = tintFor(c.tint);
                  const selected = interests.includes(c.id);
                  // Tailles variées : une tuile large tous les 5 éléments pour casser la grille
                  const wide = i % 5 === 0;
                  return (
                    <PressableScale
                      key={c.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={categoryName(c, i18n.language)}
                      onPress={() => toggle(c.id)}
                      scaleTo={0.95}
                      className={cn('h-28 justify-between rounded-card p-4', wide ? 'w-full' : 'w-[48.5%]', selected && 'border-4 border-ink')}
                      style={{ backgroundColor: tint.bg }}
                    >
                      <View className="flex-row items-start justify-between">
                        <ActivityIcon name={c.icon} size={wide ? 40 : 32} color={tint.fg} />
                        {selected ? (
                          <View className="h-7 w-7 items-center justify-center rounded-pill bg-ink">
                            <Icons.Check size={16} weight="bold" color={tint.bg} />
                          </View>
                        ) : null}
                      </View>
                      <Text variant="heading" tone="inherit" className="font-bold" style={{ color: tint.fg }} numberOfLines={2}>
                        {categoryName(c, i18n.language)}
                      </Text>
                    </PressableScale>
                  );
                })}
        </View>
      </ScrollView>
    </OnboardingFrame>
  );
}
