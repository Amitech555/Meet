import { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { Icons } from '@/components/ui/icons';
import { SignInPrompt } from '@/components/SignInPrompt';
import { ProfileView } from '@/components/profile/ProfileView';
import { useMe } from '@/features/auth/hooks';
import { deleteAccount, signOut } from '@/features/auth/api';
import { useUpdateProfile } from '@/features/profile/hooks';
import { usePrefs } from '@/stores/prefs';
import { useAuth, useUserId } from '@/stores/auth';
import { pickAndUpload } from '@/lib/upload';
import { errorMessage } from '@/lib/errors';
import { toast } from '@/stores/toast';
import i18n from '@/i18n';

function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('', message, [
      { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: i18n.t('common.confirm'), style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

function Settings() {
  const { t } = useTranslation();
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const setLocale = usePrefs((s) => s.setLocale);
  const signedIn = useAuth((s) => !!s.session);
  const update = useUpdateProfile();
  const qc = useQueryClient();
  const lang = i18n.language === 'en' ? 'en' : 'fr';
  return (
    <View className="gap-5 rounded-card border border-line bg-surface p-4">
      <Text variant="title">{t('profile.settings')}</Text>
      <View className="gap-2">
        <Text variant="label" tone="soft">
          {t('profile.language')}
        </Text>
        <View className="flex-row gap-2">
          {(['fr', 'en'] as const).map((l) => (
            <Pill
              key={l}
              label={t(l === 'fr' ? 'profile.langFr' : 'profile.langEn')}
              selected={lang === l}
              onPress={() => {
                setLocale(l);
                void i18n.changeLanguage(l);
                if (signedIn) update.mutate({ locale: l });
              }}
            />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Text variant="label" tone="soft">
          {t('profile.theme')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {(['system', 'light', 'dark'] as const).map((m) => (
            <Pill key={m} label={t(m === 'system' ? 'profile.themeSystem' : m === 'light' ? 'profile.themeLight' : 'profile.themeDark')} selected={theme === m} onPress={() => setTheme(m)} />
          ))}
        </View>
      </View>
      <Button label={t('profile.notifications')} variant="outline" icon={Icons.Bell} onPress={() => router.push('/notifications')} />
      <Button label={t('terms.title')} variant="outline" icon={Icons.ShieldCheck} onPress={() => router.push('/terms')} />
      {signedIn ? (
        <>
          <Button
            label={t('auth.signOut')}
            variant="ghost"
            icon={Icons.SignOut}
            onPress={async () => {
              await signOut();
              qc.clear();
            }}
          />
          <Button
            label={t('auth.deleteAccount')}
            variant="danger"
            icon={Icons.Trash}
            onPress={async () => {
              if (!(await confirm(t('auth.deleteConfirm')))) return;
              try {
                await deleteAccount();
                qc.clear();
              } catch (e) {
                toast(errorMessage(e, t), 'error');
              }
            }}
          />
        </>
      ) : null}
      {Platform.OS !== 'web' ? <Button label={t('profile.privacy')} variant="ghost" onPress={() => void Linking.openSettings()} /> : null}
    </View>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => !!s.session);
  const uid = useUserId();
  const me = useMe();
  const update = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);

  const changeAvatar = async () => {
    if (!uid) return;
    setUploading(true);
    try {
      const url = await pickAndUpload('avatars', uid, [1, 1]);
      if (url) update.mutate({ avatar_url: url });
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between">
        <Text variant="display" accessibilityRole="header">
          {t('tabs.profile')}
        </Text>
        {me.data ? (
          <Button
            label={t('profile.edit')}
            variant="outline"
            icon={Icons.ImageSquare}
            onPress={() => {
              setName(me.data!.display_name);
              setBio(me.data!.bio ?? '');
              setEditing(true);
            }}
          />
        ) : null}
      </View>
      {!signedIn ? (
        <SignInPrompt />
      ) : me.isLoading ? (
        <View className="gap-4">
          <Skeleton className="h-24 w-24 rounded-pill" tint="turquoise" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 rounded-card" />
        </View>
      ) : me.isError ? (
        <ErrorState message={errorMessage(me.error, t)} retryLabel={t('common.retry')} onRetry={() => me.refetch()} icon={Icons.WifiSlash} />
      ) : me.data ? (
        <ProfileView
          profile={me.data}
          avatarAction={
            <View className="absolute -bottom-3 -right-4 scale-75">
              <IconButton icon={uploading ? Icons.ArrowsClockwise : Icons.ImageSquare} label={t('profile.edit')} variant="ink" onPress={() => void changeAvatar()} />
            </View>
          }
        />
      ) : null}
      {me.data && (me.data.sessions_hosted > 0 || me.data.is_admin) ? (
        <View className="gap-2">
          {me.data.sessions_hosted > 0 ? <Button label={t('host.open')} variant="ink" icon={Icons.ListBullets} onPress={() => router.push('/host')} /> : null}
          {me.data.is_admin ? <Button label={t('admin.open')} variant="outline" icon={Icons.ShieldCheck} onPress={() => router.push('/admin')} /> : null}
        </View>
      ) : null}
      <Settings />

      <Sheet open={editing} onClose={() => setEditing(false)} title={t('profile.edit')}>
        <View className="gap-4">
          <TextField label={t('auth.displayName')} value={name} onChangeText={setName} maxLength={40} />
          <TextField label={t('profile.bio')} placeholder={t('profile.bioPlaceholder')} value={bio} onChangeText={setBio} multiline maxLength={160} />
          <Button
            label={t('common.save')}
            size="lg"
            disabled={name.trim().length === 0}
            loading={update.isPending}
            onPress={() => update.mutate({ display_name: name.trim(), bio: bio.trim() || null }, { onSuccess: () => setEditing(false) })}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
