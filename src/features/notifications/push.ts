import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

// Au premier plan : bannière discrète, sans son (l'utilisateur est déjà dans l'app).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function pushPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Demande la permission puis enregistre le jeton Expo dans push_tokens. */
export async function registerForPush(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  if (Platform.OS === 'android') {
    // eslint-disable-next-line import/namespace -- AndroidImportance est réexporté (faux positif du plugin import)
    await Notifications.setNotificationChannelAsync('default', { name: 'Partants', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return false; // pas encore de projet EAS : on réessaiera au prochain lancement
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.from('push_tokens').upsert({ token, user_id: userId, platform: Platform.OS === 'ios' ? 'ios' : 'android', updated_at: new Date().toISOString() });
  return true;
}
