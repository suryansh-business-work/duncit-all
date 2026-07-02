/** Registration option catalogs served via the `venueRegistrationConfig`
 * query so clients never hardcode them. Superset of the lists previously
 * duplicated (and diverged) in partners-app and onboarding. */
export const VENUE_TYPES = [
  'Cafe',
  'Restaurant',
  'Sports Turf',
  'Studio',
  'Banquet',
  'Park',
  'Co-working',
  'Other',
];

export const VENUE_DOC_TYPES = [
  'GST Certificate',
  'PAN Card',
  'Property Document',
  'Trade License',
  'Other',
];

/** Bounds for the dynamic capacity list on registration. */
export const VENUE_CAPACITY_ITEM_LIMIT = 50;
