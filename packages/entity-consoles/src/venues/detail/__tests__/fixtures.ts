import type { AdminVenueDetail, VenueSettings } from '../queries';

/** A fully-filed venue, as the AdminVenueDetail query returns it. Every card
 * test starts from this and blanks only the fields its branch is about. */
export const venueSettings = (over: Partial<VenueSettings> = {}): VenueSettings => ({
  operating_hours: { open: '09:00', close: '22:00' },
  weekly_off_days: [3, 1],
  holidays: ['2026-10-02T00:00:00.000Z'],
  rules: {
    buffer_minutes: 15,
    min_notice_minutes: 120,
    max_advance_days: 30,
    max_bookings_per_slot: 2,
    allow_instant_booking: true,
    allow_waitlist: false,
    booking_approval_required: true,
    allow_multiple_bookings: false,
  },
  auto_extend: { enabled: true, template_id: 'tpl-1', horizon_days: 14, until: '2026-12-31T00:00:00.000Z' },
  cancellation: {
    reschedule_only: false,
    tiers: [
      { hours_before: 24, charge_type: 'PERCENT', value: 50 },
      { hours_before: 6, charge_type: 'AMOUNT', value: 1500 },
    ],
    trigger_hours: 48,
    refund_tiers: [{ hours_before: 24, refund_pct: 50 }],
  },
  ...over,
});

export const makeVenue = (over: Partial<AdminVenueDetail> = {}): AdminVenueDetail => ({
  id: 'venue-1',
  venue_no: 'DUN-VEN-2210',
  owner_user_id: 'user-9',
  step_completed: 6,
  venue_name: 'The Board Room Cafe',
  venue_type: 'Cafe',
  status: 'APPROVED',
  is_active: true,
  pod_count: 18,
  capacity: 40,
  capacity_items: [
    { label: 'Terrace', capacity: 24 },
    { label: 'Loft', capacity: 16 },
  ],
  offers_food: false,
  food_menu: [],
  food_ordering: {
    enabled: false,
    discount_pct: 0,
    razorpay_linked: false,
    tax_override: false,
    tax_mode: 'INCLUSIVE',
    gst_pct: 5,
  },
  venue_category: {
    super_category_id: 'sc-1',
    category_id: 'c-1',
    sub_category_id: 's-1',
    super_category_name: 'For You',
    category_name: 'Games',
    sub_category_name: 'Board Games',
  },
  // Primary first — entry 0 is the same triple `venue_category` mirrors.
  venue_categories: [
    {
      super_category_id: 'sc-1',
      category_id: 'c-1',
      sub_category_id: 's-1',
      super_category_name: 'For You',
      category_name: 'Games',
      sub_category_name: 'Board Games',
    },
    {
      super_category_id: 'sc-1',
      category_id: 'c-2',
      sub_category_id: 's-2',
      super_category_name: 'For You',
      category_name: 'Quizzes',
      sub_category_name: 'Pub Quiz',
    },
  ],
  description: 'Two floors of board games in Indiranagar.',
  amenities: ['Wi-Fi'],
  facilities: ['Parking'],
  security: ['CCTV'],
  tags: ['cozy'],
  cover_image_url: 'https://ik.imagekit.io/duncit/venue-1.jpg',
  gallery: ['https://ik.imagekit.io/duncit/venue-1-a.jpg'],
  country: 'India',
  country_code: 'IN',
  state_code: 'KA',
  location_id: 'loc-1',
  address_line1: '12 100 Feet Road',
  address_line2: 'HAL 2nd Stage',
  city: 'Bengaluru',
  state: 'Karnataka',
  locality: 'Indiranagar',
  postal_code: '560038',
  lat: 12.9716,
  lng: 77.6412,
  owner_name: 'Asha Rao',
  owner_email: 'asha@duncit.com',
  owner_phone: '+919876543210',
  owner_dob: '1990-05-14T00:00:00.000Z',
  owner_address: '44 Residency Road, Bengaluru',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  bank_account: {
    payout_method: 'BANK',
    account_holder_name: 'Asha Rao',
    account_number: '001122334455',
    ifsc_code: 'HDFC0000123',
    upi_id: 'asha@okhdfc',
  },
  venue_share_pct: 70,
  venue_commission_pct: 12,
  host_requests_limit_override: null,
  settings: venueSettings(),
  documents: [
    { type: 'GST Certificate', url: 'https://ik.imagekit.io/duncit/gst.pdf', uploaded_at: '2026-03-04T10:15:00.000Z' },
  ],
  reviewer_notes: 'Checked the lease.',
  submitted_at: '2026-03-01T09:00:00.000Z',
  approved_at: '2026-03-05T11:30:00.000Z',
  rejected_at: null,
  created_at: '2026-02-20T08:00:00.000Z',
  updated_at: '2026-03-06T12:00:00.000Z',
  ...over,
});

/** A venue as the server sends it — every object carries its typename, which is
 * what `MockedProvider` (default `addTypename`) needs to write it to the cache. */
export const venuePayload = (venue: AdminVenueDetail) => {
  const { settings } = venue;
  return {
    ...venue,
    __typename: 'Venue',
    capacity_items: venue.capacity_items.map((item) => ({ ...item, __typename: 'VenueCapacityItem' })),
    food_menu: venue.food_menu.map((item) => ({ ...item, __typename: 'VenueFoodItem' })),
    food_ordering: { ...venue.food_ordering, __typename: 'VenueFoodOrdering' },
    venue_category: { ...venue.venue_category, __typename: 'VenueCategory' },
    venue_categories: venue.venue_categories.map((entry) => ({ ...entry, __typename: 'VenueCategory' })),
    bank_account: { ...venue.bank_account, __typename: 'VenueBankAccount' },
    settings: {
      ...settings,
      __typename: 'VenueSettings',
      operating_hours: { ...settings.operating_hours, __typename: 'VenueOperatingHours' },
      rules: { ...settings.rules, __typename: 'VenueRules' },
      auto_extend: { ...settings.auto_extend, __typename: 'VenueAutoExtend' },
      cancellation: {
        ...settings.cancellation,
        __typename: 'VenueCancellation',
        tiers: settings.cancellation.tiers.map((tier) => ({ ...tier, __typename: 'VenueCancellationTier' })),
        refund_tiers: settings.cancellation.refund_tiers.map((tier) => ({ ...tier, __typename: 'VenueRefundTier' })),
      },
    },
    documents: venue.documents?.map((doc) => ({ ...doc, __typename: 'VenueDocument' })) ?? null,
  };
};

/** A GraphQL-shaped nullable read of a field the TS type marks as present —
 * what the cards defend against when an older record lacks it. */
export const missing = <T>() => null as unknown as T;
