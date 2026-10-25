import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icons } from '@/components/ui/icons';
import { appleAvailable, completeProfile, sendEmailCode, signInWithApple, signInWithGoogle, verifyEmailCode } from '@/features/auth/api';
import { useMe } from '@/features/auth/hooks';
import { useRunPendingAction } from '@/features/auth/usePendingAction';
import { useAuth } from '@/stores/auth';
import { usePrefs } from '@/stores/prefs';
import { errorMessage } from '@/lib/errors';
import { isAdult, maskBirthdate, parseBirthdate } from '@/lib/birthdate';
import { isDemo, isSupabaseConfigured } from '@/lib/env';
import { track } from '@/lib/analytics';

type Step = 'choose' | 'email' | 'code' | 'finish';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Connexion différée (modale) : Apple / Google / courriel (code à 6 chiffres),
 * puis dernière étape (prénom, 18+, conditions). L'action mise de côté est rejouée à la fin.
 */
export default function AuthScreen() {
  const { t } = useTranslation();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const session = useAuth((s) => s.session);
  const me = useMe();
  const qc = useQueryClient();
  const runPending = useRunPendingAction();
  const cityId = usePrefs((s) => s.cityId);
  const interests = usePrefs((s) => s.interests);

  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApple, setHasApple] = useState(false);

  useEffect(() => {
    void appleAvailable().then(setHasApple);
  }, []);

  // Connecté : profil complet → on rejoue l'action ; incomplet → dernière étape (dérivée, pas d'état)
  const profileComplete = me.data?.profile_complete;
  useEffect(() => {
    if (session && profileComplete) runPending();
  }, [session, profileComplete, runPending]);
  const currentStep: Step = session && me.data && !profileComplete ? 'finish' : step;
  const displayName = name ?? me.data?.display_name ?? '';

  const attempt = async (key: string, fn: () => Promise<void>) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      // Annulation volontaire de la feuille Apple : pas d'erreur à afficher
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      setError(errorMessage(e, t));
    } finally {
      setBusy(null);
    }
  };

  const birthError =
    birthdate.length === 10 && !parseBirthdate(birthdate)
      ? t('auth.birthdatePlaceholder')
      : birthdate.length === 10 && !isAdult(birthdate)
        ? t('auth.underage')
        : null;
  const canFinish = displayName.trim().length > 0 && birthdate.length === 10 && !birthError && accepted;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll contentClassName="gap-5">
        <View className="flex-row justify-end">
          <IconButton icon={Icons.X} label={t('common.close')} onPress={close} />
        </View>

        {currentStep !== 'finish' ? (
          <View className="gap-2">
            <Text variant="display" accessibilityRole="header">
              {intent === 'create' ? t('auth.titleCreate') : t('auth.title')}
            </Text>
            <Text tone="soft">{t('auth.body')}</Text>
          </View>
        ) : (
          <Text variant="display" accessibilityRole="header">
            {t('auth.finishTitle')}
          </Text>
        )}

        {!isSupabaseConfigured ? <Text tone="danger">{t('errors.notConfigured')}</Text> : null}

        {currentStep === 'choose' ? (
          <View className="gap-3">
            {hasApple ? (
              <Button
                label={t('auth.apple')}
                variant="ink"
                size="lg"
                icon={Icons.AppleLogo}
                loading={busy === 'apple'}
                onPress={() =>
                  attempt('apple', async () => {
                    const { givenName } = await signInWithApple();
                    if (givenName) setName(givenName);
                    track('signup_method', { method: 'apple' });
                  })
                }
              />
            ) : null}
            <Button
              label={t('auth.google')}
              variant="outline"
              size="lg"
              icon={Icons.GoogleLogo}
              loading={busy === 'google'}
              onPress={() =>
                attempt('google', async () => {
                  await signInWithGoogle();
                  track('signup_method', { method: 'google' });
                })
              }
            />
            <Button label={t('auth.email')} variant="outline" size="lg" icon={Icons.EnvelopeSimple} onPress={() => setStep('email')} />
          </View>
        ) : null}

        {currentStep === 'email' ? (
          <View className="gap-4">
            <TextField
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoFocus
              error={email.length > 3 && !EMAIL_RE.test(email.trim()) ? t('auth.invalidEmail') : null}
            />
            <Button
              label={t('common.continue')}
              size="lg"
              disabled={!EMAIL_RE.test(email.trim())}
              loading={busy === 'email'}
              onPress={() =>
                attempt('email', async () => {
                  await sendEmailCode(email);
                  setStep('code');
                })
              }
            />
          </View>
        ) : null}

        {currentStep === 'code' ? (
          <View className="gap-4">
            <Text>{t('auth.emailSent', { email: email.trim() })}</Text>
            {isDemo ? (
              <Text variant="bodyStrong" className="rounded-field bg-citron px-4 py-3 text-onCitron">
                {t('demo.code')}
              </Text>
            ) : null}
            <TextField
              label={t('auth.codePlaceholder')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
            />
            <Button
              label={t('auth.verify')}
              size="lg"
              disabled={code.length !== 6}
              loading={busy === 'code'}
              onPress={() =>
                attempt('code', async () => {
                  try {
                    await verifyEmailCode(email, code);
                    track('signup_method', { method: 'email' });
                  } catch {
                    throw new Error('invalid_code');
                  }
                })
              }
            />
            <Button label={t('auth.resend')} variant="ghost" onPress={() => attempt('resend', () => sendEmailCode(email))} />
          </View>
        ) : null}

        {currentStep === 'finish' ? (
          <View className="gap-4">
            <TextField label={t('auth.displayName')} value={displayName} onChangeText={setName} autoComplete="given-name" textContentType="givenName" maxLength={40} />
            <TextField
              label={t('auth.birthdate')}
              placeholder={t('auth.birthdatePlaceholder')}
              hint={t('auth.birthdateHint')}
              value={birthdate}
              onChangeText={(v) => setBirthdate(maskBirthdate(v))}
              keyboardType="number-pad"
              maxLength={10}
              error={birthError}
            />
            <Checkbox checked={accepted} onChange={setAccepted} label={t('auth.acceptTerms')}>
              <Text variant="caption">{t('auth.acceptTerms')}</Text>
            </Checkbox>
            <Button label={t('auth.readTerms')} variant="ghost" icon={Icons.ShieldCheck} onPress={() => router.push('/terms')} />
            <Button
              label={t('auth.finish')}
              size="lg"
              disabled={!canFinish}
              loading={busy === 'finish'}
              onPress={() =>
                attempt('finish', async () => {
                  await completeProfile({ displayName: displayName.trim(), birthdate, cityId, interestIds: interests });
                  track('signup_completed');
                  await qc.invalidateQueries({ queryKey: ['me'] });
                })
              }
            />
          </View>
        ) : null}

        {error ? (
          <Text tone="danger" accessibilityRole="alert">
            {error === t('errors.generic') && currentStep === 'code' ? t('auth.invalidCode') : error}
          </Text>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
