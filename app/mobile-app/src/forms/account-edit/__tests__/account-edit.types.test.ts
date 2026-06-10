import {
  accountEditDefaults,
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
});

describe('toUpdateProfileInput', () => {
  it('maps validated values 1:1 to the mutation input', () => {
    const values: AccountEditValues = accountEditDefaults(fullMe);
    expect(toUpdateProfileInput(values)).toEqual(values);
  });
});
