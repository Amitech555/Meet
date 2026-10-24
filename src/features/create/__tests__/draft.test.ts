import { defaultDraft, draftFromSession, stepOfError, validateDraft } from '../draft';
import { demoSessions } from '@/features/sessions/fixtures';
import { wallParts } from '@/lib/time';

const now = new Date('2026-10-21T16:00:00Z'); // mercredi midi à Montréal

describe('brouillon de session', () => {
  it('par défaut : samedi 10 h, 8 places, gratuit, tous niveaux', () => {
    const d = defaultDraft(now);
    expect(wallParts(d.startsAt)).toMatchObject({ day: 24, hours: 10, minutes: 0 });
    expect(d).toMatchObject({ maxPlayers: 8, priceCents: 0, level: 'all' });
  });

  it('signale les champs manquants et l’étape à corriger', () => {
    const e = validateDraft(defaultDraft(now), now);
    expect(Object.keys(e).sort()).toEqual(['category', 'place', 'title']);
    expect(stepOfError(e)).toBe('what');
  });

  it('refuse un prix symbolique sous 1 $ et une capacité incohérente', () => {
    const d = { ...defaultDraft(now), categoryId: 1, title: 'Basket', venueName: 'Parc', lat: 45.5, lng: -73.5, priceCents: 50, minPlayers: 10, maxPlayers: 6 };
    const e = validateDraft(d, now);
    expect(e.price).toBe('create.errorPrice');
    expect(e.players).toBe('create.errorPlayers');
    expect(stepOfError(e)).toBe('details');
  });

  it('un brouillon complet est valide', () => {
    const d = { ...defaultDraft(now), categoryId: 1, title: 'Basket au parc', venueName: 'Parc La Fontaine', lat: 45.5, lng: -73.5 };
    expect(validateDraft(d, now)).toEqual({});
  });

  it('« refaire la même » garde l’heure murale et choisit la prochaine semaine', () => {
    const past = { ...demoSessions[0]!, starts_at: '2026-10-08T22:30:00Z', ends_at: '2026-10-09T00:00:00Z' }; // jeudi 18:30
    const d = draftFromSession(past, now);
    expect(wallParts(d.startsAt)).toMatchObject({ day: 22, hours: 18, minutes: 30 });
    expect(d.durationMin).toBe(90);
    expect(d.title).toBe(past.title);
  });
});
