import { describe, expect, it } from 'vitest';
import { registerVenueSchema, SECTION_FIELDS } from './register-venue.schema';
import { toApprovedUpdateInput, toStep1Input, venueToValues } from './register-venue.mappers';
import { blankRegisterVenueValues, type RegisterVenueValues } from './register-venue.types';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';

const COFFEE: AdminCategoryValue = {
  super_id: 'super-1',
  super_name: 'Food & Drink',
  category_id: 'cat-1',
  category_name: 'Cafe',
  sub_id: 'sub-1',
  sub_name: 'Coffee',
};
const TEA: AdminCategoryValue = { ...COFFEE, sub_id: 'sub-2', sub_name: 'Tea' };
const BADMINTON: AdminCategoryValue = {
  super_id: 'super-2',
  super_name: 'Sports',
  category_id: 'cat-2',
  category_name: 'Racket',
  sub_id: 'sub-3',
  sub_name: 'Badminton',
};

const validValues: RegisterVenueValues = {
  ...blankRegisterVenueValues,
  venue_name: 'Cafe Mocha',
  description: 'A cosy corner cafe',
  cover_image_url: 'https://cdn.example.com/cover.jpg',
  venue_categories: [COFFEE],
  address_line1: '12 Main Street',
  location_id: 'loc-1',
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  postal_code: '560038',
  venue_type: 'Cafe',
  capacity_items: [
    { label: 'Main hall', capacity: 30 },
    { label: 'Rooftop tables', capacity: '12' },
  ],
  documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }],
  gstin: '22ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  has_gstin: true,
  has_pan: true,
  owner_name: 'Owner Name',
  owner_email: 'owner@example.com',
  owner_phone: '+919876543210',
  owner_dob: '1990-05-10',
  owner_address: '12 Main Street, Indiranagar',
  payout_method: 'UPI',
  account_holder_name: 'Owner Name',
  upi_id: 'owner@okaxis',
};

/** A venue serving food: one saved dish, one typed in and not yet saved. */
const withFood: Pick<RegisterVenueValues, 'offers_food' | 'food_menu' | 'food_ordering'> = {
  offers_food: true,
  food_menu: [
    {
      item_id: 'dish-1',
      name: ' Masala dosa ',
      description: ' Crisp ',
      category: ' Mains ',
      price: '120',
      images: ['https://cdn.example.com/dosa.jpg'],
      diet: 'VEG',
      spice_level: '',
      is_available: true,
    },
    {
      item_id: '',
      name: 'Filter coffee',
      description: '',
      category: '',
      price: 40,
      images: [],
      diet: '',
      spice_level: 'NONE',
      is_available: false,
    },
  ],
  food_ordering: { enabled: true, razorpay_integration_id: 'rzp-1', razorpay_linked: true, discount_pct: '10', tax_override: false, tax_mode: '', gst_pct: '' },
};

const messagesOf = (values: RegisterVenueValues) => {
  const parsed = registerVenueSchema().safeParse(values);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
};

describe('registerVenueSchema', () => {
  it('accepts a fully filled registration (with stringy capacity numbers)', () => {
    expect(registerVenueSchema().safeParse(validValues).success).toBe(true);
  });

  it('requires the full category triple on every row, and says which row', () => {
    const issuesOf = (venue_categories: AdminCategoryValue[]) => {
      const parsed = registerVenueSchema().safeParse({ ...validValues, venue_categories });
      return parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }));
    };
    const incomplete = 'Select the super category, category and sub category.';

    expect(issuesOf([{ ...EMPTY_CATEGORY }])).toEqual([{ path: ['venue_categories', 0], message: incomplete }]);
    expect(issuesOf([COFFEE, { ...BADMINTON, sub_id: '', sub_name: '' }])).toEqual([
      { path: ['venue_categories', 1], message: incomplete },
    ]);
    expect(issuesOf([COFFEE, { ...BADMINTON, category_id: '' }])).toEqual([
      { path: ['venue_categories', 1], message: incomplete },
    ]);
  });

  it('accepts several categories, and needs at least one', () => {
    expect(registerVenueSchema().safeParse({ ...validValues, venue_categories: [COFFEE, TEA, BADMINTON] }).success).toBe(true);

    const parsed = registerVenueSchema().safeParse({ ...validValues, venue_categories: [] });
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))).toEqual([
      { path: ['venue_categories'], message: 'Add at least one category' },
    ]);
  });

  it('refuses the same sub category twice, flagging the later row only', () => {
    const parsed = registerVenueSchema().safeParse({ ...validValues, venue_categories: [COFFEE, TEA, { ...COFFEE }] });
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))).toEqual([
      { path: ['venue_categories', 2], message: 'This sub category is already added above' },
    ]);
  });

  it('caps the categories at the config’s limit, and applies no cap until the config has one', () => {
    const three = { ...validValues, venue_categories: [COFFEE, TEA, BADMINTON] };
    const at = (limit: number) => registerVenueSchema(undefined, undefined, undefined, limit).safeParse(three);

    expect(at(3).success).toBe(true);
    const overTwo = at(2);
    expect(overTwo.success ? [] : overTwo.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))).toEqual([
      { path: ['venue_categories'], message: 'A venue can have at most 2 categories.' },
    ]);
    const overOne = at(1);
    expect(overOne.success ? [] : overOne.error.issues.map((issue) => issue.message)).toEqual([
      'A venue can have only 1 category.',
    ]);
    expect(registerVenueSchema().safeParse(three).success).toBe(true);
  });

  it('files every category issue under Venue Details', () => {
    const parsed = registerVenueSchema().safeParse({ ...validValues, venue_categories: [{ ...EMPTY_CATEGORY }, COFFEE, { ...COFFEE }] });
    const roots = parsed.success ? [] : parsed.error.issues.map((issue) => String(issue.path[0]));
    expect(roots).toEqual(['venue_categories', 'venue_categories']);
    expect(SECTION_FIELDS.details).toContain('venue_categories');
  });

  it('requires a supported city and locality', () => {
    const messages = messagesOf({ ...validValues, location_id: '', locality: '' });
    expect(messages).toContain('Select a city from available locations');
    expect(messages).toContain('Locality / area is required');
  });

  it('requires at least one capacity entry with a label and a sane number', () => {
    expect(messagesOf({ ...validValues, capacity_items: [] })).toContain(
      'Add at least one capacity entry for your venue'
    );
    expect(messagesOf({ ...validValues, capacity_items: [{ label: '', capacity: 10 }] })).toContain(
      'Give this capacity a label (e.g. Banquet hall)'
    );
    expect(messagesOf({ ...validValues, capacity_items: [{ label: 'Hall', capacity: 0 }] })).toContain(
      'Capacity must be at least 1'
    );
    expect(messagesOf({ ...validValues, capacity_items: [{ label: 'Hall', capacity: 2.5 }] })).toContain(
      'Capacity must be a whole number'
    );
  });

  it('requires a venue type and at least one uploaded document', () => {
    expect(messagesOf({ ...validValues, venue_type: '' })).toContain('Select a venue type');
    expect(messagesOf({ ...validValues, documents: [] })).toContain('Upload at least one document');
    expect(messagesOf({ ...validValues, documents: [{ type: 'PAN Card', url: '' }] })).toContain(
      'Upload the document file'
    );
  });

  it('treats GSTIN and PAN as optional while their switches are off', () => {
    const none = { ...validValues, has_gstin: false, gstin: '', has_pan: false, pan: '' };
    expect(registerVenueSchema().safeParse(none).success).toBe(true);
    // A stale value behind an off switch is not judged — it is never sent.
    expect(registerVenueSchema().safeParse({ ...none, gstin: 'nope', pan: 'nope' }).success).toBe(true);
  });

  it('requires GSTIN and PAN once switched on, and validates their formats', () => {
    const blank = messagesOf({ ...validValues, gstin: '', pan: '' });
    expect(blank).toContain('GSTIN is required');
    expect(blank).toContain('PAN is required');
    expect(messagesOf({ ...validValues, gstin: 'nope' })).toContain(
      'GSTIN must follow format like 22ABCDE1234F1Z5'
    );
    expect(messagesOf({ ...validValues, pan: 'nope' })).toContain('PAN must follow format ABCDE1234F');
    expect(
      registerVenueSchema().safeParse({ ...validValues, gstin: '22abcde1234f1z5', pan: 'abcde1234f' }).success
    ).toBe(true);
  });

  it('requires the payout fields the chosen method needs', () => {
    expect(messagesOf({ ...validValues, payout_method: '' })).toContain('Select a payout method');
    expect(messagesOf({ ...validValues, payout_method: 'CHEQUE' })).toContain('Select UPI, IMPS or NEFT');
    expect(messagesOf({ ...validValues, account_holder_name: '' })).toContain('Account holder name is required');
    expect(messagesOf({ ...validValues, account_holder_name: 'Owner 2' })).toContain(
      'Account holder name can use letters and spaces only'
    );
    expect(messagesOf({ ...validValues, upi_id: '' })).toContain('UPI ID is required');
    expect(messagesOf({ ...validValues, upi_id: 'not-a-upi' })).toContain('Enter a valid UPI ID');

    const bank = { ...validValues, payout_method: 'NEFT', upi_id: '' };
    expect(messagesOf({ ...bank, account_number: '', ifsc_code: '' })).toEqual([
      'Account number is required',
      'IFSC code is required',
    ]);
    expect(messagesOf({ ...bank, account_number: '12', ifsc_code: 'HDFC123' })).toEqual([
      'Account number must be 6 to 18 digits',
      'IFSC must follow format ABCD0123456',
    ]);
    expect(messagesOf({ ...bank, payout_method: 'IMPS', account_number: '123456789', ifsc_code: 'hdfc0001234' })).toEqual(
      []
    );
  });

  it('refuses the same file uploaded under two document headings', () => {
    const documents = [
      { type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf', hash: 'h1' },
      { type: 'Trade License', url: 'https://cdn.example.com/pan-again.pdf', hash: 'h1' },
      { type: 'Fire NOC', url: 'https://cdn.example.com/noc.pdf' },
    ];
    expect(messagesOf({ ...validValues, documents })).toEqual([
      'This document is already uploaded under another heading',
    ]);
  });

  it('validates owner contact details', () => {
    expect(messagesOf({ ...validValues, owner_phone: 'abc' })).toContain(
      'Owner phone must contain only digits (6–15 digits) with optional + prefix'
    );
    expect(messagesOf({ ...validValues, owner_email: 'not-an-email' }).join(' ')).toMatch(/valid owner email/i);
    expect(messagesOf({ ...validValues, owner_dob: '2999-01-01' })).toContain('Enter a valid date of birth');
  });

  it('validates the food fields under Food Menu, not Type & Capacity', () => {
    expect(SECTION_FIELDS.food).toEqual(['offers_food', 'food_menu', 'food_ordering', 'food_gstin']);
    expect(SECTION_FIELDS['type-capacity']).toEqual(['venue_type', 'capacity_items']);

    const parsed = registerVenueSchema().safeParse({
      ...validValues,
      ...withFood,
      food_menu: [{ ...withFood.food_menu[0], name: '' }],
      food_ordering: { enabled: true, razorpay_integration_id: '', razorpay_linked: false, discount_pct: 0, tax_override: false, tax_mode: '', gst_pct: '' },
    });
    const roots = parsed.success ? [] : parsed.error.issues.map((issue) => String(issue.path[0]));
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(SECTION_FIELDS.food).toContain(root);
      expect(SECTION_FIELDS['type-capacity']).not.toContain(root);
    }
    expect(messagesOf({ ...validValues, ...withFood, food_ordering: { enabled: true, razorpay_integration_id: '', razorpay_linked: false, discount_pct: 0, tax_override: false, tax_mode: '', gst_pct: '' } })).toEqual([
      'Pick a Razorpay account before taking food orders',
    ]);
  });

  it('maps every value field to exactly the sections that validate it', () => {
    const allFields = Object.values(SECTION_FIELDS).flat();
    expect(new Set(allFields).size).toBe(allFields.length);
    const byName = (a: string, b: string) => a.localeCompare(b);
    expect([...allFields].sort(byName)).toEqual(
      Object.keys(blankRegisterVenueValues).sort(byName),
    );
  });
});

describe('register-venue mappers', () => {
  it('sums capacity items into the scalar capacity for step 1', () => {
    const input = toStep1Input(validValues);
    expect(input.capacity).toBe(42);
    expect(input.capacity_items).toEqual([
      { label: 'Main hall', capacity: 30 },
      { label: 'Rooftop tables', capacity: 12 },
    ]);
    expect(input.venue_categories).toEqual([
      { super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' },
    ]);
  });

  it('omits a category from step 1 until its triple is complete', () => {
    const input = toStep1Input({ ...validValues, venue_categories: [{ ...COFFEE, sub_id: '' }] });
    expect(input.venue_categories).toEqual([]);
  });

  it('hydrates form values from a stored venue', () => {
    const venue = {
      id: 'v1',
      venue_name: 'Cafe Mocha',
      venue_type: 'Cafe',
      capacity_items: [{ label: 'Main hall', capacity: 30 }],
      venue_category: { super_category_id: 's1', category_id: 'c1', sub_category_id: 'x1' },
      documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }],
      owner_dob: '1990-05-10T00:00:00.000Z',
      city: 'Bengaluru',
      amenities: ['AC'],
      facilities: ['Parking'],
      security: ['CCTV Surveillance'],
    };
    const values = venueToValues(venue, [], { name: 'Owner', email: 'owner@example.com' });
    expect(values.capacity_items).toEqual([{ label: 'Main hall', capacity: 30 }]);
    // A stored venue that answers only the single triple hydrates as one row.
    expect(values.venue_categories).toEqual([
      { super_id: 's1', super_name: '', category_id: 'c1', category_name: '', sub_id: 'x1', sub_name: '' },
    ]);
    expect(values.owner_dob).toBe('1990-05-10');
    expect(values.owner_email).toBe('owner@example.com');
    expect(values.amenities).toEqual(['AC']);
    expect(values.facilities).toEqual(['Parking']);
    expect(values.security).toEqual(['CCTV Surveillance']);
  });

  it('sends amenities, facilities and security with step 1', () => {
    const input = toStep1Input({
      ...validValues,
      amenities: ['AC', 'Wi-Fi'],
      facilities: ['Parking'],
      security: ['Security Guard'],
    });
    expect(input.amenities).toEqual(['AC', 'Wi-Fi']);
    expect(input.facilities).toEqual(['Parking']);
    expect(input.security).toEqual(['Security Guard']);
  });
});

describe('toApprovedUpdateInput (approved-venue spot edits)', () => {
  it('details → only description + images', () => {
    expect(
      toApprovedUpdateInput('details', { ...validValues, cover_image_url: 'https://x/c.jpg', gallery: ['https://x/1.jpg'] }, 1)
    ).toEqual({
      description: 'A cosy corner cafe',
      cover_image_url: 'https://x/c.jpg',
      gallery: ['https://x/1.jpg'],
    });
  });

  it('type-capacity → the cleaned capacity list and no food key, whatever the menu holds', () => {
    const input = toApprovedUpdateInput('type-capacity', { ...validValues, ...withFood }, 1);
    expect(input).toEqual({
      capacity_items: [
        { label: 'Main hall', capacity: 30 },
        { label: 'Rooftop tables', capacity: 12 },
      ],
    });
    // An absent key is "leave it alone" on the server; a sent one would be written.
    for (const key of ['offers_food', 'food_menu', 'food_ordering']) expect(key in input).toBe(false);
  });

  it('food → the switch, the menu with saved ids, and ordering — and no capacity key', () => {
    const input = toApprovedUpdateInput('food', { ...validValues, ...withFood }, 1);
    expect(input).toEqual({
      offers_food: true,
      food_menu: [
        {
          id: 'dish-1',
          name: 'Masala dosa',
          description: 'Crisp',
          category: 'Mains',
          price: 120,
          images: ['https://cdn.example.com/dosa.jpg'],
          diet: 'VEG',
          spice_level: null,
          is_available: true,
        },
        {
          name: 'Filter coffee',
          description: '',
          category: '',
          price: 40,
          images: [],
          diet: null,
          spice_level: 'NONE',
          is_available: false,
        },
      ],
      food_ordering: { enabled: true, razorpay_integration_id: 'rzp-1', razorpay_linked: true, discount_pct: 10, tax_override: false },
    });
    expect('capacity_items' in input).toBe(false);
  });

  it('food, switched off → only the switch, so the server keeps the menu for later', () => {
    expect(toApprovedUpdateInput('food', { ...validValues, ...withFood, offers_food: false }, 1)).toEqual({
      offers_food: false,
    });
  });

  it('documents → only rows added past the original (append-only)', () => {
    const values = {
      ...validValues,
      documents: [
        { type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' },
        { type: 'Trade License', url: 'https://cdn.example.com/license.pdf' },
        { type: 'Other', url: '' },
      ],
    };
    expect(toApprovedUpdateInput('documents', values, 1)).toEqual({
      add_documents: [{ type: 'Trade License', url: 'https://cdn.example.com/license.pdf' }],
    });
  });

  it('owner → contact fields without the locked email', () => {
    const input = toApprovedUpdateInput('owner', { ...validValues, owner_dob: '' }, 1);
    expect(input).toEqual({
      owner_name: 'Owner Name',
      owner_phone: '+919876543210',
      owner_dob: null,
      owner_address: '12 Main Street, Indiranagar',
    });
    expect('owner_email' in input).toBe(false);
  });
});
