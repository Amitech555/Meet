import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChatThread } from '@/components/chat/ChatThread';
import { IconButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { useSession } from '@/features/sessions/hooks';
import { useMe } from '@/features/auth/hooks';

/** Chat de session : ouvert aux inscrits et à l'organisateur (RLS). */
export default function SessionChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const session = useSession(id);
  const me = useMe().data;
  const person = me ? { id: me.id, display_name: me.display_name, avatar_url: me.avatar_url } : null;
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center gap-3 border-b border-line px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/session/[id]', params: { id } }))} />
        <View className="flex-1">
          <Text variant="heading" numberOfLines={1}>
            {session.data?.title ?? t('session.chat')}
          </Text>
          <Text variant="caption" tone="soft">
            {t('session.chat')}
          </Text>
        </View>
      </View>
      {session.data && !session.data.is_member ? (
        <View className="p-4">
          <EmptyState title={t('session.chatLocked')} variant={1} />
        </View>
      ) : (
        <ChatThread thread={{ sessionId: id }} me={person} hostId={session.data?.host.id} />
      )}
    </View>
  );
}
