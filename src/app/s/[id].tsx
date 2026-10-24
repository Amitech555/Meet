import { Redirect, useLocalSearchParams } from 'expo-router';

/** Lien de partage universel https://partants.app/s/<id> → détail de session. */
export default function ShareLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/session/[id]', params: { id } }} />;
}
