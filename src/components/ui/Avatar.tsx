import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { categoryTints, type CategoryTint } from '@design/tokens';
import { cn } from '@/lib/cn';

const tintKeys = Object.keys(categoryTints) as CategoryTint[];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export type AvatarPerson = { id: string; display_name: string; avatar_url: string | null };

export function Avatar({ person, size = 40, ring, className }: { person: AvatarPerson; size?: number; ring?: boolean; className?: string }) {
  const tint = categoryTints[tintKeys[hash(person.id) % tintKeys.length] ?? 'sable'];
  return (
    <View
      accessibilityLabel={person.display_name}
      className={cn('items-center justify-center overflow-hidden rounded-pill', ring && 'border-2 border-bg', className)}
      style={{ width: size, height: size, backgroundColor: tint.bg }}
    >
      {person.avatar_url ? (
        <Image source={{ uri: person.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <Text tone="inherit" className="font-bold" style={{ color: tint.fg, fontSize: size * 0.38, lineHeight: size * 0.46 }} allowFontScaling={false}>
          {initials(person.display_name)}
        </Text>
      )}
    </View>
  );
}

/** Pile d'avatars qui se chevauchent + « +N ». */
export function AvatarStack({ people, total, max = 4, size = 28, className }: { people: AvatarPerson[]; total?: number; max?: number; size?: number; className?: string }) {
  const { t } = useTranslation();
  const count = total ?? people.length;
  const shown = people.slice(0, max);
  const extra = count - shown.length;
  if (count === 0) return null;
  return (
    <View className={cn('flex-row items-center', className)} accessible accessibilityLabel={t('a11y.avatars', { count })}>
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.32, zIndex: max - i }}>
          <Avatar person={p} size={size} ring />
        </View>
      ))}
      {extra > 0 ? (
        <View
          className="items-center justify-center rounded-pill border-2 border-bg bg-surfaceAlt"
          style={{ minWidth: size, height: size, paddingHorizontal: 3, marginLeft: -size * 0.32 }}
        >
          <Text tone="ink" tabular className="font-bold" style={{ fontSize: extra > 9 ? size * 0.3 : size * 0.36 }} allowFontScaling={false}>
            +{extra > 99 ? 99 : extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
