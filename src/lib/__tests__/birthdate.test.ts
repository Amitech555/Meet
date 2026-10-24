import { isAdult, maskBirthdate, parseBirthdate } from '../birthdate';

describe('birthdate', () => {
  it('masque la saisie', () => {
    expect(maskBirthdate('19900315')).toBe('1990-03-15');
    expect(maskBirthdate('1990a03')).toBe('1990-03');
    expect(maskBirthdate('199')).toBe('199');
  });
  it('refuse les dates impossibles', () => {
    expect(parseBirthdate('2001-02-29')).toBeNull();
    expect(parseBirthdate('2000-02-29')).not.toBeNull();
    expect(parseBirthdate('1899-01-01')).toBeNull();
  });
  it('vérifie les 18 ans au jour près', () => {
    const now = new Date('2026-10-24T12:00:00Z');
    expect(isAdult('2008-10-24', now)).toBe(true);
    expect(isAdult('2008-10-25', now)).toBe(false);
  });
});
