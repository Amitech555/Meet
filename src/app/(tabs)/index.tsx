import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';

// Remplacé par le vrai feed à l'étape (d).
export default function Discover() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <Text variant="display" accessibilityRole="header">{t('tabs.discover')}</Text>
      <EmptyState title={t('discover.emptyTitle')} body={t('discover.emptyBody')} actionLabel={t('discover.emptyCta')} actionIcon={Icons.Plus} onAction={() => router.push('/styleguide')} />
    </Screen>
  );
}
