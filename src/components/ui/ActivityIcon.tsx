import type { IconProps } from 'phosphor-react-native';
import { activityIcons } from './icons';

/** Pictogramme d'activité à partir de la clé `categories.icon`. */
export function ActivityIcon({ name, ...props }: { name: string | null | undefined } & IconProps) {
  const Cmp = activityIcons[(name ?? 'other') as keyof typeof activityIcons] ?? activityIcons.other;
  return <Cmp weight="bold" {...props} />;
}
