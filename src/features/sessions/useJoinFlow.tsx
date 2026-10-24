import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { formatPrice } from '@/lib/money';
import { useJoinSession } from './hooks';
import type { SessionSummary } from './types';

/**
 * Parcours « Je suis partant » réutilisé partout (carte, détail, carrousel) :
 * auth différée → confirmation légère si payant → mutation optimiste.
 */
export function useJoinFlow() {
  const { t, i18n } = useTranslation();
  const requireAuth = useRequireAuth();
  const join = useJoinSession();
  const [pendingPaid, setPendingPaid] = useState<SessionSummary | null>(null);

  const requestJoin = useCallback(
    (s: SessionSummary, opts?: { guest?: boolean; skipConfirm?: boolean }) => {
      if (!requireAuth({ type: 'join', sessionId: s.id })) return;
      if (s.price_cents > 0 && !opts?.skipConfirm) {
        setPendingPaid(s);
        return;
      }
      join.mutate({ session: s, guest: opts?.guest });
    },
    [requireAuth, join],
  );

  const sheet = (
    <Sheet open={!!pendingPaid} onClose={() => setPendingPaid(null)} title={pendingPaid ? t('session.confirmPaidTitle', { price: formatPrice(pendingPaid.price_cents, i18n.language, pendingPaid.currency) }) : undefined}>
      <View className="gap-4">
        <Text tone="soft">{t('session.confirmPaidBody')}</Text>
        <Button
          label={t('common.join')}
          size="lg"
          onPress={() => {
            if (pendingPaid) join.mutate({ session: pendingPaid });
            setPendingPaid(null);
          }}
        />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setPendingPaid(null)} />
      </View>
    </Sheet>
  );

  return { requestJoin, joiningId: join.isPending ? join.variables?.session.id : undefined, sheet };
}
