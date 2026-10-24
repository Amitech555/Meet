import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { Icons, type Icon } from '../ui/icons';
import { useTheme } from '@/design/theme';
import { elevation } from '@design/tokens';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { useRequireAuth } from '@/features/auth/useRequireAuth';

const tabIcons: Record<string, Icon> = {
  index: Icons.Compass,
  sessions: Icons.CalendarBlank,
  groups: Icons.UsersThree,
  profile: Icons.UserCircle,
};

const tabLabels: Record<string, 'tabs.discover' | 'tabs.mySessions' | 'tabs.groups' | 'tabs.profile'> = {
  index: 'tabs.discover',
  sessions: 'tabs.mySessions',
  groups: 'tabs.groups',
  profile: 'tabs.profile',
};

/** Barre d'onglets : Découvrir · Mes sessions · [+] · Groupes · Profil */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const requireAuth = useRequireAuth();

  const renderTab = (index: number) => {
    const route = state.routes[index];
    if (!route) return null;
    const focused = state.index === index;
    const I = tabIcons[route.name] ?? Icons.Compass;
    const label = t(tabLabels[route.name] ?? 'tabs.discover');
    return (
      <PressableScale
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => {
          haptics.tap();
          if (!focused) navigateToTab(route.key);
        }}
        className="min-h-tap flex-1 items-center justify-center gap-1 py-2"
      >
        <I size={24} weight={focused ? 'fill' : 'bold'} color={focused ? colors.ink : colors.inkSoft} />
        <Text variant="caption" tone={focused ? 'ink' : 'soft'} className={cn('text-xs', focused ? 'font-bold' : 'font-medium')} numberOfLines={1}>
          {label}
        </Text>
      </PressableScale>
    );
  };

  return (
    <View className="flex-row items-end border-t border-line bg-surface" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      {renderTab(0)}
      {renderTab(1)}
      <View className="w-[68px] items-center">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('tabs.create')}
          onPress={() => {
            haptics.medium();
            if (requireAuth({ type: 'create' })) router.push('/create');
          }}
          className="-mt-6 h-16 w-16 items-center justify-center rounded-pill border-4 border-bg bg-signal"
          style={elevation.raised}
        >
          <Icons.Plus size={28} weight="bold" color={colors.onSignal} />
        </PressableScale>
      </View>
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}
