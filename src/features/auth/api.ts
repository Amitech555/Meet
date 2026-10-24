import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { rpc } from '@/lib/rpc';
import { toAppError } from '@/lib/errors';

export const TERMS_VERSION = '2026-10-24';

WebBrowser.maybeCompleteAuthSession();

/** Les réponses Auth sont des unions { data, error } ; on lève l'erreur et on renvoie data. */
function check<R extends { data: unknown; error: unknown }>(res: R): R['data'] {
  if (res.error) throw toAppError(res.error);
  return res.data;
}

export async function sendEmailCode(email: string) {
  check(await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } }));
}

export async function verifyEmailCode(email: string, token: string) {
  check(await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' }));
}

export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false));

/** Connexion Apple native (iOS) → jeton d'identité échangé auprès de Supabase. */
export async function signInWithApple(): Promise<{ givenName: string | null }> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!credential.identityToken) throw toAppError(new Error('apple_no_token'));
  check(await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken }));
  // Apple ne donne le nom qu'à la toute première connexion
  return { givenName: credential.fullName?.givenName ?? null };
}

/** Connexion Google par OAuth (PKCE) dans un navigateur intégré. */
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('auth');
  const data = check(
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' } }),
  );
  if (Platform.OS === 'web' || !data.url) return;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return;
  const code = new URL(res.url).searchParams.get('code');
  if (code) check(await supabase.auth.exchangeCodeForSession(code));
}

export async function completeProfile(input: { displayName: string; birthdate: string; cityId: number | null; interestIds: number[] }) {
  await rpc('complete_profile', {
    p_display_name: input.displayName,
    p_birthdate: input.birthdate,
    p_terms_version: TERMS_VERSION,
    p_city_id: input.cityId ?? undefined,
    p_interest_ids: input.interestIds,
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function deleteAccount() {
  await rpc('delete_my_account');
  await supabase.auth.signOut();
}
