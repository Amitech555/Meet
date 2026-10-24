import { View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { captureError } from '@/lib/monitoring';

/** Écran d'erreur humain (jamais d'écran blanc) ; l'erreur part à Sentry. */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  captureError(error);
  return (
    <View className="flex-1 justify-center gap-4 bg-bg p-6">
      <Text variant="display">{t('errors.generic')}</Text>
      <Button label={t('common.retry')} onPress={() => void retry()} />
    </View>
  );
}

export { AppErrorBoundary as ErrorBoundary };
