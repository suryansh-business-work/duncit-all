import { describe, expect, it } from 'vitest';
import {
  accountEditDefaults,
  accountEditSchema,
  toDobInput,
  toUpdateProfileInput,
} from './account-edit.types';
import { COMPLETION_FIELDS, profileCompletion } from './completion';

const valid = accountEditDefaults({
  first_name: 'Jane',
  last_name: 'Doe',
  phone_number: '9876543210',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
});

const firstError = (result: ReturnType<typeof accountEditSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('accountEditSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(accountEditSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty first_name', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, first_name: '' }))).toMatch(/first name/i);
  });

  it('rejects a first_name with special chars', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, first_name: 'Jane!' }))).toMatch(/first name/i);
  });

  it('rejects a phone number with letters', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, phone_number: 'abc' }))).toMatch(/digits/i);
  });

  it('allows an empty whatsapp number', () => {
    expect(accountEditSchema.safeParse({ ...valid, whatsapp_number: '' }).success).toBe(true);
  });

  it('rejects a whatsapp number with non-digits', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, whatsapp_number: 'abc' }))).toMatch(/digits/i);
  });

  it('rejects a bad country code', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, phone_extension: 'IN' }))).toMatch(/code/i);
  });

  it('allows an empty dob (no change) and a valid past date (bug 1)', () => {
    expect(accountEditSchema.safeParse({ ...valid, dob: '' }).success).toBe(true);
    expect(accountEditSchema.safeParse({ ...valid, dob: '1990-01-02' }).success).toBe(true);
  });

  it('rejects a malformed or future dob (bug 1)', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, dob: '02/01/1990' }))).toMatch(/YYYY-MM-DD/);
    expect(firstError(accountEditSchema.safeParse({ ...valid, dob: '3000-01-01' }))).toMatch(/past date/i);
  });

  it('allows an empty main address (optional) and a valid pincode', () => {
    expect(accountEditSchema.safeParse(valid).success).toBe(true);
    expect(
      accountEditSchema.safeParse({ ...valid, address_line1: '5 Residency Road', address_pincode: '560025' })
        .success,
    ).toBe(true);
  });

  it('rejects a malformed main-address pincode', () => {
    expect(firstError(accountEditSchema.safeParse({ ...valid, address_pincode: '12' }))).toMatch(/pincode/i);
  });
});

describe('toDobInput', () => {
  it('slices ISO dates and rejects junk (bug 1)', () => {
    expect(toDobInput('1995-06-15T00:00:00.000Z')).toBe('1995-06-15');
    expect(toDobInput('1995-06-15')).toBe('1995-06-15');
    expect(toDobInput(null)).toBe('');
    expect(toDobInput('nope')).toBe('');
  });
});

describe('toUpdateProfileInput', () => {
  it('forwards the location fields including state (bug 2) and drops zone (bug 14)', () => {
    const out = toUpdateProfileInput(valid);
    expect(out.first_name).toBe('Jane');
    expect(out.phone_number).toBe('9876543210');
    expect(out.state).toBe('Karnataka');
    expect('zone' in out).toBe(false);
  });

  it('omits an empty dob but forwards a provided one (bug 1)', () => {
    expect(toUpdateProfileInput(valid).dob).toBeUndefined();
    expect(toUpdateProfileInput({ ...valid, dob: '1990-01-02' }).dob).toBe('1990-01-02');
  });

  it('forwards the structured main address', () => {
    const out = toUpdateProfileInput({
      ...valid,
      address_line1: '5 Residency Road',
      address_city: 'Bengaluru',
      address_state: 'Karnataka',
      address_pincode: '560025',
      address_country: 'India',
    });
    expect(out.address.line1).toBe('5 Residency Road');
    expect(out.address.city).toBe('Bengaluru');
    expect(out.address.pincode).toBe('560025');
    expect(out.address.country).toBe('India');
  });
});

describe('profileCompletion', () => {
  it('is 0% for an empty profile', () => {
    expect(profileCompletion({})).toBe(0);
  });

  it('is 100% when every meaningful field is filled', () => {
    const full = Object.fromEntries(COMPLETION_FIELDS.map((f) => [f, 'x']));
    expect(profileCompletion(full)).toBe(100);
  });

  it('rounds the percentage of filled fields and ignores blanks/null', () => {
    // 8 of 10 fields filled → 80%; whitespace and null do not count.
    expect(
      profileCompletion({
        first_name: 'Jane',
        last_name: 'Doe',
        bio: 'Hi',
        dob: '1990-01-02',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        phone_number: '9876543210',
        whatsapp_number: '   ',
        profile_photo: null,
      }),
    ).toBe(80);
  });
});
