import { useLocalSearchParams } from 'expo-router';
import { GroupScreen } from '@/components/group/GroupScreen';

export default function GroupRoute() {
  const { id, autojoin, code } = useLocalSearchParams<{ id: string; autojoin?: string; code?: string }>();
  return <GroupScreen id={code ? undefined : id} code={code} autojoin={!!autojoin} />;
}
