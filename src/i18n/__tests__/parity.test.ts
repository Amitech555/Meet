import fr from '../fr.json';
import en from '../en.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('i18n', () => {
  it('FR et EN ont exactement les mêmes clés', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('aucune chaîne vide', () => {
    for (const dict of [fr, en]) {
      const empty = keys(dict).filter((k) => {
        const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], dict);
        return typeof v !== 'string' || v.trim() === '';
      });
      expect(empty).toEqual([]);
    }
  });

  it('pas de ton publicitaire interdit', () => {
    const banned = /débloquez|propulsez|seamless|révolutionnez|!!/i;
    expect(JSON.stringify(fr)).not.toMatch(banned);
    expect(JSON.stringify(en)).not.toMatch(/unlock|supercharge|seamless|revolutioni[sz]e|!!/i);
  });
});
