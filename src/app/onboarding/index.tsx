import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingFrame, OnboardingTitle } from '@/components/onboarding/OnboardingFrame';
import { Marquee } from '@/components/onboarding/Marquee';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/features/catalog/hooks';
import { useFinishOnboarding } from '@/features/onboarding/useFinishOnboarding';
import type { Category } from '@/features/sessions/types';

function Row({ items, reverse, speed }: { items: Category[]; reverse?: boolean; speed: number }) {
  return (
    <Marquee reverse={reverse} speed={speed}>
      {items.map((c) => (
        <CategoryChip key={c.id} category={c} />
      ))}
    </Marquee>
  );
}

/** Écran 1 : bandeaux d'activités qui défilent + une phrase + un bouton. Pas de logo centré. */
export default function Welcome() {
  const { t } = useTranslation();
  const finish = useFinishOnboarding();
  const { data } = useCategories();
  const cats = (data ?? []).filter((c) => c.slug !== 'other');
  const half = Math.ceil(cats.length / 3);

  return (
    <OnboardingFrame
      step={1}
      onSkip={() => finish(true)}
      footer={
        <>
          <Button label={t('onboarding.welcomeCta')} size="lg" onPress={() => router.push('/onboarding/city')} />
          <Button label={t('onboarding.haveAccount')} variant="ghost" onPress={() => router.push('/auth')} />
        </>
      }
    >
      <View className="flex-1 justify-between py-6">
        <View className="gap-3 pt-4">
          {cats.length ? (
            <>
              <Row items={cats.slice(0, half)} speed={28} />
              <Row items={cats.slice(half, half * 2)} speed={22} reverse />
              <Row items={cats.slice(half * 2)} speed={34} />
            </>
          ) : (
            [0, 1, 2].map((i) => (
              <View key={i} className="flex-row gap-2 px-4">
                <Skeleton tint="orange" className="h-12 w-36 rounded-pill" />
                <Skeleton tint="turquoise" className="h-12 w-28 rounded-pill" />
                <Skeleton tint="jaune" className="h-12 w-32 rounded-pill" />
              </View>
            ))
          )}
        </View>
        <View className="px-4">
          <OnboardingTitle title={t('onboarding.welcomeTitle')} body={t('onboarding.welcomeBody')} />
        </View>
      </View>
    </OnboardingFrame>
  );
}
