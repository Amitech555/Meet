import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Icons } from './ui/icons';
import { usePrefs } from '@/stores/prefs';
import { useUserId } from '@/stores/auth';
import { usePushPromptStore } from '@/stores/pushPrompt';
import { registerForPush } from '@/features/notifications/push';

/**
 * « On te prévient ? » — demandé une seule fois, juste après une première inscription,
 * quand la valeur est évidente (rappels, place libérée). Jamais au lancement.
 */
export function PushPrompt() {
  const { t } = useTranslation();
  const open = usePushPromptStore((s) => s.open);
  const close = usePushPromptStore((s) => s.close);
  const setPushAsked = usePrefs((s) => s.setPushAsked);
  const uid = useUserId();
  if (Platform.OS === 'web') return null;
  const done = () => {
    setPushAsked();
    close();
  };
  return (
    <Sheet open={open} onClose={done} title={t('notifications.enableTitle')}>
      <View className="gap-4">
        <Text tone="soft">{t('notifications.enableBody')}</Text>
        <Button
          label={t('notifications.enable')}
          size="lg"
          icon={Icons.Bell}
          onPress={() => {
            if (uid) void registerForPush(uid);
            done();
          }}
        />
        <Button label={t('common.skip')} variant="ghost" onPress={done} />
      </View>
    </Sheet>
  );
}
