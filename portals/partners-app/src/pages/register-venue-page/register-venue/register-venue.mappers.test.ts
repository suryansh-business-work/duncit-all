import { describe, expect, it } from 'vitest';
import {
  toApprovedUpdateInput,
  toFoodInput,
  toSetupAmenitiesInput,
  toSetupFoodInput,
  toSetupInput,
  toSetupTypeCapacityInput,
  toStep1Input,
  toStep2Input,
  toStep3Input,
  venueToValues,
} from './register-venue.mappers';
import { blankRegisterVenueValues, type RegisterVenueValues } from './register-venue.types';

const account = { name: 'Asha Rao', email: 'asha@duncit.com' };

/** An admin Location doc as the MyVenue query returns it. */
const bengaluru = {
  id: 'loc-blr',
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  location_name: 'Bengaluru',
  location_pincode: '560001',
  location_zones: [
    { zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
    { zone_name: 'Koramangala', zone_code: 'KOR', pincode: '560034' },
  ],
};

/** A Location saved before cities carried their own name — only location_name is set. */
const goa = {
  id: 'loc-goa',
  country: 'India',
  country_code: 'IN',
  state: 'Goa',
  state_code: 'GA',
  city: '',
  location_name: 'Panaji',
  location_pincode: '403001',
  location_zones: [],
};

describe('venueToValues — a brand-new registration', () => {
  it('starts blank with the owner taken from the signed-in account', () => {
    expect(venueToValues(null, [bengaluru], account)).toEqual({
      ...blankRegisterVenueValues,
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
    });
  });
});

describe('venueToValues — a stored venue', () => {
  it('fills every missing field with its blank default', () => {
    const values = venueToValues({ id: 'v1' }, [], account);

    expect(values).toEqual({
      ...blankRegisterVenueValues,
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
    });
  });

  it('prefers the stored owner name, and the stored owner email only when the account has none', () => {
    const venue = { id: 'v1', owner_name: 'Stored Owner', owner_email: 'stored@duncit.com' };

    expect(venueToValues(venue, [], account)).toMatchObject({
      owner_name: 'Stored Owner',
      owner_email: 'asha@duncit.com',
    });
    expect(venueToValues(venue, [], { name: 'Asha Rao', email: '' }).owner_email).toBe('stored@duncit.com');
  });

  it('reads the payout method back from the stored bank account', () => {
    const values = venueToValues(
      {
        id: 'v1',
        bank_account: {
          payout_method: 'NEFT',
          account_holder_name: 'Asha Rao',
          account_number: '123456789',
          ifsc_code: 'HDFC0001234',
          upi_id: null,
        },
      },
      [],
      account
    );

    expect(values).toMatchObject({
      payout_method: 'NEFT',
      account_holder_name: 'Asha Rao',
      account_number: '123456789',
      ifsc_code: 'HDFC0001234',
      upi_id: '',
    });
  });

  it('keeps the stored gallery, tax ids and trims the date of birth to a day', () => {
    const values = venueToValues(
      {
        id: 'v1',
        cover_image_url: 'https://cdn.duncit.com/cover.jpg',
        gallery: ['https://cdn.duncit.com/1.jpg'],
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        owner_dob: '1991-02-03T00:00:00.000Z',
        documents: [{ type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf', extra: 'ignored' }],
      },
      [],
      account
    );

    expect(values).toMatchObject({
      cover_image_url: 'https://cdn.duncit.com/cover.jpg',
      gallery: ['https://cdn.duncit.com/1.jpg'],
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      has_gstin: true,
      has_pan: true,
      owner_dob: '1991-02-03',
      documents: [{ type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf' }],
    });
  });
});

describe('venueToValues — lining the location pickers up with the admin locations', () => {
  it('matches by location id and takes the zone pincode for a known locality name', () => {
    const values = venueToValues(
      { id: 'v1', location_id: 'loc-blr', city: 'Old name', locality: 'Indiranagar', postal_code: '000000' },
      [goa, bengaluru],
      account
    );

    expect(values).toMatchObject({
      location_id: 'loc-blr',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      state_code: 'KA',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      postal_code: '560038',
    });
  });

  it('matches a stored zone code to its zone name', () => {
    const values = venueToValues({ id: 'v1', location_id: 'loc-blr', locality: 'KOR' }, [bengaluru], account);

    expect(values.locality).toBe('Koramangala');
    expect(values.postal_code).toBe('560034');
  });

  it('falls back to the city pincode when the locality is not one of its zones', () => {
    const values = venueToValues({ id: 'v1', location_id: 'loc-blr', locality: 'Whitefield' }, [bengaluru], account);

    expect(values.locality).toBe('Whitefield');
    expect(values.postal_code).toBe('560001');
  });

  it('finds a legacy venue with no location id by its city, state and country code', () => {
    // A location saved with no name at all can never be the venue's city.
    const nameless = { id: 'loc-x', country_code: 'IN', state: 'Karnataka' };
    const values = venueToValues(
      { id: 'v1', city: 'Bengaluru', state: 'Karnataka', country_code: 'IN', locality: 'Indiranagar' },
      [nameless, goa, bengaluru],
      account
    );

    expect(values.location_id).toBe('loc-blr');
    expect(values.postal_code).toBe('560038');
  });

  it('matches on the city when no state was stored', () => {
    // A blank stored country code reads as IN, so the city (and IN) decide.
    const values = venueToValues({ id: 'v1', city: 'Bengaluru', country_code: '' }, [bengaluru], account);

    expect(values.location_id).toBe('loc-blr');
    expect(values.state).toBe('Karnataka');
  });

  it('does not match a city in a different state', () => {
    const values = venueToValues(
      { id: 'v1', city: 'Bengaluru', state: 'Kerala', postal_code: '682001' },
      [bengaluru],
      account
    );

    expect(values).toMatchObject({ location_id: '', state: 'Kerala', city: 'Bengaluru', postal_code: '682001' });
  });

  it('uses the location name for a zoneless city and makes it the locality', () => {
    const values = venueToValues({ id: 'v1', location_id: 'loc-goa' }, [goa], account);

    expect(values).toMatchObject({ city: 'Panaji', locality: 'Panaji', postal_code: '403001', state: 'Goa' });
  });

  it('matches a zoneless legacy city by its location name', () => {
    const values = venueToValues({ id: 'v1', city: 'Panaji', state: 'Goa' }, [goa], account);

    expect(values.location_id).toBe('loc-goa');
  });

  it('keeps the stored values when a location has no zones list and nothing to add', () => {
    const bare = { id: 'loc-bare', city: 'Mysuru', location_name: 'Mysuru' };
    const values = venueToValues(
      { id: 'v1', location_id: 'loc-bare', country: 'India', state: 'Karnataka', locality: 'Gokulam', postal_code: '570002' },
      [bare],
      account
    );

    expect(values).toMatchObject({
      location_id: 'loc-bare',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      city: 'Mysuru',
      locality: 'Gokulam',
      postal_code: '570002',
    });
  });
});

const filled: RegisterVenueValues = {
  ...blankRegisterVenueValues,
  venue_name: 'Cafe Mocha',
  documents: [
    { type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf', hash: 'h1' },
    { type: 'Trade License', url: '' },
    { type: '', url: 'https://cdn.duncit.com/orphan.pdf' },
  ],
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  has_gstin: true,
  has_pan: true,
  owner_name: 'Asha Rao',
  owner_email: 'owner@duncit.com',
  owner_phone: '+919876543210',
  owner_dob: '1991-02-03',
  owner_address: '12 Main Street',
  payout_method: 'IMPS',
  account_holder_name: 'Asha Rao',
  account_number: '123456789',
  ifsc_code: 'hdfc0001234',
  upi_id: 'asha@okaxis',
};

const dish: RegisterVenueValues['food_menu'][number] = {
  item_id: 'dish-1',
  name: 'Masala dosa',
  description: '',
  category: '',
  price: '120',
  images: [],
  diet: 'VEG',
  spice_level: 'MILD',
  is_available: true,
  videos: [],
  original_price: '',
  saving_display: 'PERCENT',
};

describe('toStep1Input', () => {
  it('sends the venue details only: type, capacity, food and amenities are set up from Venue Options', () => {
    const input = toStep1Input({ ...filled, offers_food: true, amenities: ['AC'] });

    expect(input.location_id).toBeNull();
    for (const key of ['venue_type', 'capacity', 'capacity_items', 'offers_food', 'food_menu', 'amenities', 'facilities', 'security']) {
      expect(input).not.toHaveProperty(key);
    }
  });
});

describe('toSetupTypeCapacityInput', () => {
  it('drops blank capacity rows and counts a non-numeric capacity as zero', () => {
    const input = toSetupTypeCapacityInput({
      ...filled,
      venue_type: 'Cafe',
      capacity_items: [
        { label: ' Hall ', capacity: '40' },
        { label: '', capacity: '' },
        { label: 'Terrace', capacity: 'lots' },
      ],
    });

    expect(input).toEqual({
      venue_type: 'Cafe',
      capacity_items: [
        { label: 'Hall', capacity: 40 },
        { label: 'Terrace', capacity: 0 },
      ],
    });
  });
});

describe('toSetupInput', () => {
  it('sends only the page’s own fields', () => {
    const values = { ...filled, venue_type: 'Cafe', amenities: ['AC'], facilities: ['Parking'], security: ['CCTV'] };
    expect(toSetupInput('amenities', values)).toEqual(toSetupAmenitiesInput(values));
    expect(toSetupInput('amenities', values)).toEqual({ amenities: ['AC'], facilities: ['Parking'], security: ['CCTV'] });
    expect(toSetupInput('type-capacity', values)).toEqual(toSetupTypeCapacityInput(values));
  });

  it('leaves an approved venue’s menu out of a Food Settings save — Food > Menu edits it', () => {
    const values = { ...filled, offers_food: true, food_menu: [{ ...dish }] };
    expect(toSetupInput('food', values)).not.toHaveProperty('food_menu');
    expect(toSetupInput('food', values)).toMatchObject({ offers_food: true });
    expect(toSetupInput('food', values, { withMenu: true })).toHaveProperty('food_menu');
  });

  it('sends a typed GST number, upper-cased, and none when nothing was typed', () => {
    expect(toSetupFoodInput({ ...filled, offers_food: true, food_gstin: ' 22abcde1234f1z5 ' }, { withMenu: false })).toMatchObject({
      gstin: '22ABCDE1234F1Z5',
    });
    expect(toSetupFoodInput({ ...filled, offers_food: false }, { withMenu: false })).toEqual({ offers_food: false });
  });
});

/** The shared food mapping every food save sends (Food Settings, and the menu for a venue not yet approved). */
const foodInput = toFoodInput;

describe('the food mapping, as Food Settings sends it', () => {
  it('sends only the switch while the venue does not offer food', () => {
    const input = foodInput({ ...filled, offers_food: false, food_menu: [{ ...dish }] });

    expect(input.offers_food).toBe(false);
    expect('food_menu' in input).toBe(false);
    expect('food_ordering' in input).toBe(false);
  });

  it('sends the menu and ordering once food is on, a saved dish keeping its id', () => {
    const input = foodInput({
      ...filled,
      offers_food: true,
      food_menu: [{ ...dish }, { ...dish, item_id: '', name: 'Filter coffee', price: 'free' }],
      food_ordering: {
        enabled: true,
        razorpay_integration_id: 'rzp-1',
        razorpay_linked: true,
        discount_pct: '5',
        tax_override: false,
        tax_mode: 'INCLUSIVE',
        gst_pct: 5,
      },
    });

    expect(input).toMatchObject({
      offers_food: true,
      food_menu: [
        { id: 'dish-1', name: 'Masala dosa', price: 120 },
        { name: 'Filter coffee', price: 0 },
      ],
      food_ordering: { enabled: true, razorpay_integration_id: 'rzp-1', discount_pct: 5 },
    });
    expect('id' in (input.food_menu?.[1] ?? {})).toBe(false);
  });

  it("sends the venue's own GST only while it overrides Finance's default", () => {
    const ordering = { ...filled.food_ordering, tax_mode: 'EXCLUSIVE', gst_pct: '18' };
    const following = foodInput({ ...filled, offers_food: true, food_ordering: { ...ordering, tax_override: false } });
    // Switched off, the stored GST is left alone — only the switch goes.
    expect(following.food_ordering).toMatchObject({ tax_override: false });
    expect('tax_mode' in (following.food_ordering ?? {})).toBe(false);
    expect('gst_pct' in (following.food_ordering ?? {})).toBe(false);

    const overriding = foodInput({ ...filled, offers_food: true, food_ordering: { ...ordering, tax_override: true } });
    expect(overriding.food_ordering).toMatchObject({ tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: 18 });
  });
});

describe('venue videos', () => {
  const clip = 'https://ik.imagekit.io/duncit/staging/venues/v1/videos/tour.mp4';
  const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  it('hydrates the stored videos, in order, and a venue with none on an empty list', () => {
    expect(venueToValues({ id: 'v1', videos: [clip, link] }, [], account).videos).toEqual([clip, link]);
    expect(venueToValues({ id: 'v1', videos: null }, [], account).videos).toEqual([]);
  });

  it('sends them with step 1 and with an approved venue’s details save', () => {
    const values = { ...filled, videos: [link, clip] };
    expect(toStep1Input(values).videos).toEqual([link, clip]);
    expect(toApprovedUpdateInput('details', values, 0)).toMatchObject({ videos: [link, clip] });
  });

  it('round-trips: what the server answers is what goes back', () => {
    const hydrated = venueToValues({ id: 'v1', videos: [clip] }, [], account);
    expect(toStep1Input(hydrated).videos).toEqual([clip]);
  });

  it('never carries videos on the other approved sections, so they cannot be cleared by accident', () => {
    const values = { ...filled, offers_food: true, videos: [clip] };
    for (const section of ['type-capacity', 'food', 'documents', 'owner'] as const) {
      expect(toApprovedUpdateInput(section, values, 0)).not.toHaveProperty('videos');
    }
  });
});

describe('food dishes — videos and display pricing', () => {
  const stored = {
    id: 'dish-1',
    name: 'Masala dosa',
    price: 120,
    images: [],
    diet: 'VEG',
    spice_level: 'MILD',
    is_available: true,
    videos: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    original_price: 150,
    saving_display: 'AMOUNT',
  };

  it('hydrates a dish’s videos, struck-through price and saving display', () => {
    const [row] = venueToValues({ id: 'v1', offers_food: true, food_menu: [stored] }, [], account).food_menu;
    expect(row).toMatchObject({
      item_id: 'dish-1',
      videos: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
      original_price: 150,
      saving_display: 'AMOUNT',
    });
  });

  it('opens a dish stored before these existed with no videos, no MRP and a percent saving', () => {
    const legacy = { id: 'dish-0', name: 'Idli', price: 60, images: [], diet: 'VEG', spice_level: 'NONE', is_available: true };
    const [row] = venueToValues({ id: 'v1', offers_food: true, food_menu: [legacy] }, [], account).food_menu;
    expect(row).toMatchObject({ videos: [], original_price: '', saving_display: 'PERCENT' });
  });

  it('round-trips the dish: what the server answers is what goes back', () => {
    const hydrated = venueToValues({ id: 'v1', offers_food: true, food_menu: [stored] }, [], account);
    expect(foodInput(hydrated).food_menu).toEqual([
      {
        id: 'dish-1',
        name: 'Masala dosa',
        description: '',
        category: '',
        price: 120,
        images: [],
        diet: 'VEG',
        spice_level: 'MILD',
        is_available: true,
        videos: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
        original_price: 150,
        saving_display: 'AMOUNT',
      },
    ]);
  });

  it('sends a blank or zero MRP as no strikethrough at all', () => {
    const input = foodInput({
      ...filled,
      offers_food: true,
      food_menu: [{ ...dish }, { ...dish, item_id: '', original_price: 0 }, { ...dish, item_id: '', original_price: '199' }],
    });
    expect(input.food_menu?.map((row) => row.original_price)).toEqual([null, null, 199]);
  });
});

describe('food licences and QR tables', () => {
  const licences = {
    fssai_number: '12345678901234',
    fssai_document_url: 'https://cdn.duncit.com/fssai.pdf',
    liquor_licence_number: 'KA-BAR-0099',
    liquor_document_url: '',
  };

  it('hydrates the stored licences and the tables as the field’s text', () => {
    const values = venueToValues({ id: 'v1', food_licences: licences, food_tables: ['1', '2', 'Patio'] }, [], account);
    expect(values.food_licences).toEqual(licences);
    expect(values.food_tables).toBe('1, 2, Patio');
  });

  it('opens a venue that never gave any on blank licences and no tables', () => {
    const values = venueToValues({ id: 'v1', food_licences: null, food_tables: null }, [], account);
    expect(values.food_licences).toEqual(blankRegisterVenueValues.food_licences);
    expect(values.food_tables).toBe('');
  });

  it('sends trimmed licence numbers and one label per table, a repeat kept once', () => {
    const input = foodInput({
      ...filled,
      offers_food: true,
      food_licences: { ...licences, fssai_number: ' 12345678901234 ', liquor_licence_number: ' KA-BAR-0099 ' },
      food_tables: '1, 2\nPatio, , 2',
    });
    expect(input.food_licences).toEqual(licences);
    expect(input.food_tables).toEqual(['1', '2', 'Patio']);
  });

  it('round-trips licences and tables through an approved Food save', () => {
    const hydrated = venueToValues(
      { id: 'v1', offers_food: true, food_licences: licences, food_tables: ['1', 'Patio'] },
      [],
      account
    );
    expect(toApprovedUpdateInput('food', hydrated, 0)).toMatchObject({
      food_licences: licences,
      food_tables: ['1', 'Patio'],
    });
  });

  it('sends neither while the venue serves no food, so the server keeps them for later', () => {
    const input = foodInput({ ...filled, offers_food: false, food_licences: licences, food_tables: '1, 2' });
    expect(input).not.toHaveProperty('food_licences');
    expect(input).not.toHaveProperty('food_tables');
  });
});

describe('venueToValues — GST on food', () => {
  it('reads the GST the server resolved and starts the GST number field empty', () => {
    const values = venueToValues(
      { id: 'v1', gstin: '29ABCDE1234F1Z5', food_ordering: { enabled: false, tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: 12 } },
      [],
      account
    );
    expect(values.food_ordering).toMatchObject({ tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: 12 });
    expect(values.food_gstin).toBe('');
  });
});

describe('toApprovedUpdateInput — the GST number from the Food section', () => {
  const food = { ...filled, offers_food: true };

  it('sends a typed GST number, upper-cased, with the food fields', () => {
    expect(toApprovedUpdateInput('food', { ...food, food_gstin: ' 29abcde1234f1z5 ' }, 0)).toMatchObject({
      offers_food: true,
      gstin: '29ABCDE1234F1Z5',
    });
  });

  it('sends no GST number when none was typed, so a saved one is never touched', () => {
    expect('gstin' in toApprovedUpdateInput('food', { ...food, food_gstin: '  ' }, 0)).toBe(false);
  });
});

describe('toStep2Input', () => {
  it('sends only the documents that have both a type and a file, without the client-side hash', () => {
    expect(toStep2Input(filled)).toEqual({
      documents: [{ type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf' }],
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
    });
  });
});

describe('toStep2Input — optional tax ids', () => {
  it('sends a blank GSTIN and PAN when their switches are off, whatever the fields still hold', () => {
    expect(toStep2Input({ ...filled, has_gstin: false, has_pan: false })).toMatchObject({ gstin: '', pan: '' });
  });
});

describe('venueToValues — tax id switches', () => {
  it('starts both switches off for a venue that has neither number', () => {
    expect(venueToValues({ id: 'v1' }, [], account)).toMatchObject({ has_gstin: false, has_pan: false });
  });
});

describe('toStep3Input', () => {
  it('sends bank details (IFSC upper-cased) and blanks the UPI id for a bank transfer', () => {
    expect(toStep3Input(filled, 'asha@duncit.com')).toEqual({
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
      owner_phone: '+919876543210',
      owner_dob: '1991-02-03',
      owner_address: '12 Main Street',
      bank_account: {
        payout_method: 'IMPS',
        account_holder_name: 'Asha Rao',
        account_number: '123456789',
        ifsc_code: 'HDFC0001234',
        upi_id: '',
      },
    });
  });

  it('sends only the UPI id for a UPI payout', () => {
    expect(toStep3Input({ ...filled, payout_method: 'UPI' }, 'asha@duncit.com').bank_account).toEqual({
      payout_method: 'UPI',
      account_holder_name: 'Asha Rao',
      account_number: '',
      ifsc_code: '',
      upi_id: 'asha@okaxis',
    });
  });

  it('falls back to the typed owner email, and sends null for an unset date of birth and method', () => {
    const input = toStep3Input({ ...filled, owner_dob: '', payout_method: '' }, '');

    expect(input.owner_email).toBe('owner@duncit.com');
    expect(input.owner_dob).toBeNull();
    expect(input.bank_account.payout_method).toBeNull();
  });
});

const BADMINTON = {
  super_category_id: 'sup-sports',
  category_id: 'cat-racket',
  sub_category_id: 'sub-badminton',
  super_category_name: 'Sports',
  category_name: 'Racket',
  sub_category_name: 'Badminton',
};
const HATHA = {
  super_category_id: 'sup-fitness',
  category_id: 'cat-yoga',
  sub_category_id: 'sub-hatha',
  super_category_name: 'Fitness',
  category_name: 'Yoga',
  sub_category_name: 'Hatha',
};
const BADMINTON_ROW = {
  super_id: 'sup-sports',
  super_name: 'Sports',
  category_id: 'cat-racket',
  category_name: 'Racket',
  sub_id: 'sub-badminton',
  sub_name: 'Badminton',
};
const HATHA_ROW = {
  super_id: 'sup-fitness',
  super_name: 'Fitness',
  category_id: 'cat-yoga',
  category_name: 'Yoga',
  sub_id: 'sub-hatha',
  sub_name: 'Hatha',
};
const BLANK_ROW = { super_id: '', super_name: '', category_id: '', category_name: '', sub_id: '', sub_name: '' };

describe('venueToValues — the venue’s categories', () => {
  it('hydrates one picker row per category, primary first', () => {
    const values = venueToValues({ id: 'v1', venue_categories: [HATHA, BADMINTON], venue_category: HATHA }, [], account);
    expect(values.venue_categories).toEqual([HATHA_ROW, BADMINTON_ROW]);
  });

  // A venue stored before the list existed, or answered by a server that only knows the single field.
  it('hydrates a legacy-only venue as one row', () => {
    expect(venueToValues({ id: 'v1', venue_category: BADMINTON }, [], account).venue_categories).toEqual([BADMINTON_ROW]);
    expect(
      venueToValues({ id: 'v1', venue_categories: [], venue_category: BADMINTON }, [], account).venue_categories
    ).toEqual([BADMINTON_ROW]);
  });

  it('starts a venue with no category on one blank row, never an empty list', () => {
    const blankTriple = {
      super_category_id: null,
      category_id: null,
      sub_category_id: null,
      super_category_name: '',
      category_name: '',
      sub_category_name: '',
    };
    expect(venueToValues({ id: 'v1', venue_category: blankTriple, venue_categories: [] }, [], account).venue_categories).toEqual([
      BLANK_ROW,
    ]);
    expect(venueToValues({ id: 'v1' }, [], account).venue_categories).toEqual([BLANK_ROW]);
  });

  it('gives every new form its own blank row, not the shared default object', () => {
    const first = venueToValues({ id: 'v1' }, [], account).venue_categories;
    const second = venueToValues({ id: 'v2' }, [], account).venue_categories;
    expect(first[0]).not.toBe(second[0]);
  });
});

describe('toStep1Input — the venue’s categories', () => {
  const values = (venue_categories: RegisterVenueValues['venue_categories']): RegisterVenueValues => ({
    ...blankRegisterVenueValues,
    venue_categories,
  });

  it('sends every category as an id triple, primary first, and no single venue_category', () => {
    const input = toStep1Input(values([HATHA_ROW, BADMINTON_ROW]));
    expect(input.venue_categories).toEqual([
      { super_category_id: 'sup-fitness', category_id: 'cat-yoga', sub_category_id: 'sub-hatha' },
      { super_category_id: 'sup-sports', category_id: 'cat-racket', sub_category_id: 'sub-badminton' },
    ]);
    expect(input).not.toHaveProperty('venue_category');
  });

  it('round-trips two categories: what the server answers is what goes back', () => {
    const hydrated = venueToValues({ id: 'v1', venue_categories: [BADMINTON, HATHA] }, [], account);
    expect(toStep1Input(hydrated).venue_categories).toEqual([
      { super_category_id: 'sup-sports', category_id: 'cat-racket', sub_category_id: 'sub-badminton' },
      { super_category_id: 'sup-fitness', category_id: 'cat-yoga', sub_category_id: 'sub-hatha' },
    ]);
  });

  it('leaves out a row that is not a whole triple yet', () => {
    const halfPicked = { ...HATHA_ROW, sub_id: '', sub_name: '' };
    expect(toStep1Input(values([BADMINTON_ROW, halfPicked, BLANK_ROW])).venue_categories).toEqual([
      { super_category_id: 'sup-sports', category_id: 'cat-racket', sub_category_id: 'sub-badminton' },
    ]);
    expect(toStep1Input(values([BLANK_ROW])).venue_categories).toEqual([]);
  });
});

describe('toApprovedUpdateInput — categories stay locked after approval', () => {
  it('never carries a category in any section an approved venue can save', () => {
    const edited = { ...blankRegisterVenueValues, venue_categories: [HATHA_ROW, BADMINTON_ROW] };
    for (const section of ['details', 'type-capacity', 'food', 'documents', 'owner'] as const) {
      const input = toApprovedUpdateInput(section, edited, 0);
      expect(input).not.toHaveProperty('venue_categories');
      expect(input).not.toHaveProperty('venue_category');
    }
  });
});
