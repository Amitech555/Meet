import { dollarsToCents, formatPrice } from '../money';

describe('money', () => {
  it('formate en fr-CA et en-CA', () => {
    expect(formatPrice(1200, 'fr')).toMatch(/^12\s\$$/);
    expect(formatPrice(1250, 'fr')).toMatch(/^12,50\s\$$/);
    expect(formatPrice(1200, 'en')).toBe('$12');
  });
  it('convertit la saisie en centimes', () => {
    expect(dollarsToCents('12,50')).toBe(1250);
    expect(dollarsToCents('8')).toBe(800);
    expect(dollarsToCents('abc')).toBeNull();
  });
});
