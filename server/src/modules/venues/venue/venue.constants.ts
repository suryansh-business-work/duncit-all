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
/**
 * A GSTIN: 15 characters with the literal `Z` at position 14. The mirror of
 * GSTIN in @duncit/regex, restated because server/src imports no @duncit/*
 * package — the client rule shapes the form, this one is what is enforced.
 */
export const VENUE_GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

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
/** Videos (an uploaded clip or a YouTube link) one dish may carry. */
export const VENUE_FOOD_VIDEO_LIMIT = 2;
/** Videos (an uploaded clip or a YouTube link) on the venue's own page. */
export const VENUE_VIDEO_LIMIT = 5;
/**
 * How a dish's saving against its struck-through MRP reads: "20% off" or
 * "₹40 off". Display only — the dish's `price` is what is charged.
 */
export const VENUE_FOOD_SAVING_DISPLAYS = ['PERCENT', 'AMOUNT'] as const;
/** The tables a cafe may print per-table QR stickers for. */
export const VENUE_FOOD_TABLE_LIMIT = 200;
/** A table's label — the same cap as the table a guest types at checkout. */
export const VENUE_FOOD_TABLE_LABEL_MAX = 20;
/** A licence number field (liquor licences have no national format). */
export const VENUE_FOOD_LICENCE_NUMBER_MAX = 40;
/**
 * How GST meets a food price. INCLUSIVE: the menu price already holds the tax,
 * so the bill is unchanged and the tax is carved out of it. EXCLUSIVE: the tax
 * is added on top of the discounted price.
 */
export const VENUE_FOOD_TAX_MODES = ['INCLUSIVE', 'EXCLUSIVE'] as const;
/** Whole-number GST percent on food; 28 is the highest GST slab. */
export const VENUE_FOOD_GST_PCT_MAX = 28;
/** What Finance starts with: GST added on top of the menu price, at 5%. */
export const VENUE_FOOD_TAX_DEFAULTS = { tax_mode: 'EXCLUSIVE', gst_pct: 5 } as const;

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
