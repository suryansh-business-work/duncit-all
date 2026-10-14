import { valuesToSettingsInput, valuesToStep1, venueToValues } from '@duncit/entity-consoles';
import { defineDemo } from '../types';

/**
 * The venue editor's mapping demo.
 *
 * Its own module because the mock is a whole venue record — the real shape, with
 * a real VEN- id, real INR percentages and the two cancellation ladders — and
 * burying eighty lines of it inside the console's spec demos would hide both.
 */

/** A stored venue as `venue(venue_doc_id:)` answers it. */
type VenueRecordMock = Parameters<typeof venueToValues>[0];

const VENUE: VenueRecordMock = {
  id: '66f1a2b3c4d5e6f708192a3b',
  venue_no: 'VEN-000148',
  owner_user_id: '66d0b1c2d3e4f5a6b7c8d9e0',
  step_completed: 4,
  venue_name: 'Third Wave Coffee, Indiranagar',
  venue_type: 'Cafe',
  status: 'APPROVED',
  is_active: true,
  pod_count: 23,
  capacity: 60,
  capacity_items: [
    { label: 'Ground floor', capacity: 40 },
    { label: 'Terrace', capacity: 20 },
  ],
  offers_food: true,
  food_menu: [
    {
      id: '66e0000000000000000000f1',
      name: 'Filter Coffee',
      description: 'South Indian decoction with steamed milk.',
      category: 'Beverages',
      price: 180,
      images: ['https://ik.imagekit.io/duncit/venues/menu/filter-coffee.jpg'],
      diet: 'VEG',
      spice_level: 'NONE',
      is_available: true,
    },
    {
      id: '66e0000000000000000000f2',
      name: 'Chilli Cheese Toast',
      description: '',
      category: 'Small plates',
      price: 240,
      images: [],
      diet: 'VEG',
      spice_level: 'MEDIUM',
      is_available: false,
    },
  ],
  // The GST is what the server resolved — Finance's default while the venue follows it.
  food_ordering: { enabled: true, discount_pct: 10, razorpay_linked: true, tax_override: false, tax_mode: 'INCLUSIVE', gst_pct: 5 },
  venue_category: {
    super_category_id: '66a0000000000000000000a1',
    category_id: '66a0000000000000000000b2',
    sub_category_id: '66a0000000000000000000c3',
    super_category_name: 'Social',
    category_name: 'Board Games',
    sub_category_name: 'Catan Night',
  },
  // Every category the venue hosts pods in, primary first — entry 0 is the
  // triple `venue_category` mirrors.
  venue_categories: [
    {
      super_category_id: '66a0000000000000000000a1',
      category_id: '66a0000000000000000000b2',
      sub_category_id: '66a0000000000000000000c3',
      super_category_name: 'Social',
      category_name: 'Board Games',
      sub_category_name: 'Catan Night',
    },
    {
      super_category_id: '66a0000000000000000000a1',
      category_id: '66a0000000000000000000b5',
      sub_category_id: '66a0000000000000000000c6',
      super_category_name: 'Social',
      category_name: 'Quizzes',
      sub_category_name: 'Pub Quiz',
    },
  ],
  description: 'Two-floor cafe with a covered terrace, quiet before 6pm.',
  amenities: ['Wi-Fi', 'AC', 'Seating'],
  facilities: ['Parking', 'Washroom'],
  security: ['CCTV Surveillance'],
  tags: ['premium', 'weekend-heavy'],
  cover_image_url: 'https://ik.imagekit.io/duncit/venues/third-wave-indiranagar.jpg',
  gallery: [],
  country: 'India',
  country_code: 'IN',
  state_code: 'KA',
  location_id: '66b0000000000000000000d4',
  address_line1: '100 Feet Road, Indiranagar',
  address_line2: 'Above Blue Tokai',
  city: 'Bengaluru',
  state: 'Karnataka',
  locality: 'Indiranagar',
  postal_code: '560038',
  lat: 12.9716,
  lng: 77.6412,
  owner_name: 'Rohit Menon',
  owner_email: 'rohit@thirdwave.example',
  owner_phone: '9845012345',
  owner_dob: '1989-04-17',
  owner_address: '12, 4th Cross, Indiranagar, Bengaluru',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  bank_account: {
    payout_method: 'IMPS',
    account_holder_name: 'Third Wave Coffee LLP',
    account_number: '000123456789',
    ifsc_code: 'HDFC0001234',
    upi_id: '',
  },
  venue_share_pct: 30,
  venue_commission_pct: 8,
  host_requests_limit_override: null,
  settings: {
    operating_hours: { open: '08:00', close: '23:00' },
    weekly_off_days: [1],
    holidays: ['2026-01-26'],
    rules: {
      buffer_minutes: 15,
      min_notice_minutes: 120,
      max_advance_days: 45,
      max_bookings_per_slot: 1,
      allow_instant_booking: true,
      allow_waitlist: false,
      booking_approval_required: true,
      allow_multiple_bookings: false,
    },
    auto_extend: { enabled: true, horizon_days: 30, until: '' },
    cancellation: {
      reschedule_only: false,
      tiers: [{ hours_before: 24, charge_type: 'PERCENT', value: 50 }],
      trigger_hours: 6,
      refund_tiers: [{ hours_before: 24, refund_pct: 100 }],
    },
  },
  documents: [
    {
      type: 'GST Certificate',
      url: 'https://ik.imagekit.io/duncit/venue-documents/ven-148-gst.pdf',
      uploaded_at: '2026-02-11T06:30:00.000Z',
    },
  ],
  reviewer_notes: 'Walked the terrace; matches the photos.',
  submitted_at: '2026-02-10T11:00:00.000Z',
  approved_at: '2026-02-12T09:15:00.000Z',
  rejected_at: null,
  created_at: '2026-02-09T15:20:00.000Z',
  updated_at: '2026-08-30T04:05:00.000Z',
};

const NOTE =
  'What the venue editor does with a stored record. Change venue_share_pct or an ' +
  'operating hour and watch which mutation the value belongs to: adminUpdateVenue ' +
  'takes the record, updateVenueSettings takes the hours and both cancellation ' +
  'ladders, setVenueDeductions takes the two percentages. Blank location_id to see ' +
  'the one field the schema refuses to save without. Add or remove an entry of ' +
  'venue_categories to see every category go to the server, primary first; blank one ' +
  'of its three ids and that row is left out. Change a capacity_items seat count ' +
  'and the total follows it — the scalar capacity only counts for a venue with no ' +
  'named spaces. Empty a dish id in food_menu ' +
  'to see it go back as a new dish; food_ordering is read but never sent, because ' +
  'the Razorpay account it charges is the owner’s.';

export const venueEditorMappingDemo = defineDemo<VenueRecordMock>({
  id: 'venue-editor-mapping',
  title: 'One Save, four mutations',
  note: NOTE,
  mock: VENUE,
  compute: (mock) => {
    const values = venueToValues(mock);
    const settings = valuesToSettingsInput(values);
    const step1 = valuesToStep1(values);
    const locality = values.location.locality || 'no locality';
    const window = `${settings.operating_hours.open}-${settings.operating_hours.close}`;
    return {
      'Form shows (the space)': `${values.venue_name} · ${values.venue_type} · seats ${step1.capacity}`,
      'Form shows (categories)':
        values.categories.map((row) => row.sub_name).join(', ') || 'no category row',
      'Form shows (city)': `${values.location.city}, ${values.location.state} — ${locality}`,
      'adminUpdateVenue step1 sends': Object.keys(step1).join(', '),
      'adminUpdateVenue categories':
        step1.venue_categories.length > 0
          ? `${step1.venue_categories.length} whole Super/Category/Sub triple(s), primary first`
          : 'an empty list — the server then leaves the stored categories alone',
      'adminUpdateVenue capacity':
        step1.capacity_items.length > 0
          ? `${step1.capacity} — the sum of ${step1.capacity_items.length} named space(s)`
          : `${step1.capacity} — typed, because the venue has no named spaces`,
      'adminUpdateVenue food': [
        step1.offers_food ? 'offers food' : 'does not offer food',
        `${step1.food_menu.filter((dish) => dish.id).length} dish(es) kept under their ids`,
        `${step1.food_menu.filter((dish) => !dish.id).length} new`,
        'food_ordering' in step1 ? 'food_ordering sent' : 'food_ordering never sent',
      ].join(', '),
      'updateVenueSettings sends': [
        window,
        `${settings.weekly_off_days.length} weekly off`,
        `${settings.holidays.length} holiday(s)`,
        `${settings.cancellation.tiers.length} charge band(s)`,
        `${settings.cancellation.refund_tiers.length} refund band(s)`,
      ].join(', '),
      'setVenueDeductions sends': `share ${values.venue_share_pct}% · commission ${values.venue_commission_pct}%`,
      'setVenueActive runs': 'only when the live switch actually moved (it emails the owner)',
    };
  },
});
