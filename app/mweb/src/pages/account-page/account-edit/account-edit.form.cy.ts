import { describe, expect, it } from 'vitest';
import {
  accountEditDefaults,
  accountEditSchema,
  toDobInput,
  toUpdateProfileInput,
} from './account-edit.types';

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
});
