import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function Tab() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <Text variant="display" accessibilityRole="header">{t('tabs.groups')}</Text>
    </Screen>
  );
}
