import {
  accountEditDefaults,
  accountEditSchema,
  toDobInput,
  toUpdateProfileInput,
  type AccountEditValues,
} from '@/forms/account-edit/account-edit.types';
import type { AccountMe } from '@/hooks/useAccount';

const fullMe = {
  user_id: 'u1',
  first_name: 'Riya',
  last_name: 'Sharma',
  bio: 'Hi',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'India',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '+44',
  whatsapp_number: '5551234567',
} as unknown as AccountMe;

describe('accountEditDefaults', () => {
  it('falls back to empty/+91 defaults when there is no user', () => {
    expect(accountEditDefaults(null)).toEqual({
      first_name: '',
      last_name: '',
      bio: '',
      dob: '',
      country: '',
      state: '',
      city: '',
      phone_extension: '+91',
      phone_number: '',
      whatsapp_extension: '+91',
      whatsapp_number: '',
      address_line1: '',
      address_line2: '',
      address_landmark: '',
      address_city: '',
      address_state: '',
      address_pincode: '',
      address_country: '',
    });
  });

  it('seeds the main-address fields from the loaded user', () => {
    const me = {
      ...fullMe,
      address: {
        line1: '9 Palm Road',
        line2: 'Flat 2',
        landmark: 'Near Lake',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India',
      },
    } as unknown as AccountMe;
    expect(accountEditDefaults(me)).toMatchObject({
      address_line1: '9 Palm Road',
      address_landmark: 'Near Lake',
      address_pincode: '110001',
      address_country: 'India',
    });
  });

  it('reflects the loaded user values including state (bug 14)', () => {
    expect(accountEditDefaults(fullMe)).toMatchObject({
      first_name: 'Riya',
      state: 'Maharashtra',
      whatsapp_extension: '+44',
      whatsapp_number: '5551234567',
    });
  });

  it('normalises the loaded ISO dob to a YYYY-MM-DD input value (bug 8)', () => {
    const me = { ...fullMe, dob: '1995-06-15T00:00:00.000Z' } as unknown as AccountMe;
    expect(accountEditDefaults(me).dob).toBe('1995-06-15');
  });
});

describe('toDobInput', () => {
  it('slices a valid date and rejects junk', () => {
    expect(toDobInput('1995-06-15')).toBe('1995-06-15');
    expect(toDobInput('1995-06-15T10:00:00Z')).toBe('1995-06-15');
    expect(toDobInput(null)).toBe('');
    expect(toDobInput('not-a-date')).toBe('');
  });
});

describe('toUpdateProfileInput', () => {
  it('maps values to the mutation input (state, not zone) and omits an empty dob', () => {
    const values: AccountEditValues = accountEditDefaults(fullMe);
    const input = toUpdateProfileInput(values);
    expect(input).toEqual({
      first_name: 'Riya',
      last_name: 'Sharma',
      bio: 'Hi',
      country: 'India',
      state: 'Maharashtra',
      city: 'Pune',
      phone_extension: '+91',
      phone_number: '9876543210',
      whatsapp_extension: '+44',
      whatsapp_number: '5551234567',
      address: {
        line1: '',
        line2: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        country: '',
      },
    });
    expect('zone' in input).toBe(false);
    expect(input.dob).toBeUndefined();
  });

  it('forwards a provided dob', () => {
    const values: AccountEditValues = { ...accountEditDefaults(fullMe), dob: '1990-01-02' };
    expect(toUpdateProfileInput(values).dob).toBe('1990-01-02');
  });
});

describe('accountEditSchema dob validation (bug 8)', () => {
  const base = accountEditDefaults(fullMe);
  it('accepts an empty dob (no change)', () => {
    expect(accountEditSchema.safeParse({ ...base, dob: '' }).success).toBe(true);
  });
  it('accepts a valid past date', () => {
    expect(accountEditSchema.safeParse({ ...base, dob: '1990-01-02' }).success).toBe(true);
  });
  it('rejects a malformed date', () => {
    expect(accountEditSchema.safeParse({ ...base, dob: '15/06/1995' }).success).toBe(false);
  });
  it('rejects a future date', () => {
    expect(accountEditSchema.safeParse({ ...base, dob: '3000-01-01' }).success).toBe(false);
  });
  it('rejects an invalid calendar date (NaN time)', () => {
    expect(accountEditSchema.safeParse({ ...base, dob: '1995-13-40' }).success).toBe(false);
  });
});

describe('accountEditSchema field validation', () => {
  const base = accountEditDefaults(fullMe);
  it('requires a first name', () => {
    expect(accountEditSchema.safeParse({ ...base, first_name: '' }).success).toBe(false);
  });
  it('rejects non-digit phone numbers', () => {
    expect(accountEditSchema.safeParse({ ...base, phone_number: 'abc' }).success).toBe(false);
  });
  it('rejects a phone number with more than 10 digits', () => {
    expect(accountEditSchema.safeParse({ ...base, phone_number: '123456789012' }).success).toBe(
      false,
    );
  });
  it('accepts an empty (optional) phone number', () => {
    expect(
      accountEditSchema.safeParse({ ...base, phone_number: '', whatsapp_number: '' }).success,
    ).toBe(true);
  });
  it('accepts a valid 6-digit pincode and rejects a malformed one', () => {
    expect(accountEditSchema.safeParse({ ...base, address_pincode: '110001' }).success).toBe(true);
    expect(accountEditSchema.safeParse({ ...base, address_pincode: '12' }).success).toBe(false);
  });
  it('rejects an over-long extension', () => {
    expect(accountEditSchema.safeParse({ ...base, phone_extension: '+123456' }).success).toBe(
      false,
    );
  });
  it('accepts a blank optional location', () => {
    expect(accountEditSchema.safeParse({ ...base, country: '', state: '', city: '' }).success).toBe(
      true,
    );
  });
});
