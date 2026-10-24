import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pill } from '../ui/Pill';
import { IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Icons } from '../ui/icons';
import { useCities } from '@/features/catalog/hooks';
import { useCityId } from '@/features/sessions/hooks';
import { usePrefs } from '@/stores/prefs';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/auth/hooks';
import { track } from '@/lib/analytics';

/** En-tête du feed : ville toujours visible, cloche, recherche. */
export function DiscoverHeader() {
  const { t } = useTranslation();
  const cities = useCities();
  const cityId = useCityId();
  const setCity = usePrefs((s) => s.setCity);
  const signedIn = useAuth((s) => !!s.session);
  const unread = useMe().data?.unread_notifications ?? 0;
  const [open, setOpen] = useState(false);
  const city = cities.data?.find((c) => c.id === cityId);

  return (
    <View className="flex-row items-center justify-between px-4">
      <Pill label={city?.name ?? 'Montréal'} trailingIcon={Icons.CaretDown} onPress={() => setOpen(true)} accessibilityLabel={`${city?.name ?? 'Montréal'}, ${t('discover.changeCity')}`} />
      <View className="flex-row gap-2">
        <IconButton icon={Icons.MagnifyingGlass} label={t('discover.searchPlaceholder')} onPress={() => router.push('/search')} />
        {signedIn ? <IconButton icon={Icons.Bell} label={t('discover.notifications')} badge={unread > 0} onPress={() => router.push('/notifications')} /> : null}
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('discover.changeCity')}>
        <View className="gap-2">
          {cities.data?.map((c) => (
            <Pill
              key={c.id}
              label={c.is_active ? c.name : `${c.name} · ${t('onboarding.comingSoon')}`}
              selected={c.id === cityId}
              onPress={
                c.is_active
                  ? () => {
                      setCity(c.id);
                      track('city_selected', { city_id: c.id });
                      setOpen(false);
                    }
                  : undefined
              }
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}
