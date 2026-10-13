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

/** The document types that prove a venue's GSTIN and PAN — partners upload
 * them beside the matching number, not from the general document list. */
export const VENUE_GSTIN_DOC_TYPE = 'GST Certificate';
export const VENUE_PAN_DOC_TYPE = 'PAN Card';

export const VENUE_DOC_TYPES = [
  VENUE_GSTIN_DOC_TYPE,
  VENUE_PAN_DOC_TYPE,
  'Property Document',
  'Trade License',
  'Other',
];

/** Bounds for the dynamic capacity list on registration. */
export const VENUE_CAPACITY_ITEM_LIMIT = 50;

/** The most Super → Category → Sub triples one venue may belong to. */
export const VENUE_CATEGORY_LIMIT = 10;

/** Food menu: what a dish is, how hot it is, and how much one venue may list. */
export const VENUE_FOOD_DIETS = ['VEG', 'NON_VEG', 'EGG', 'VEGAN'] as const;
export const VENUE_FOOD_SPICE_LEVELS = ['NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT'] as const;
export const VENUE_FOOD_MENU_LIMIT = 200;
export const VENUE_FOOD_IMAGE_LIMIT = 5;
/** A menu price in rupees — the ceiling keeps one order inside Razorpay's per-payment limit. */
export const VENUE_FOOD_PRICE_MAX = 100_000;
/** The most a venue may take off a QR order; the rest is always paid online. */
export const VENUE_FOOD_DISCOUNT_MAX_PCT = 90;

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
