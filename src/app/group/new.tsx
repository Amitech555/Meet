import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Pill } from '@/components/ui/Pill';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { Icons } from '@/components/ui/icons';
import { useTopCategories } from '@/features/catalog/hooks';
import { useCityId } from '@/features/sessions/hooks';
import { createGroup } from '@/features/groups/api';
import { useUserId } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';
import { track } from '@/lib/analytics';

/** Créer un groupe récurrent (ex. « Course Griffintown du mardi »). */
export default function NewGroup() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const uid = useUserId();
  const cityId = useCityId();
  const cats = useTopCategories();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rhythm, setRhythm] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 3 && categoryId != null && cityId != null;

  const submit = async () => {
    if (!uid || !valid) return;
    setBusy(true);
    try {
      const id = await createGroup({ ownerId: uid, name, description, categoryId: categoryId!, cityId: cityId!, rhythm, visibility });
      track('group_created', { visibility });
      void qc.invalidateQueries({ queryKey: ['group'] });
      router.replace({ pathname: '/group/[id]', params: { id } });
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <View className="flex-row items-center gap-3">
          <IconButton icon={Icons.X} label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/groups'))} />
          <Text variant="title" accessibilityRole="header">
            {t('groups.create')}
          </Text>
        </View>
        <TextField label={t('groups.name')} placeholder={t('groups.namePlaceholder')} value={name} onChangeText={setName} maxLength={60} />
        <View className="gap-2">
          <Text variant="label" tone="soft">
            {t('create.activity')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {cats.data?.map((c) => (
              <CategoryChip key={c.id} category={c} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </View>
        <TextField label={t('groups.rhythm')} placeholder={t('groups.rhythmPlaceholder')} value={rhythm} onChangeText={setRhythm} maxLength={60} />
        <TextField label={t('groups.description')} value={description} onChangeText={setDescription} multiline maxLength={500} />
        <View className="gap-2">
          <Text variant="label" tone="soft">
            {t('groups.visibility')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Pill label={t('groups.public')} selected={visibility === 'public'} onPress={() => setVisibility('public')} />
            <Pill label={t('groups.private')} icon={Icons.LockSimple} selected={visibility === 'private'} onPress={() => setVisibility('private')} />
          </View>
        </View>
        <Button label={t('groups.create')} size="lg" disabled={!valid} loading={busy} onPress={submit} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
