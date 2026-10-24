import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/nav/TabBar';
import { usePrefs } from '@/stores/prefs';
import { usePrefsHydrated } from '@/lib/useHydrated';

export default function TabsLayout() {
  const hydrated = usePrefsHydrated();
  const onboarded = usePrefs((s) => s.onboarded);
  if (!hydrated) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sessions" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
