import { categoryTints, themes } from '../tokens';

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('contrastes AA', () => {
  it.each(Object.entries(categoryTints))('teinte %s : texte lisible (≥ 4.5)', (_k, t) => {
    expect(contrast(t.bg, t.fg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['light', 'dark'] as const)('thème %s : encre et texte secondaire sur fond', (s) => {
    const th = themes[s];
    expect(contrast(th.ink, th.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(th.inkSoft, th.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(th.inkSoft, th.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(th.onCitron, th.citron)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(th.onNight, th.night)).toBeGreaterThanOrEqual(4.5);
  });

  it('bouton Signal : texte encre AA (≥ 4.5) — le blanc ne passe pas à 16 px', () => {
    expect(contrast(themes.light.signal, themes.light.onSignal)).toBeGreaterThanOrEqual(4.5);
  });
});
