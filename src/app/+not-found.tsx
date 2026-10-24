import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <EmptyState title={t('errors.notFound')} actionLabel={t('discover.emptyCta')} onAction={() => router.replace('/')} variant={1} />
    </Screen>
  );
}
