import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { cn } from '@/lib/cn';

export type Bar = { key: string; label: string; value: number | null; a11y: string };

/**
 * Histogramme à une seule série (pas de légende : le titre la nomme).
 * Barres fines à l'encre (lisibles en clair et en sombre), extrémité arrondie 4 px ancrée à la base,
 * espace de 2 px entre barres, axe discret, étiquette directe seulement sur la dernière valeur.
 * Toucher une barre affiche sa valeur ; chaque barre a un libellé pour les lecteurs d'écran.
 */
export function BarChart({ title, bars, max, unit = '', height = 120 }: { title: string; bars: Bar[]; max?: number; unit?: string; height?: number }) {
  const [active, setActive] = useState<string | null>(null);
  const top = Math.max(1, max ?? Math.max(...bars.map((b) => b.value ?? 0)));
  const last = bars.at(-1);
  const shown = bars.find((b) => b.key === active) ?? last;
  return (
    <View className="gap-3 rounded-card border border-line bg-surface p-4">
      <View className="flex-row items-baseline justify-between">
        <Text variant="heading">{title}</Text>
        {shown && shown.value != null ? (
          <Text variant="title" tabular accessibilityLiveRegion="polite">
            {`${shown.value}${unit}`}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-end gap-0.5 border-b border-line" style={{ height }}>
        {bars.map((b) => {
          const h = b.value == null ? 0 : Math.max(2, (b.value / top) * (height - 4));
          const isActive = b.key === (shown?.key ?? '');
          return (
            <Pressable
              key={b.key}
              accessibilityRole="button"
              accessibilityLabel={b.a11y}
              onPress={() => setActive(b.key)}
              className="h-full flex-1 items-center justify-end"
              hitSlop={4}
            >
              <View className={cn('w-full max-w-[28px] rounded-t-[4px] bg-ink', !isActive && 'opacity-60')} style={{ height: h }} />
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between">
        <Text variant="caption" tone="soft" className="text-xs">
          {bars[0]?.label ?? ''}
        </Text>
        <Text variant="caption" tone="soft" className="text-xs">
          {shown?.label ?? ''}
        </Text>
      </View>
    </View>
  );
}
