import '../../global.css';
import '@/design/interop';
import i18n from '@/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useColorScheme } from 'nativewind';
// Une graisse = un import : le paquet complet embarquerait les 36 fichiers de police
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { ThemeProvider, useTheme } from '@/design/theme';
import { ToastHost } from '@/components/ui/Toast';
import { PushPrompt } from '@/components/PushPrompt';
import { DemoFrame } from '@/components/DemoBar';
import { usePushRouting } from '@/features/notifications/hooks';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { useAuthListener } from '@/features/auth/useAuthListener';
import { usePrefs } from '@/stores/prefs';
import { initMonitoring } from '@/lib/monitoring';
import { track } from '@/lib/analytics';

initMonitoring();
track('app_opened');

void SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from '@/components/AppErrorBoundary';

function Navigator() {
  const { scheme, colors } = useTheme();
  useAuthListener();
  usePushRouting();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        <Stack.Screen name="styleguide" />
      </Stack>
      <ToastHost />
      <PushPrompt />
    </>
  );
}

/** Applique la préférence d'apparence (système / clair / sombre) mémorisée. */
function useThemePreference() {
  const pref = usePrefs((s) => s.theme);
  const locale = usePrefs((s) => s.locale);
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme(pref);
  }, [pref, setColorScheme]);
  useEffect(() => {
    if (locale && i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [locale]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  useThemePreference();

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ThemeProvider>
            <DemoFrame>
              <Navigator />
            </DemoFrame>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
