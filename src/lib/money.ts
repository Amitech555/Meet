/** 1200 → « 12 $ » (fr-CA) / « $12 » (en-CA). Les centimes ne s'affichent que s'ils existent. */
export function formatPrice(cents: number, lang: string, currency = 'CAD'): string {
  const amount = cents / 100;
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/ /g, ' ');
}

export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(',', '.').replace(/[^\d.]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
