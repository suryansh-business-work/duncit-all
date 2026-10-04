import { describe, expect, it } from 'vitest';
import { locationFormSchema, toLocationInput } from './location.form';

const base = {
  country: 'India',
  state: 'Karnataka',
  location_name: 'Bengaluru',
  location_pincode: '560001',
  is_active: true,
  location_image: 'https://cdn.example.com/blr.png',
  zones: [
    { zone_name: 'HSR', zone_code: 'HSR', pincode: '560102' },
    { zone_name: '', zone_code: '', pincode: '' },
  ],
};

const messagesOf = (values: unknown) => {
  const result = locationFormSchema.safeParse(values);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('locationFormSchema', () => {
  it('rejects empty location name', () => {
    expect(messagesOf({ ...base, location_name: '' })).toMatch(/location name/i);
  });
  it('rejects bad primary PIN code', () => {
    expect(messagesOf({ ...base, location_pincode: '!!' })).toMatch(/pin/i);
  });
  it('rejects missing location_image', () => {
    expect(messagesOf({ ...base, location_image: '' })).toMatch(/location image/i);
  });
  it('rejects zone with bad pincode', () => {
    expect(
      messagesOf({ ...base, zones: [{ zone_name: 'HSR', zone_code: '', pincode: '!!' }] })
    ).toMatch(/pin/i);
  });
  it('accepts fully valid input', () => {
    expect(locationFormSchema.safeParse(base).success).toBe(true);
  });
});

describe('toLocationInput', () => {
  it('drops empty zones', () => {
    const input = toLocationInput(base);
    expect(input.location_zones).toHaveLength(1);
  });

  it('keeps a zone that has only a code, or only a PIN code', () => {
    const input = toLocationInput({
      ...base,
      zones: [
        { zone_name: '', zone_code: 'KRM', pincode: '' },
        { zone_name: '', zone_code: '', pincode: '560034' },
        { zone_name: '', zone_code: '', pincode: '' },
      ],
    });
    expect(input.location_zones).toEqual([
      { zone_name: '', zone_code: 'KRM', pincode: '' },
      { zone_name: '', zone_code: '', pincode: '560034' },
    ]);
  });

  it('trims every field and fills the schema defaults when active and zones are left out', () => {
    expect(
      toLocationInput({
        country: '  India ',
        state: ' Karnataka ',
        location_name: ' Bengaluru  ',
        location_pincode: ' 560001 ',
        location_image: ' https://cdn.example.com/blr.png ',
      })
    ).toEqual({
      country: 'India',
      state: 'Karnataka',
      location_name: 'Bengaluru',
      location_pincode: '560001',
      is_active: true,
      location_image: 'https://cdn.example.com/blr.png',
      location_zones: [],
    });
  });

  it('keeps an explicit inactive flag', () => {
    expect(toLocationInput({ ...base, is_active: false }).is_active).toBe(false);
  });

  it('treats a zone’s missing fields as blank, and drops a zone with nothing in it', () => {
    const input = toLocationInput({
      ...base,
      zones: [{ zone_name: ' Indiranagar ' }, { zone_code: ' IND ' }, { pincode: ' 560038 ' }, {}],
    });
    expect(input.location_zones).toEqual([
      { zone_name: 'Indiranagar', zone_code: '', pincode: '' },
      { zone_name: '', zone_code: 'IND', pincode: '' },
      { zone_name: '', zone_code: '', pincode: '560038' },
    ]);
  });
});
