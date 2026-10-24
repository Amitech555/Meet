import { buildIcs } from '../ics';

describe('ics', () => {
  it('produit un événement UTC valide avec rappel 2 h', () => {
    const ics = buildIcs({
      uid: 's1',
      title: 'Basket; 3 contre 3, parc',
      startsAt: '2026-10-24T22:30:00Z',
      endsAt: '2026-10-25T00:00:00Z',
      location: 'Parc La Fontaine',
    });
    expect(ics).toContain('DTSTART:20261024T223000Z');
    expect(ics).toContain('DTEND:20261025T000000Z');
    expect(ics).toContain(String.raw`SUMMARY:Basket\; 3 contre 3\, parc`);
    expect(ics).toContain('TRIGGER:-PT2H');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
