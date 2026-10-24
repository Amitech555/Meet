import { geocode, searchKnownPlaces } from '../geocode';

describe('geocode (sans jeton Mapbox)', () => {
  it('trouve un lieu connu sans accents', async () => {
    expect(searchKnownPlaces('jean drapeau')[0]?.name).toBe('Parc Jean-Drapeau');
    expect((await geocode('marche atwater'))[0]?.name).toBe('Marché Atwater');
  });
  it('propose des lieux par défaut quand la recherche est vide', () => {
    expect(searchKnownPlaces('').length).toBe(5);
  });
});
