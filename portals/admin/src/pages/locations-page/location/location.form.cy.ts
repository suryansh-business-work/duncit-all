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

describe('locationFormSchema', () => {
  it('rejects empty location name', async () => {
    const error = await locationFormSchema.validate({ ...base, location_name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/location name/i);
  });
  it('rejects bad primary PIN code', async () => {
    const error = await locationFormSchema.validate({ ...base, location_pincode: '!!' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/pin/i);
  });
  it('rejects missing location_image', async () => {
    const error = await locationFormSchema.validate({ ...base, location_image: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/location image/i);
  });
  it('rejects zone with bad pincode', async () => {
    const error = await locationFormSchema
      .validate({ ...base, zones: [{ zone_name: 'HSR', zone_code: '', pincode: '!!' }] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/pin/i);
  });
  it('accepts fully valid input', async () => {
    await expect(locationFormSchema.validate(base)).resolves.toBeTruthy();
  });
});

describe('toLocationInput', () => {
  it('drops empty zones', () => {
    const input = toLocationInput(base);
    expect(input.location_zones).toHaveLength(1);
  });
});
