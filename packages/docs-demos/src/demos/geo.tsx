import { COUNTRY_OPTIONS, findCountryByName, getStatesForCountry } from '@duncit/geo';
import { defineDemo, defineDemos } from '../types';

interface GeoMock {
  country: string;
}

export default defineDemos('geo', [
  defineDemo<GeoMock>({
    id: 'countries',
    title: 'Countries and their states, from one list',
    note:
      "Change country to 'United States' or 'United Arab Emirates' — the state list below is the same data every address form on the platform offers.",
    mock: { country: 'India' },
    compute: (mock) => {
      const found = findCountryByName(mock.country);
      const states = getStatesForCountry(mock.country);
      return {
        'Countries offered': COUNTRY_OPTIONS.length,
        'findCountryByName(country)': found ?? 'not found',
        'States in this country': states.length,
        'First ten states': states.slice(0, 10),
      };
    },
  }),
]);
