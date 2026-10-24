import {
  dayKind,
  defaultSessionStart,
  formatShortDate,
  formatStartTime,
  nextDays,
  rangeFor,
  wallParts,
  zonedWallTimeToUtc,
} from '../time';

describe('time (America/Toronto)', () => {
  it('affiche l’heure murale de Montréal à partir de l’UTC', () => {
    // 22:30 UTC en octobre (EDT, UTC-4) = 18:30 à Montréal
    expect(formatStartTime('2026-10-23T22:30:00Z', 'fr')).toBe('18:30');
    expect(formatStartTime('2026-10-23T22:30:00Z', 'en')).toMatch(/6:30\s?(PM|p\.m\.)/i);
    // En janvier (EST, UTC-5)
    expect(formatStartTime('2026-01-15T23:30:00Z', 'fr')).toBe('18:30');
  });

  it('gère le passage à l’heure normale (1er nov. 2026)', () => {
    expect(zonedWallTimeToUtc(2026, 9, 31, 10, 0)).toBe('2026-10-31T14:00:00.000Z');
    expect(zonedWallTimeToUtc(2026, 10, 1, 10, 0)).toBe('2026-11-01T15:00:00.000Z');
  });

  it('classe ce soir / demain / passé', () => {
    const now = new Date('2026-10-23T16:00:00Z'); // 12:00 à Montréal, vendredi
    expect(dayKind('2026-10-23T22:30:00Z', now)).toBe('tonight');
    expect(dayKind('2026-10-23T18:00:00Z', now)).toBe('today');
    expect(dayKind('2026-10-24T14:00:00Z', now)).toBe('tomorrow');
    expect(dayKind('2026-10-23T15:00:00Z', now)).toBe('past');
    expect(dayKind('2026-11-10T15:00:00Z', now)).toBe('later');
  });

  it('ne compte pas 23 h UTC comme « demain » à tort', () => {
    // 03:30 UTC le 24 = 23:30 le 23 à Montréal
    const now = new Date('2026-10-23T16:00:00Z');
    expect(dayKind('2026-10-24T03:30:00Z', now)).toBe('tonight');
  });

  it('calcule la fin de semaine à partir du vendredi 17 h', () => {
    const now = new Date('2026-10-21T16:00:00Z'); // mercredi
    const r = rangeFor('weekend', now);
    expect(r.from).toBe('2026-10-23T21:00:00.000Z'); // ven. 17:00 EDT
    expect(wallParts(r.to)).toMatchObject({ day: 25, hours: 23, minutes: 59 });
  });

  it('propose samedi 10 h par défaut', () => {
    const now = new Date('2026-10-21T16:00:00Z');
    expect(defaultSessionStart(now)).toBe('2026-10-24T14:00:00.000Z');
  });

  it('formate la date courte en français québécois', () => {
    expect(formatShortDate('2026-10-24T14:00:00Z', 'fr')).toMatch(/^sam\.? 24 oct\.?$/);
  });
});

describe('nextDays', () => {
  it('donne des bornes UTC de journées montréalaises', () => {
    const [first, second] = nextDays(2, new Date('2026-10-24T02:00:00Z')); // 22:00 le 23 à Montréal
    expect(first!.from).toBe('2026-10-23T04:00:00.000Z');
    expect(second!.to).toBe('2026-10-25T03:59:59.999Z');
  });
});

describe('formatDuration', () => {
  it('formate en français et en anglais', () => {
    const { formatDuration } = jest.requireActual('../time');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(90)).toBe('1 h 30');
    expect(formatDuration(90, 'en')).toBe('1h 30m');
  });
});

describe('formatMessageTime', () => {
  it('heure seule aujourd’hui, date sinon', () => {
    const { formatMessageTime } = jest.requireActual('../time');
    const now = new Date('2026-10-24T20:00:00Z');
    expect(formatMessageTime('2026-10-24T22:08:00Z', 'fr', now)).toBe('18:08');
    expect(formatMessageTime('2026-10-21T22:08:00Z', 'fr', now)).toMatch(/^mer\.? 21 oct\.? · 18:08$/);
  });
});
