import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { cn } from '@/lib/cn';

/** Conteneur d'écran : fond, marges latérales 16–20 px, zone sûre en haut. */
export function Screen({ children, scroll, className, contentClassName, ...rest }: { children: ReactNode; scroll?: boolean; className?: string; contentClassName?: string } & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  if (scroll) {
    return (
      <ScrollView
        className={cn('flex-1 bg-bg', className)}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
        contentContainerClassName={cn('px-4 gap-6', contentClassName)}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View className={cn('flex-1 bg-bg', className)} style={{ paddingTop: insets.top + 8 }}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between">
      <Text variant="title" accessibilityRole="header" className="flex-1">
        {title}
      </Text>
      {action}
    </View>
  );
}

