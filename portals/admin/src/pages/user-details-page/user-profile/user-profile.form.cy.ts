import { describe, expect, it } from 'vitest';
import { toUpdateUserInput, userProfileSchema } from './user-profile.form';

const valid = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560102',
  zone: 'HSR',
  assigned_city: '',
  assigned_zones: '',
  bio: '',
  profile_photo: '',
  status: 'ACTIVE' as const,
};

describe('userProfileSchema', () => {
  it('rejects names with special characters', async () => {
    const error = await userProfileSchema
      .validate({ ...valid, first_name: 'Jane!@' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/first name/i);
  });

  it('rejects phone with letters', async () => {
    const error = await userProfileSchema
      .validate({ ...valid, phone_number: 'abc123' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });

  it('rejects an invalid status', async () => {
    const error = await userProfileSchema
      .validate({ ...valid, status: 'BOGUS' as any }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/status/i);
  });

  it('accepts an optional email left blank', async () => {
    const parsed = await userProfileSchema.validate({ ...valid, email: '' }, { abortEarly: false });
    expect(parsed.email).toBe('');
  });

  it('accepts state and pincode left blank', async () => {
    const parsed = await userProfileSchema.validate(
      { ...valid, state: '', pincode: '' },
      { abortEarly: false }
    );
    expect(parsed.state).toBe('');
    expect(parsed.pincode).toBe('');
  });

  it('rejects a pincode with invalid characters', async () => {
    const error = await userProfileSchema
      .validate({ ...valid, pincode: '!!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/pincode/i);
  });
});

describe('toUpdateUserInput', () => {
  it('splits assigned_zones on commas', () => {
    const input = toUpdateUserInput({ ...valid, assigned_zones: ' HSR , Indiranagar , Whitefield ' });
    expect(input.assigned_zones).toEqual(['HSR', 'Indiranagar', 'Whitefield']);
  });

  it('omits empty optional fields', () => {
    const input = toUpdateUserInput({ ...valid, email: '', city: '', zone: '', bio: '', profile_photo: '' });
    expect(input.email).toBeUndefined();
    expect(input.city).toBeUndefined();
    expect(input.bio).toBeUndefined();
  });

  it('includes email when provided', () => {
    const input = toUpdateUserInput(valid);
    expect(input.email).toBe('jane@example.com');
  });

  it('emits state and pincode when set, omits them when blank', () => {
    const filled = toUpdateUserInput(valid);
    expect(filled.state).toBe('Karnataka');
    expect(filled.pincode).toBe('560102');
    const blank = toUpdateUserInput({ ...valid, state: '', pincode: '' });
    expect(blank.state).toBeUndefined();
    expect(blank.pincode).toBeUndefined();
  });
});
