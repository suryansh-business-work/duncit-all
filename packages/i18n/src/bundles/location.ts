import type { NestedCatalogue } from '../catalogue';

/**
 * The shared location picker and map card — a namespace of its own, not a
 * surface's.
 *
 * @duncit/location renders in mWeb and in the portals (via the shell), so its
 * strings belong to neither bundle: a copy in each would be two hand-kept
 * copies of the same four words, which is the drift rule 40 exists to stop.
 */
export const LOCATION_BUNDLE: NestedCatalogue = {
  location: {
    /** The strict Country → State → City → Locality cascade. A form may still
     * override a level's label; these are what it shows when it does not. */
    select: {
      country: 'Country',
      state: 'State',
      city: 'City',
      locality: 'Locality',
    },
    /** The read-only Google Maps embed card. */
    map: {
      title: 'Map preview',
      openInMaps: 'Open in Maps',
      keyMissing: 'Add VITE_GOOGLE_MAP_API to preview the map here.',
    },
  },
};
