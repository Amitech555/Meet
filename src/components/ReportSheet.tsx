import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from './ui/Sheet';
import { Pill } from './ui/Pill';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';
import { Button } from './ui/Button';
import { report, type ReportReason, type ReportTarget } from '@/features/safety/api';
import { useUserId } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';

const reasons: ReportReason[] = ['spam', 'harassment', 'unsafe', 'fake', 'dating', 'other'];

/** Signalement (utilisateur, session, groupe, message) — chaque signalement est revu par l'équipe. */
export function ReportSheet({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: ReportTarget; targetId: string }) {
  const { t } = useTranslation();
  const uid = useUserId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!uid || !reason) return;
    setBusy(true);
    try {
      await report(uid, targetType, targetId, reason, details);
      toast(t('report.thanks'));
      setReason(null);
      setDetails('');
      onClose();
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('report.title')}>
      <View className="gap-4">
        <Text tone="soft">{t('report.body')}</Text>
        <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
          {reasons.map((r) => (
            <Pill key={r} label={t(`report.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
        <TextField label={t('report.details')} value={details} onChangeText={setDetails} multiline maxLength={1000} />
        <Button label={t('report.submit')} variant="danger" disabled={!reason} loading={busy} onPress={submit} />
      </View>
    </Sheet>
  );
}
