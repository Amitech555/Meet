/** Saisie « AAAA-MM-JJ » : n'accepte que des chiffres et insère les tirets. */
export function maskBirthdate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

/** Date calendaire valide (pas de 31 février). */
export function parseBirthdate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  if (y < 1900) return null;
  return date;
}

/** Pré-contrôle côté client ; la vérification qui compte est faite par complete_profile() en SQL. */
export function isAdult(value: string, now: Date = new Date()): boolean {
  const b = parseBirthdate(value);
  if (!b) return false;
  const limit = Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate());
  return b.getTime() <= limit;
}
