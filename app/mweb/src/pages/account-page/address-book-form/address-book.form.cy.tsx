import { describe, expect, it } from 'vitest';
import { addressSchema } from './address-book.form';
import { blankAddressValues, type AddressFormValues } from './address-book.types';

const valid: AddressFormValues = {
  ...blankAddressValues,
  line1: '12 MG Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};

const issuesOf = (values: AddressFormValues) => {
  const result = addressSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('addressSchema', () => {
  it('accepts a complete address', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it('requires label, line1, city and state', () => {
    expect(issuesOf({ ...valid, label: ' ' })).toContain('label');
    expect(issuesOf({ ...valid, line1: '' })).toContain('line1');
    expect(issuesOf({ ...valid, city: '' })).toContain('city');
    expect(issuesOf({ ...valid, state: '' })).toContain('state');
  });

  it('validates the pincode shape (4–10 digits)', () => {
    expect(issuesOf({ ...valid, pincode: 'abc' })).toContain('pincode');
    expect(issuesOf({ ...valid, pincode: '12' })).toContain('pincode');
    expect(addressSchema.safeParse({ ...valid, pincode: '110001' }).success).toBe(true);
  });

  it('caps free-text lengths', () => {
    expect(issuesOf({ ...valid, line1: 'x'.repeat(201) })).toContain('line1');
    expect(issuesOf({ ...valid, label: 'x'.repeat(61) })).toContain('label');
  });

  it('starts blank with India as the default country', () => {
    expect(blankAddressValues.country).toBe('India');
    expect(blankAddressValues.is_default).toBe(false);
  });
});
