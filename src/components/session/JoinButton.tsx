import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { Icons } from '../ui/icons';
import type { ParticipantStatus } from '@/features/sessions/types';
import { haptics } from '@/lib/haptics';

export type JoinState = 'available' | 'full' | 'joined' | 'waitlisted' | 'closed' | 'hosting';

export function joinStateFor(myStatus: ParticipantStatus | null, spotsLeft: number, open: boolean, isHost: boolean): JoinState {
  if (isHost) return 'hosting';
  if (myStatus === 'joined') return 'joined';
  if (myStatus === 'waitlist') return 'waitlisted';
  if (!open) return 'closed';
  return spotsLeft > 0 ? 'available' : 'full';
}

/**
 * « Je suis partant » → « Tu y es ✓ ». Le parent fait la mise à jour optimiste ;
 * ici on gère le retour haptique et les confettis (non bloquants).
 */
export function JoinButton({
  state,
  onJoin,
  onManage,
  size = 'md',
  loading,
  fullWidth,
}: {
  state: JoinState;
  onJoin: () => void;
  onManage?: () => void;
  size?: 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const { t } = useTranslation();
  const [burst, setBurst] = useState(0);
  const common = { size, loading, fullWidth, haptic: false } as const;

  switch (state) {
    case 'available':
      return (
        <View>
          <Button
            {...common}
            label={t('common.join')}
            onPress={() => {
              haptics.success();
              setBurst((b) => b + 1);
              onJoin();
            }}
          />
          <Confetti fire={burst} />
        </View>
      );
    case 'full':
      return <Button {...common} variant="ink" label={t('common.waitlist')} onPress={() => (haptics.light(), onJoin())} />;
    case 'joined':
      return (
        <View>
          <Button {...common} variant="citron" icon={Icons.Check} label={t('common.joined')} onPress={() => (haptics.tap(), onManage?.())} />
          <Confetti fire={burst} />
        </View>
      );
    case 'waitlisted':
      return <Button {...common} variant="outline" icon={Icons.Clock} label={t('common.onWaitlist')} onPress={() => (haptics.tap(), onManage?.())} />;
    case 'hosting':
      return <Button {...common} variant="outline" label={t('session.manage')} onPress={() => (haptics.tap(), onManage?.())} />;
    case 'closed':
      return <Button {...common} variant="outline" label={t('common.full')} disabled />;
  }
}
