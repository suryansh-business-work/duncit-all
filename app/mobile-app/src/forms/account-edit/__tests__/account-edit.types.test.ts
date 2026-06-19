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
  zone: 'Kothrud',
  country: 'India',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '+44',
  whatsapp_number: '5551234',
} as unknown as AccountMe;

describe('accountEditDefaults', () => {
  it('falls back to empty/+91 defaults when there is no user', () => {
    expect(accountEditDefaults(null)).toEqual({
      first_name: '',
      last_name: '',
      bio: '',
      dob: '',
      city: '',
      zone: '',
      country: '',
      phone_extension: '+91',
      phone_number: '',
      whatsapp_extension: '+91',
      whatsapp_number: '',
    });
  });

  it('reflects the loaded user values when present', () => {
    expect(accountEditDefaults(fullMe)).toMatchObject({
      first_name: 'Riya',
      whatsapp_extension: '+44',
      whatsapp_number: '5551234',
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
  it('maps values to the mutation input and omits an empty dob', () => {
    const values: AccountEditValues = accountEditDefaults(fullMe);
    expect(toUpdateProfileInput(values)).toEqual({ ...values, dob: undefined });
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
});
