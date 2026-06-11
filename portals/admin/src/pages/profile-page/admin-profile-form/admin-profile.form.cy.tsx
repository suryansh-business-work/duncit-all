import { describe, expect, it } from 'vitest';
import { adminProfileSchema, toAdminProfileInput } from './admin-profile.form';

const validProfile = {
  first_name: 'Admin',
  last_name: 'User',
  phone_extension: '+91',
  phone_number: '9876543210',
  country: 'India',
  city: 'Bengaluru',
  zone: 'HSR',
  bio: 'Operations lead',
  profile_photo: 'https://cdn.example.com/admin.jpg',
};

describe('adminProfileSchema', () => {
  it('rejects invalid names', async () => {
    const error = await adminProfileSchema
      .validate({ ...validProfile, first_name: 'Admin!' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/first name/i);
  });

  it('rejects invalid profile photo URLs', async () => {
    const error = await adminProfileSchema
      .validate({ ...validProfile, profile_photo: 'not-a-url' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/profile photo/i);
  });
});

describe('toAdminProfileInput', () => {
  it('omits empty optional values', () => {
    const input = toAdminProfileInput({ ...validProfile, country: '', city: '', zone: '', bio: '', profile_photo: '' });
    expect(input.country).toBeUndefined();
    expect(input.city).toBeUndefined();
    expect(input.profile_photo).toBeUndefined();
  });
});