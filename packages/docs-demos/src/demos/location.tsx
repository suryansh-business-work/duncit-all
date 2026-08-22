import {
  EMPTY_LOCATION,
  buildLocationValue,
  buildMapQuery,
  cityOptions,
  cityPincode,
  mapEmbedUrl,
  mapSearchUrl,
  stateOptions,
  type LocationDoc,
} from '@duncit/location';
import { defineDemo, defineDemos } from '../types';

interface LocationMock {
  /** Admin > Locations, as the picker receives it. */
  locations: LocationDoc[];
  selected_id: string;
  locality: string;
  /** A venue address, for the map below. */
  address: string[];
}

export default defineDemos('location', [
  defineDemo<LocationMock>({
    id: 'picker',
    title: 'Country → state → city → locality, from one list',
    note:
      "Change selected_id to the Mumbai row and the locality options change with it. Clear it and buildLocationValue returns EMPTY_LOCATION rather than a half-filled object.",
    mock: {
      locations: [
        {
          id: '66a1f0c2e4b1a2d3c4e5f601',
          location_name: 'Bengaluru',
          country: 'India',
          country_code: 'IN',
          state: 'Karnataka',
          state_code: 'KA',
          city: 'Bengaluru',
          location_pincode: '560102',
          location_zones: [{ zone_name: 'HSR Layout' }, { zone_name: 'Koramangala' }],
          is_active: true,
        },
        {
          id: '66a1f0c2e4b1a2d3c4e5f602',
          location_name: 'Mumbai',
          country: 'India',
          country_code: 'IN',
          state: 'Maharashtra',
          state_code: 'MH',
          city: 'Mumbai',
          location_pincode: '400050',
          location_zones: [{ zone_name: 'Bandra West' }, { zone_name: 'Andheri' }],
          is_active: true,
        },
      ],
      selected_id: '66a1f0c2e4b1a2d3c4e5f601',
      locality: 'HSR Layout',
      address: ['Play Arena', 'HSR Layout', 'Bengaluru', '560102'],
    },
    compute: (mock) => {
      const query = buildMapQuery(mock.address);
      return {
        'States offered': stateOptions(mock.locations, 'India').map((option) => option.label),
        'Cities in Karnataka': cityOptions(mock.locations, 'India', 'Karnataka').map(
          (option) => option.label
        ),
        'The value the form stores': buildLocationValue(
          mock.locations,
          mock.selected_id,
          mock.locality
        ),
        'Pincode of the selected city': cityPincode(mock.locations, mock.selected_id),
        'An unknown id': buildLocationValue(mock.locations, 'nope'),
        'EMPTY_LOCATION': EMPTY_LOCATION,
        'Map query': query,
        'Keyless embed URL': mapEmbedUrl(query),
        'Open in Google Maps': mapSearchUrl(query),
      };
    },
  }),
]);
