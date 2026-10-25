import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Text } from './ui/Text';
import { Pill } from './ui/Pill';
import { Sheet } from './ui/Sheet';
import { Icons } from './ui/icons';
import { demoPersonas, demoSignInAs } from '@/lib/demo/client';
import { useUserId } from '@/stores/auth';
import { isDemo } from '@/lib/env';

/**
 * Bandeau du mode démo (aperçu web) : rappelle que les données sont fictives et permet de voir
 * l'app avec différents profils. Il occupe la zone sûre du haut ; les écrans en dessous reçoivent un inset de 0.
 */
export function DemoFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const uid = useUserId();
  const [open, setOpen] = useState(false);
  if (!isDemo) return <>{children}</>;
  const current = demoPersonas.find((p) => p.id === uid)?.label.split(' · ')[0] ?? (uid ? t('common.you') : demoPersonas[0].label);
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between gap-2 bg-ink px-4 pb-2" style={{ paddingTop: insets.top + 6 }}>
        <Text variant="caption" tone="inherit" className="flex-1 font-semibold text-bg" numberOfLines={1}>
          {t('demo.bar')}
        </Text>
        <Pill size="sm" icon={Icons.UserCircle} trailingIcon={Icons.CaretDown} label={`${t('demo.as')} : ${current}`} onPress={() => setOpen(true)} />
      </View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>{children}</SafeAreaInsetsContext.Provider>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('demo.choose')}>
        <View className="gap-2">
          {demoPersonas.map((p) => (
            <Pill
              key={p.label}
              label={p.label}
              selected={(p.id ?? null) === uid}
              onPress={() => {
                demoSignInAs(p.id);
                qc.clear();
                setOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}
