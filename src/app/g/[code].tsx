import { useLocalSearchParams } from 'expo-router';
import { GroupScreen } from '@/components/group/GroupScreen';

/** Lien d'invitation unique https://partants.app/g/<code> (à coller dans WhatsApp). */
export default function GroupInvite() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <GroupScreen code={code} />;
}
