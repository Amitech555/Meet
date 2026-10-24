import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { cn } from '@/lib/cn';

/** Cadre commun des 3 écrans d'onboarding : progression, « Passer », pied collant. */
export function OnboardingFrame({
  step,
  onSkip,
  children,
  footer,
}: {
  step: 1 | 2 | 3;
  onSkip: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-4">
        <View className="flex-row gap-1" accessible accessibilityLabel={`${step}/3`}>
          {[1, 2, 3].map((i) => (
            <View key={i} className={cn('h-1.5 rounded-pill', i <= step ? 'w-8 bg-ink' : 'w-4 bg-line')} />
          ))}
        </View>
        <Button label={t('common.skip')} variant="ghost" onPress={onSkip} />
      </View>
      <View className="flex-1">{children}</View>
      <View className="gap-2 border-t border-line bg-bg px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {footer}
      </View>
    </View>
  );
}

export function OnboardingTitle({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-2">
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text tone="soft">{body}</Text>
    </View>
  );
}
