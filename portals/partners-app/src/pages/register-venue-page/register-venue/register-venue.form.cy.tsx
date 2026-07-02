import { describe, expect, it } from 'vitest';
import { registerVenueSchema, SECTION_FIELDS } from './register-venue.schema';
import { toApprovedUpdateInput, toStep1Input, venueToValues } from './register-venue.mappers';
import { blankRegisterVenueValues, type RegisterVenueValues } from './register-venue.types';

const validValues: RegisterVenueValues = {
  ...blankRegisterVenueValues,
  venue_name: 'Cafe Mocha',
  description: 'A cosy corner cafe',
  super_category_id: 'super-1',
  category_id: 'cat-1',
  sub_category_id: 'sub-1',
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
  owner_name: 'Owner Name',
  owner_email: 'owner@example.com',
  owner_phone: '+919876543210',
};

const messagesOf = (values: RegisterVenueValues) => {
  const parsed = registerVenueSchema.safeParse(values);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
};

describe('registerVenueSchema', () => {
  it('accepts a fully filled registration (with stringy capacity numbers)', () => {
    expect(registerVenueSchema.safeParse(validValues).success).toBe(true);
  });

  it('requires the full category triple', () => {
    const messages = messagesOf({ ...validValues, super_category_id: '', category_id: '', sub_category_id: '' });
    expect(messages).toContain('Select a super category');
    expect(messages).toContain('Select a category');
    expect(messages).toContain('Select a sub category');
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

  it('validates optional GSTIN/PAN formats only when present', () => {
    expect(registerVenueSchema.safeParse({ ...validValues, gstin: '', pan: '' }).success).toBe(true);
    expect(messagesOf({ ...validValues, gstin: 'nope' })).toContain(
      'GSTIN must follow format like 22ABCDE1234F1Z5'
    );
    expect(messagesOf({ ...validValues, pan: 'nope' })).toContain('PAN must follow format ABCDE1234F');
    expect(
      registerVenueSchema.safeParse({ ...validValues, gstin: '22ABCDE1234F1Z5', pan: 'ABCDE1234F' }).success
    ).toBe(true);
  });

  it('validates owner contact details', () => {
    expect(messagesOf({ ...validValues, owner_phone: 'abc' })).toContain(
      'Owner phone must contain only digits (6–15 digits) with optional + prefix'
    );
    expect(messagesOf({ ...validValues, owner_email: 'not-an-email' }).join(' ')).toMatch(/valid owner email/i);
    expect(messagesOf({ ...validValues, owner_dob: '2999-01-01' })).toContain('Enter a valid date of birth');
  });

  it('maps every value field to exactly the sections that validate it', () => {
    const allFields = Object.values(SECTION_FIELDS).flat();
    expect(new Set(allFields).size).toBe(allFields.length);
    expect([...allFields].sort()).toEqual(Object.keys(blankRegisterVenueValues).sort());
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
    expect(input.venue_category).toEqual({
      super_category_id: 'super-1',
      category_id: 'cat-1',
      sub_category_id: 'sub-1',
    });
  });

  it('omits the category from step 1 until the triple is complete', () => {
    const input = toStep1Input({ ...validValues, sub_category_id: '' });
    expect(input.venue_category).toBeNull();
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
    expect(values.super_category_id).toBe('s1');
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

  it('type-capacity → cleaned capacity list only', () => {
    expect(toApprovedUpdateInput('type-capacity', validValues, 1)).toEqual({
      capacity_items: [
        { label: 'Main hall', capacity: 30 },
        { label: 'Rooftop tables', capacity: 12 },
      ],
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
      owner_address: '',
    });
    expect('owner_email' in input).toBe(false);
  });
});
