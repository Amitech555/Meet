import { AppError, errorMessage, toAppError } from '../errors';

const t = ((k: string) => k) as never;

describe('errors', () => {
  it('reconnaît les codes SQL connus', () => {
    expect(toAppError({ message: 'session_started' }).code).toBe('session_started');
    expect(errorMessage({ message: 'terms_required' }, t)).toBe('errors.termsRequired');
  });
  it('détecte le hors-ligne', () => {
    expect(toAppError(new TypeError('Network request failed')).code).toBe('offline');
    expect(errorMessage(new TypeError('Failed to fetch'), t)).toBe('errors.offline');
  });
  it('replie sur un message générique', () => {
    expect(errorMessage(new Error('boom'), t)).toBe('errors.generic');
    expect(toAppError(new AppError('blocked')).code).toBe('blocked');
  });
});
