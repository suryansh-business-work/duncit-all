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

/** Comfort features guests get inside the venue. */
export const VENUE_AMENITIES = [
  'AC',
  'Wi-Fi',
  'Seating',
  'Washroom',
  'Changing Room',
  'Drinking Water',
  'Food Available',
  'Kitchen Access',
  'Music System',
  'Projector',
  'Stage',
  'Lighting',
  'Power Backup',
];

/** Infrastructure the venue premises offer. */
export const VENUE_FACILITIES = [
  'Parking',
  'Valet Parking',
  'Wheelchair Access',
  'Elevator',
  'Green Room',
  'Storage Space',
  'Outdoor Area',
  'Smoking Zone',
  'Charging Points',
  'Waiting Lounge',
];

/** Safety & security measures at the venue. */
export const VENUE_SECURITY = [
  'CCTV Surveillance',
  'Security Guard',
  'Fire Extinguisher',
  'First Aid Kit',
  'Emergency Exit',
  'Gated Entry',
  'Visitor Log',
  'Women Safety Trained Staff',
];
