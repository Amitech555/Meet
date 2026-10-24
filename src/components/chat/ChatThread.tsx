import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { Button, IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState, ErrorState } from '../ui/EmptyState';
import { Icons } from '../ui/icons';
import { ReportSheet } from '../ReportSheet';
import { useChatRealtime, useDeleteMessage, useMessages, useSendMessage } from '@/features/chat/hooks';
import type { ThreadRef } from '@/features/chat/api';
import type { ChatMessage, PersonPreview } from '@/features/sessions/types';
import { useTheme } from '@/design/theme';
import { errorMessage } from '@/lib/errors';
import { formatMessageTime } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';

const MAX = 1000;

/** Fil de discussion (session ou groupe) : temps réel, envoi optimiste, signalement, suppression. */
export function ChatThread({ thread, me, hostId }: { thread: ThreadRef; me: PersonPreview | null; hostId?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const q = useMessages(thread);
  useChatRealtime(thread);
  const send = useSendMessage(thread, me);
  const del = useDeleteMessage(thread);
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const data = useMemo(() => [...(q.data ?? [])].reverse(), [q.data]);
  const tooLong = text.length > MAX;

  const submit = () => {
    const body = text.trim();
    if (!body || tooLong || !me) return;
    setText('');
    send.mutate(body);
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 64}>
      {q.isLoading ? (
        <View className="flex-1 gap-3 p-4">
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-12 w-2/3 self-end" tint="jaune" />
          <Skeleton className="h-12 w-1/2" />
        </View>
      ) : q.isError ? (
        <View className="flex-1 p-4">
          <ErrorState message={errorMessage(q.error, t)} retryLabel={t('common.retry')} onRetry={() => q.refetch()} icon={Icons.WifiSlash} />
        </View>
      ) : (
        <FlatList
          inverted={data.length > 0}
          data={data}
          keyExtractor={(m) => String(m.id)}
          contentContainerClassName="gap-3 p-4"
          ListEmptyComponent={<EmptyState title={t('chat.empty')} variant={1} />}
          renderItem={({ item: m, index }) => {
            const mine = m.user_id === me?.id;
            const prev = data[index + 1];
            const showAuthor = !mine && prev?.user_id !== m.user_id;
            return (
              <Pressable
                onLongPress={() => setSelected(m)}
                accessibilityHint={t('chat.reportMessage')}
                className={cn('max-w-[82%] flex-row items-end gap-2', mine && 'self-end')}
              >
                {!mine ? <View className="w-8">{showAuthor ? m.author ? <Avatar person={m.author} size={32} /> : null : null}</View> : null}
                <View className={cn('flex-shrink gap-1 rounded-card px-4 py-3', mine ? 'bg-citron' : 'border border-line bg-surface', m.id < 0 && 'opacity-60')}>
                  {showAuthor ? (
                    <Text variant="caption" className="font-bold">
                      {m.author?.display_name ?? t('chat.deletedUser')}
                      {m.user_id && m.user_id === hostId ? ` · ${t('chat.host')}` : ''}
                    </Text>
                  ) : null}
                  <Text tone={mine ? 'onCitron' : 'ink'} className={m.deleted ? 'italic' : undefined}>
                    {m.deleted ? t('chat.deleted') : m.body}
                  </Text>
                  <Text variant="caption" tone={mine ? 'onCitron' : 'soft'} tabular className="text-xs">
                    {formatMessageTime(m.created_at, currentLocale(), new Date(now))}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <View className="flex-row items-end gap-2 border-t border-line bg-surface px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <View className="flex-1 gap-1">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel={t('chat.placeholder')}
            multiline
            maxLength={MAX + 50}
            className="max-h-[120px] min-h-tap rounded-field border border-line bg-bg px-4 py-3 font-body text-md text-ink"
          />
          {tooLong ? (
            <Text variant="caption" tone="danger">
              {t('chat.tooLong')}
            </Text>
          ) : null}
        </View>
        <IconButton icon={Icons.PaperPlaneTilt} label={t('common.send')} variant="ink" onPress={submit} />
      </View>

      <Sheet open={!!selected} onClose={() => setSelected(null)}>
        <View className="gap-3">
          {selected?.user_id === me?.id || me?.id === hostId ? (
            <Button
              label={t('chat.delete')}
              variant="danger"
              icon={Icons.Trash}
              onPress={() => {
                if (selected) del.mutate(selected.id);
                setSelected(null);
              }}
            />
          ) : null}
          {selected?.user_id !== me?.id ? (
            <Button
              label={t('chat.reportMessage')}
              variant="outline"
              icon={Icons.Flag}
              onPress={() => {
                setReporting(selected);
                setSelected(null);
              }}
            />
          ) : null}
        </View>
      </Sheet>
      <ReportSheet open={!!reporting} onClose={() => setReporting(null)} targetType="message" targetId={String(reporting?.id ?? '')} />
    </KeyboardAvoidingView>
  );
}
