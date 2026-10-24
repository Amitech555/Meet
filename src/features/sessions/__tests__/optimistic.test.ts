import { demoSessions } from '../fixtures';
import { mapSessionDeep } from '../cache';
import { optimisticJoin, optimisticLeave } from '../optimistic';

const me = { id: 'u-me', display_name: 'Moi', avatar_url: null };
const open = demoSessions[1]!; // 14/25
const full = demoSessions[3]!; // 8/8

describe('mises à jour optimistes', () => {
  it('rejoindre une session avec de la place', () => {
    const s = optimisticJoin(open, me);
    expect(s.my_status).toBe('joined');
    expect(s.joined_count).toBe(open.joined_count + 1);
    expect(s.participants_preview.at(-1)?.id).toBe('u-me');
  });
  it('session complète → liste d’attente, compteur inchangé', () => {
    const s = optimisticJoin(full, me);
    expect(s.my_status).toBe('waitlist');
    expect(s.joined_count).toBe(full.joined_count);
    expect(s.waitlist_count).toBe(1);
  });
  it('un +1 qui ne rentre pas passe en attente', () => {
    const almost = { ...open, joined_count: open.max_players - 1 };
    expect(optimisticJoin(almost, me, true).my_status).toBe('waitlist');
    expect(optimisticJoin(almost, me, false).my_status).toBe('joined');
  });
  it('idempotent si déjà inscrit', () => {
    const s = optimisticJoin(open, me);
    expect(optimisticJoin(s, me)).toBe(s);
  });
  it('se désister libère la place et retire l’avatar', () => {
    const s = optimisticLeave(optimisticJoin(open, me), 'u-me');
    expect(s.joined_count).toBe(open.joined_count);
    expect(s.participants_preview.some((p) => p.id === 'u-me')).toBe(false);
  });
  it('met à jour toutes les copies dans un cache imbriqué (pages infinies)', () => {
    const cache = { pages: [[open, full], [open]], pageParams: [null] };
    const next = mapSessionDeep(cache, open.id, (s) => optimisticJoin(s, me));
    expect(next.pages[0]![0]!.my_status).toBe('joined');
    expect(next.pages[1]![0]!.my_status).toBe('joined');
    expect(next.pages[0]![1]).toBe(full); // référence conservée si inchangé
  });
});
