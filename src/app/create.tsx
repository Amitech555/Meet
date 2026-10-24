import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTranslation } from 'react-i18next';

export default function Create() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <Text variant="display">{t('create.title')}</Text>
    </Screen>
  );
}
