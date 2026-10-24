import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { Icons } from '@/components/ui/icons';

export default function Notifications() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <View className="flex-row items-center gap-3">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="title" accessibilityRole="header" className="flex-1">
          {t('notifications.title')}
        </Text>
      </View>
      <Text tone="soft">{t('notifications.empty')}</Text>
    </Screen>
  );
}
