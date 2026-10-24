import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { ActivityIcon } from '../ui/ActivityIcon';
import { tintFor } from '@design/tokens';

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Props = { seed: string; tint: string; icon: string; height?: number; iconSize?: number; rounded?: number; iconPosition?: 'left' | 'right' };

/**
 * Couverture graphique quand l'organisateur n'a pas de photo :
 * aplat de la teinte + motif géométrique (déterministe selon la session) + grand pictogramme.
 */
export const GeneratedCover = memo(function GeneratedCover({ seed, tint, icon, height = 160, iconSize, rounded = 0, iconPosition = 'left' }: Props) {
  const t = tintFor(tint);
  const h = hash(seed);
  const variant = h % 4;
  const W = 400;
  const H = 240;
  return (
    <View style={{ height, backgroundColor: t.bg, borderRadius: rounded, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect width={W} height={H} fill={t.bg} />
        {variant === 0 ? (
          <G>
            {[0, 1, 2, 3, 4].map((i) => (
              <Circle key={i} cx={W - 60} cy={H / 2} r={40 + i * 46} stroke={t.pattern} strokeWidth={14} fill="none" />
            ))}
          </G>
        ) : variant === 1 ? (
          <G>
            {Array.from({ length: 12 }).map((_, i) => (
              <Rect key={i} x={i * 48 - 120} y={-40} width={20} height={H + 80} fill={t.pattern} transform={`rotate(28 ${W / 2} ${H / 2})`} />
            ))}
          </G>
        ) : variant === 2 ? (
          <G>
            {Array.from({ length: 6 }).flatMap((_, r) =>
              Array.from({ length: 10 }).map((__, c) => (
                <Circle key={`${r}-${c}`} cx={20 + c * 42 + (r % 2) * 21} cy={20 + r * 42} r={8} fill={t.pattern} />
              )),
            )}
          </G>
        ) : (
          <G>
            <Path d={`M0 ${H} L${W * 0.45} 30 L${W * 0.8} ${H} Z`} fill={t.pattern} />
            <Path d={`M${W * 0.55} ${H} L${W * 0.85} 90 L${W + 40} ${H} Z`} fill={t.fg} opacity={0.12} />
            <Circle cx={W * 0.82} cy={56} r={26} fill={t.pattern} />
          </G>
        )}
      </Svg>
      <View style={[{ position: 'absolute', bottom: 16 }, iconPosition === 'left' ? { left: 20 } : { right: 20 }]}>
        <ActivityIcon name={icon} size={iconSize ?? Math.round(height * 0.42)} color={t.fg} />
      </View>
    </View>
  );
});
