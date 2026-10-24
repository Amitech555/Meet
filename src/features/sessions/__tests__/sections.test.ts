import { demoSessions } from '../fixtures';
import { deriveSections } from '../sections';
import type { Category } from '../types';

const cats = [
  { id: 1, parent_id: null },
  { id: 2, parent_id: 1 }, // basket → sport collectif
  { id: 7, parent_id: null },
] as Category[];

describe('sections du feed', () => {
  it('« Se remplit vite » = 1 à 3 places restantes, jamais complet', () => {
    const { fillingFast } = deriveSections(demoSessions, [], cats);
    expect(fillingFast.map((s) => s.id)).toEqual(['s-basket-lafontaine', 's-jeux-griffintown']);
  });
  it('« Pour toi » inclut les sous-catégories d’un intérêt', () => {
    const { forYou } = deriveSections(demoSessions, [1], cats);
    expect(forYou.map((s) => s.id)).toEqual(['s-basket-lafontaine']);
  });
  it('n’affiche pas une session où je suis déjà inscrit', () => {
    const rows = demoSessions.map((s) => (s.id === 's-basket-lafontaine' ? { ...s, my_status: 'joined' as const } : s));
    expect(deriveSections(rows, [1], cats).fillingFast.map((s) => s.id)).not.toContain('s-basket-lafontaine');
  });
});
